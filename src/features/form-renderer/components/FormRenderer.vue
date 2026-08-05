<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FormSchema, Control, Button, Tab } from '../types/schema'
import { useFormState } from '../composables/useFormState'
import { evaluateEnable, evaluateDisplay } from '../composables/useDisabled'
import FormSection from './FormSection.vue'

// Sync operations are common to EVERY Data Manager, so the whole "Sync" tab is fixed here
// in the component (prepended to the DM's own tabs) instead of being declared in each DM JSON.
const COMMON_SYNC_BUTTONS: Button[] = [
  { id: 'btn_partial_sync', title: 'Partial Sync Now', onClick: 'dm_shared_runPartialSync', tooltip: 'Pull the latest table changes from the external system. Partial syncs are incremental changes to Users and Badges, if allowed by the external system\'s API.' },
  { id: 'btn_full_sync',    title: 'Full Sync Now',    onClick: 'dm_shared_runFullSync',    tooltip: 'Pull all records from the external system. Replaces the full local dataset with the current state of the external system.' },
  { id: 'btn_custom_sync',  title: 'Custom Sync Now',  onClick: 'dm_shared_runCustomSync',  tooltip: 'Run a custom sync operation defined by this data manager. Right-click to edit the custom sync tables.', rightClickMenu: [{ label: 'Edit Custom Sync', onClick: 'dm_shared_editCustomSync' }] },
]

const SYNC_TAB: Tab = {
  title: 'Sync',
  sections: [
    {
      title: 'Sync Operations',
      columns: [
        {
          controls: [
            { id: 'sync_buttons', type: 'button_bar', buttons: COMMON_SYNC_BUTTONS },
            { id: 'sync_log',     type: 'log_view' },
          ],
        },
      ],
    },
  ],
}

// "Clear External Data" / "Clear External Badge Activity" are inert for now — see the stub
// handlers of the same name in actions/dm-shared-actions.ts, ready to be wired to the service.
const CLEAR_EXTERNAL_BUTTONS: Button[] = [
  { id: 'btn_clear_external_data',           title: 'Clear External Data',           onClick: 'dm_shared_clearExternalData',         tooltip: 'Remove the locally cached copy of the external system\'s data for this Data Manager.' },
  { id: 'btn_clear_external_badge_activity', title: 'Clear External Badge Activity', onClick: 'dm_shared_clearExternalBadgeActivity', tooltip: 'Remove the locally cached external badge-activity records for this Data Manager.' },
]

