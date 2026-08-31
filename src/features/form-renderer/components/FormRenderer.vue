<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { FormSchema, Control, Tab } from '../types/schema'
import { useFormState } from '../composables/useFormState'
import { evaluateEnable, evaluateDisplay } from '../composables/useDisabled'
import { useCentrifugo } from '../composables/useCentrifugo'
import FormSection from './FormSection.vue'

// The whole "Sync" tab (Enable Data Manager, Disable Concurrent Syncs, the 5 sync timers, the "run
// now" button row and the live log) is common to every DM and comes ENTIRELY from the schema — it is
// declared on the base DataManagerSettings and laid out by DataManagerSettings.layout.json. Nothing
// about it is hardcoded here.

const props = defineProps<{
  schema:         FormSchema
  initialValues?: Record<string, any>
  guid?:          string
  serviceBase?:   string
  // Handler currently in-flight (set by the parent while it awaits the action). Used to show a
  // loading state on the button that triggered it — today only Save.
  activeAction?:  string | null
  // Id of the button whose action is in-flight, so any button (not just Save) can show a spinner.
  activeActionId?: string | null
}>()

// True while the Save action's API call is in progress.
const isSaving = computed(() => props.activeAction === 'dm_shared_save')
const emit = defineEmits<{ action: [id: string, handler: string, payload?: unknown] }>()

const activeTab = ref(0)

// Tab order comes straight from the schema: the base layout emits "General" then "Custom Sync", and
// the per-DM layout's tabs follow — so the effective order is General → Custom Sync → DM-specific.
// (The live log + "run now" buttons are no longer schema controls — they live in the page-level
// SyncActionFooter rendered by FormView, always visible at the bottom of the page.)
const allTabs = computed<Tab[]>(() => {
  const ordered = [...props.schema.tabs]
  // Diagnostic tab: present only on Debug builds (the schema carries a `diagnostics` key then), always
  // the very last tab. Synthesized here — it holds a single `diagnostics` control fed from the schema.
  if (props.schema.diagnostics) {
    ordered.push({
      title: 'Diagnostic',
      sections: [{
        title: 'Settings Diagnostics',
        columns: [{ controls: [{ id: '_diagnostics', type: 'diagnostics', title: '' } as Control] }],
      }],
    })
  }
  return ordered
})

const visibleTabs = computed(() =>
  allTabs.value.filter((tab) =>
    evaluateDisplay(tab.display, state) &&
    tab.sections?.some((s) => s.columns?.some((col) => col.controls?.length > 0))
  ),
)

function isTabEnabled(tab: (typeof visibleTabs.value)[number]): boolean {
  return evaluateEnable(tab.enable, state)
}

const showTabs   = computed(() => visibleTabs.value.length > 1)
const currentTab = computed(() => visibleTabs.value[activeTab.value])


const sections = computed(() =>
  (currentTab.value?.sections ?? []).filter((s) =>
    s.columns?.some((col) => col.controls?.length > 0),
  ),
)

const { state, errors, validate, resetToDefaults, revertChanges, isDirty, markPristine } = useFormState(props.schema, props.initialValues)

defineExpose({ state, resetToDefaults, revertChanges, markPristine })

const controlMap = computed<Record<string, Control>>(() => {
  const map: Record<string, Control> = {}
  allTabs.value.forEach((tab) =>
    tab.sections?.forEach((section) =>
      section.columns?.forEach((col) =>
        col.controls?.forEach((ctrl) => { map[ctrl.id] = ctrl })
      )
    )
  )
  return map
})

function onUpdateState(id: string, value: any) {
  state[id] = value
  const ctrl = controlMap.value[id]
  if (ctrl?.validations?.length) validate(ctrl)
}

// ─── Active-sync indicator ──────────────────────────────────────────────────────
// Mirrors the WinForm: next to Save, surface whether a sync is currently running for THIS DM (and
// which one[s]) so the user can choose to wait before saving. The badge is only shown while a sync is
// actually running — when idle it renders nothing (no clutter). Saving anyway is allowed; the service
// stops running operations first (see HandleSaveDataManager).
const activeSyncTypes = ref<string[]>([])

function prettySyncType(t: string): string {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

const isSyncing = computed(() => activeSyncTypes.value.length > 0)
const syncLabel = computed(() => `Sync running: ${activeSyncTypes.value.map(prettySyncType).join(', ')}`)

async function refreshSyncStatus(): Promise<void> {
  if (!props.guid || !props.serviceBase) { activeSyncTypes.value = []; return }
  try {
    const res = await fetch(`${props.serviceBase}/api/data-managers/${props.guid}/sync-status`)
    if (!res.ok) { activeSyncTypes.value = []; return }
    const status = await res.json() as Record<string, boolean> | null
    activeSyncTypes.value = status ? Object.keys(status).filter((k) => status[k]) : []
  } catch {
    activeSyncTypes.value = []
  }
}

// The sync-status indicator used to poll every 4s forever. Instead we now refresh it only when
// something can actually have changed:
//   - once on mount (catch a sync already running when the form opens),
//   - when the DM service PUSHES a sync lifecycle event over Centrifugo (SyncStarted/Completed/…),
//   - when the tab regains visibility (in case events were missed while hidden / Centrifugo was down),
//   - a slow safety-net interval that ONLY ticks while the tab is visible (covers Centrifugo being off).
// Result: no calls at all while the tab is hidden, and near-zero while idle and visible.
const SYNC_LIFECYCLE_EVENTS = new Set(['SyncStarted', 'SyncCompleted', 'SyncFailed', 'SyncFinished'])
const SAFETY_POLL_MS = 30000

let unsubscribeSync: (() => void) | null = null
let refreshDebounce: ReturnType<typeof setTimeout> | null = null
let safetyTimer: ReturnType<typeof setInterval> | null = null

function scheduleRefresh(): void {
  if (refreshDebounce) clearTimeout(refreshDebounce)
  // Small debounce so a burst of events (start + first data updates) collapses into one fetch.
  refreshDebounce = setTimeout(refreshSyncStatus, 300)
}

function startSafetyPoll(): void {
  if (safetyTimer || document.visibilityState !== 'visible') return
  safetyTimer = setInterval(refreshSyncStatus, SAFETY_POLL_MS)
}

function stopSafetyPoll(): void {
  if (safetyTimer) { clearInterval(safetyTimer); safetyTimer = null }
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    refreshSyncStatus()   // catch up on anything missed while hidden
    startSafetyPoll()
  } else {
    stopSafetyPoll()      // no background polling when the user isn't looking
  }
}

onMounted(() => {
  refreshSyncStatus()

  // Push-driven refresh: only react to sync lifecycle events for THIS DM (ignore log/data noise).
  unsubscribeSync = useCentrifugo().subscribe(props.guid, (entry) => {
    if (SYNC_LIFECYCLE_EVENTS.has(entry.type)) scheduleRefresh()
  })

  document.addEventListener('visibilitychange', onVisibilityChange)
  startSafetyPoll()
})

onBeforeUnmount(() => {
  unsubscribeSync?.()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (refreshDebounce) clearTimeout(refreshDebounce)
  stopSafetyPoll()
})
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Tab bar (folder-style, XPressEntry look) -->
    <div v-if="showTabs" class="flex items-stretch gap-px bg-white pt-2">
      <button
        v-for="(tab, idx) in visibleTabs"
        :key="tab.title"
        type="button"
        class="flex-1 flex items-center justify-center px-5 py-2.5 text-sm text-center leading-tight transition border border-gray-300 rounded-t-lg"
        :class="[
          !isTabEnabled(tab)
            ? 'font-medium text-gray-300 bg-gray-100 cursor-not-allowed'
            : activeTab === idx
              ? '-mt-2 font-bold bg-white text-gray-900 border-b-white cursor-pointer'
              : 'font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 cursor-pointer'
        ]"
        :disabled="!isTabEnabled(tab)"
        @click="isTabEnabled(tab) && (activeTab = idx)"
      >
        {{ tab.title }}
      </button>
    </div>

    <!-- Sticky action bar: settings actions common to every DM (fixed here), centered.
         Save is the single action (it saves + tests the connection); no Test Connect button.
         Shown on every tab now that the Sync tab also holds savable settings. -->
    <div
      class="flex flex-wrap items-center justify-end gap-3 px-6 py-2 bg-white border-b border-gray-200 shadow-sm">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        @click="emit('action', 'btn_defaults', 'dm_shared_setDefaults')"
      >
        Defaults
      </button>
      <button
        type="button"
        :disabled="!isDirty || isSaving"
        class="px-4 py-2 text-sm font-medium rounded-lg border transition flex items-center gap-2"
        :class="(isDirty && !isSaving)
          ? 'border-xp-primary bg-xp-primary text-white hover:bg-xp-primary-hover cursor-pointer'
          : isSaving
            ? 'border-xp-primary bg-xp-primary text-white cursor-wait'
            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'"
        :title="isSaving ? 'Saving…' : isDirty ? 'Save settings (also tests the connection)' : 'No changes to save'"
        @click="emit('action', 'btn_save', 'dm_shared_save')"
      >
        <svg
          v-if="isSaving"
          class="animate-spin w-4 h-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ isSaving ? 'Saving…' : 'Save' }}
      </button>

      <!-- Cancel: revert every field to the values loaded from the service (discard unsaved edits),
           leaving the form not-dirty. WinForm parity (frmSettings1.btnCancel_Click → LoadData). Does
           NOT navigate away. Enabled only while there are unsaved changes. -->
      <button
        type="button"
        :disabled="!isDirty || isSaving"
        class="px-4 py-2 text-sm font-medium rounded-lg border transition"
        :class="(isDirty && !isSaving)
          ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
          : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'"
        :title="isDirty ? 'Discard unsaved changes and restore the loaded values' : 'No changes to cancel'"
        @click="revertChanges"
      >
        Cancel
      </button>

      <!-- Active-sync indicator: only shown while a sync is running for this DM (WinForm parity). -->
      <div
        v-if="isSyncing"
        class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-700"
        :title="syncLabel"
      >
        <span class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        {{ syncLabel }}
      </div>

    </div>

    <!-- Tab content -->
    <!-- pb-16: modest bottom room so a dropdown near the end of a tab still has space; kept small so the
         content sits close to the fixed page footer. -->
    <div class="flex-1 overflow-y-auto p-6 pb-16">
      <div class="flex flex-col gap-4 max-w-5xl mx-auto">
        <FormSection
          v-for="(section, idx) in sections"
          :key="idx"
          :title="section.title"
          :columns="section.columns"
          :state="state"
          :errors="errors"
          :enable="section.enable"
          :display="section.display"
          :guid="guid"
          :service-base="serviceBase"
          :active-action-id="activeActionId"
          :diagnostics="schema.diagnostics"
          @update:state="onUpdateState"
          @action="(id, handler, payload) => emit('action', id, handler, payload)"
        />

        <div v-if="!sections.length" class="flex items-center justify-center h-40 text-gray-400 text-sm">
          No content defined for this tab.
        </div>
      </div>
    </div>

  </div>
</template>