// "Sync Options" — a second settings area common to EVERY Data Manager (activity/occupancy sync,
// message queue, badge-activity delete). Like the Sync tab it is fixed here in the component and
// inserted right after Sync, ahead of the DM's own tabs.
const SYNC_OPTIONS_TAB: Tab = {
  title: 'Sync Options',
  sections: [
    {
      title: '',
      columns: [
        {
          controls: [
            { id: 'pull_occupancy',               type: 'boolean',        title: 'Pull DataManager Occupancy',                    default: false },
            { id: 'default_outside_zone',         type: 'select_dynamic', title: 'Default Outside Zone', loadFrom: 'shared/zones', default: -1 },
            { id: 'pull_activities',              type: 'boolean',        title: 'Pull Data Manager Activities into XPressEntry',  default: false },
            { id: 'push_activities',              type: 'boolean',        title: 'Push XPressEntry Activities to Data Manager',    default: false },
            { id: 'send_live_activities',         type: 'boolean',        title: 'Send Live Activities to Data Manager',           default: false, enable: false },
            { id: 'send_activities_retry_count',  type: 'number_spinner', title: 'Send Activities Retry Count',                    default: 3 },
            { id: 'watch_tables_software_events', type: 'boolean',        title: 'Watch Tables via Software Events',               default: false },
            { id: 'enable_message_queue',         type: 'boolean',        title: 'Enable Message Queue',                           default: false },
            { id: 'msmq_single_event_processing', type: 'boolean',        title: 'MSMQ Single Event Processing',                   default: false },
            { id: 'message_queue_name',           type: 'text',           title: 'Message Queue Name',                             default: '.\\Private$\\DataManagerEvents' },
            { id: 'event_processing_loop_limit',  type: 'number_spinner', title: 'Event Processing Loop Limit',                    default: 10 },
            { id: 'event_processing_retry_count', type: 'number_spinner', title: 'Event Processing Retry Count',                   default: 3 },
          ],
        },
        {
          controls: [
            // Loaded live from the local XPressEntry install via the shared lookup endpoint,
            // stored as the profile ID in the real backend field (-1 = none), like Avigilon.
            { id: 'dm_default_user_profile', type: 'select_dynamic', title: 'Default User Profile', loadFrom: 'shared/user_profiles', default: -1 },
            {
              id: 'external_muster_activity_sync', type: 'select', title: 'External Muster Activity Sync', default: 'always',
              values: [
                { text: 'always',             value: 'always' },
                { text: 'during muster only', value: 'during muster only' },
                { text: 'never',              value: 'never' },
              ],
            },
            { id: 'enable_automatic_badge_activity_delete', type: 'boolean', title: 'Enable Automatic Badge Activity Delete', default: false },
            {
              id: 'badge_activity_delete_timeframe', type: 'select', title: 'Badge Activity Delete Timeframe', default: 'None',
              enable: 'enable_automatic_badge_activity_delete == true',
              values: [
                { text: 'None',       value: 'None' },
                { text: 'Weekly',     value: 'Weekly' },
                { text: 'Monthly',    value: 'Monthly' },
                { text: 'Quarterly',  value: 'Quarterly' },
                { text: 'HalfYearly', value: 'HalfYearly' },
                { text: 'Yearly',     value: 'Yearly' },
              ],
            },
          ],
        },
      ],
    },
    {
      title: '',
      columns: [
        {
          controls: [
            { id: 'clear_external_buttons', type: 'button_bar', buttons: CLEAR_EXTERNAL_BUTTONS },
          ],
        },
      ],
    },
  ],
}

// Fixed shared tabs, in display order, prepended to every DM's own tabs.
const FIXED_TABS: Tab[] = [SYNC_TAB, SYNC_OPTIONS_TAB]

const props = defineProps<{
  schema:         FormSchema
  initialValues?: Record<string, any>
  guid?:          string
  serviceBase?:   string
}>()
const emit = defineEmits<{ action: [id: string, handler: string, payload?: unknown] }>()

const activeTab = ref(0)

// The fixed shared tabs (Sync, Sync Options) always come first, then the Data Manager's own tabs.
const allTabs = computed<Tab[]>(() => [...FIXED_TABS, ...props.schema.tabs])

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

// Seed form state from the DM schema PLUS the fixed shared tabs, so the Sync Options defaults
// (retry counts, dropdowns, message queue name) apply for DMs whose saved settings lack these keys.
const seedSchema: FormSchema = { ...props.schema, tabs: [...FIXED_TABS, ...props.schema.tabs] }
const { state, errors, validate, resetToDefaults } = useFormState(seedSchema, props.initialValues)

defineExpose({ state, resetToDefaults })

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

    <!-- Sticky action bar: settings actions common to every DM (fixed here), centered -->
    <div class="flex flex-wrap items-center justify-center gap-2 px-6 py-2 bg-white border-b border-gray-200 shadow-sm">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        @click="emit('action', 'btn_test_connect', 'dm_shared_testConnection')"
      >
        Test Connect
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        @click="emit('action', 'btn_defaults', 'dm_shared_setDefaults')"
      >
        Defaults
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-lg border border-xp-primary bg-xp-primary text-white hover:bg-xp-primary-hover transition cursor-pointer"
        @click="emit('action', 'btn_save', 'dm_shared_save')"
      >
        Save
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="sections.length" class="flex flex-col gap-4 max-w-5xl mx-auto">
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
          @update:state="onUpdateState"
          @action="(id, handler, payload) => emit('action', id, handler, payload)"
        />
      </div>
      <div v-else class="flex items-center justify-center h-40 text-gray-400 text-sm">
        No content defined for this tab.
      </div>
    </div>

  </div>
</template>
