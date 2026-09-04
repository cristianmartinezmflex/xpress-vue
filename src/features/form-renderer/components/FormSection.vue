<script setup lang="ts">
import { computed } from 'vue'
import type { Column, Control, EnableProp, DisplayProp } from '../types/schema'
import { evaluateEnable, evaluateDisplay } from '../composables/useDisabled'
import ControlText from './controls/ControlText.vue'
import ControlPassword from './controls/ControlPassword.vue'
import ControlBoolean from './controls/ControlBoolean.vue'
import ControlNumber from './controls/ControlNumber.vue'
import ControlNumberSpinner from './controls/ControlNumberSpinner.vue'
import ControlSelect        from './controls/ControlSelect.vue'
import ControlRadio from './controls/ControlRadio.vue'
import ControlButtonBar from './controls/ControlButtonBar.vue'
import ControlCustomFields         from './controls/ControlCustomFields.vue'
import ControlLogView              from './controls/ControlLogView.vue'
import ControlSocketInterfaces     from './controls/ControlSocketInterfaces.vue'
import ControlIpBadgeMappings      from './controls/ControlIpBadgeMappings.vue'
import ControlSiteTimezones        from './controls/ControlSiteTimezones.vue'
import ControlSyncTimer            from './controls/ControlSyncTimer.vue'
import ControlCustomSync           from './controls/ControlCustomSync.vue'
import ControlMultiselect          from './controls/ControlMultiselect.vue'
import ControlTable                 from './controls/ControlTable.vue'
import ControlDiagnostics           from './controls/ControlDiagnostics.vue'
import { useTableSelection }        from '../composables/useTableSelection'
import { sortRowsForDisplay }       from '../utils/tableRows'
import type { DiagnosticIssue }     from '../types/schema'

const props = defineProps<{
  title?: string
  columns: Column[]
  state: Record<string, any>
  errors: Readonly<Record<string, string>>
  enable?: EnableProp
  display?: DisplayProp
  guid?:        string
  serviceBase?: string
  activeActionId?: string | null
  diagnostics?: DiagnosticIssue[]
  // Current DM connection state (null = unknown/not yet checked). Controls flagged requiresConnection are
  // disabled when this is explicitly false.
  connectionOk?: boolean | null
}>()

// Tooltip shown on a control disabled because the connection test is failing.
const CONN_DISABLED_TOOLTIP = 'Disabled — could not connect to the external system. Fix the connection (Save to re-test) to enable this.'

function isConnDisabled(control: Control): boolean {
  return !!control.requiresConnection && props.connectionOk === false
}

const emit = defineEmits<{
  'update:state': [id: string, value: any]
  action: [id: string, handler: string, payload?: unknown]
}>()

const sectionEnabled  = computed(() => evaluateEnable(props.enable, props.state))
const sectionVisible  = computed(() => evaluateDisplay(props.display, props.state))

// Column layout: a section with N columns (2–4 supported) renders as an N-wide grid on
// desktop and collapses to a single column on small screens. Classes are written out in full
// so Tailwind's scanner picks them up (no dynamic class-name interpolation).
const columnLayoutClass = computed(() => {
  const n = Math.min(Math.max(props.columns.length, 1), 4)
  return {
    1: 'flex flex-col gap-4',
    2: 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4',
  }[n]!
})

function isColumnEnabled(col: Column): boolean {
  return sectionEnabled.value && evaluateEnable(col.enable, props.state)
}

function isColumnVisible(col: Column): boolean {
  return evaluateDisplay(col.display, props.state)
}

function isControlEnabled(control: Control, col: Column): boolean {
  if (!isColumnEnabled(col) || !evaluateEnable(control.enable, props.state)) return false
  // Master-detail: a control bound to a table's selected row is disabled until a row is selected.
  // (A button_bar uses `payload`, not `detailOf`, and handles enabling PER BUTTON — so it's unaffected.)
  if (control.detailOf && detailRow(control.detailOf) === null) return false
  return true
}

function isControlVisible(control: Control): boolean {
  return evaluateDisplay(control.display, props.state)
}

// ─── customFields format bridge ─────────────────────────────────────────────────
// The DM/WinForm canonical format for a custom-field mapping is a JSON OBJECT { source: xpeField } (the
// service's Convert*Hashtable helpers treat these keys as objects). ControlCustomFields edits them as a
// KeyValuePair[] (key = source, value = xpe field), so convert at the boundary: object → pairs in, pairs
// → object out. Also accepts a legacy array / array-string so previously Vue-saved data still loads.
function customFieldsPairs(v: any): { key: string; value: string }[] {
  const fromObj = (o: Record<string, any>) => Object.entries(o).map(([key, value]) => ({ key, value: String(value ?? '') }))
  if (Array.isArray(v)) return v as { key: string; value: string }[]
  if (v && typeof v === 'object') return fromObj(v)
  if (typeof v === 'string' && v.trim()) {
    try {
      const p = JSON.parse(v)
      if (Array.isArray(p)) return p
      if (p && typeof p === 'object') return fromObj(p)
    } catch { /* not JSON */ }
  }
  return []
}
function pairsToObject(pairs: { key: string; value: string }[]): Record<string, string> {
  const o: Record<string, string> = {}
  for (const p of pairs) if (p?.key) o[p.key] = p.value ?? ''
  return o
}

// ─── Master-detail helpers ───────────────────────────────────────────────────────
// A control with `detailOf` edits the SELECTED row of that table: its value lives on the row under the
// control's own id, so plain generic controls (Boolean, MultiSelect) act as the detail editor of a
// table's selected row. (Buttons use `payload` instead — the row is their request body, not an edit.)
const selection = useTableSelection()

// The master table's idField, so detail rows are ordered identically to the grid (indices stay in sync).
function masterIdField(tableId: string): string | undefined {
  for (const col of props.columns)
    for (const c of (col.controls ?? []))
      if (c.id === tableId) return c.idField
  return undefined
}
function detailRows(tableId: string): Record<string, any>[] {
  const raw = props.state[tableId]
  let parsed: Record<string, any>[] = []
  if (Array.isArray(raw)) parsed = raw
  else if (typeof raw === 'string' && raw.trim()) {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) parsed = p } catch { parsed = [] }
  }
  return sortRowsForDisplay(parsed, masterIdField(tableId))
}
function detailIndex(tableId: string): number | null {
  return selection[tableId] ?? null
}
function detailRow(tableId: string): Record<string, any> | null {
  const i = detailIndex(tableId)
  const rows = detailRows(tableId)
  return i != null && i >= 0 && i < rows.length ? rows[i] : null
}

// The value a control shows: the selected row's field (detail) or the plain top-level state value.
function controlModel(control: Control, fallback: any): any {
  if (control.detailOf) {
    const row = detailRow(control.detailOf)
    return row ? (row[control.id] ?? fallback) : fallback
  }
  return props.state[control.id] ?? fallback
}
// Persist a control's new value: patch the selected row (detail) or emit a plain top-level state update.
function updateControl(control: Control, value: any): void {
  if (control.detailOf) {
    const i = detailIndex(control.detailOf)
    const rows = detailRows(control.detailOf)
    if (i == null || i < 0 || i >= rows.length) return
    const next = rows.map((r, idx) => (idx === i ? { ...r, [control.id]: value } : r))
    emit('update:state', control.detailOf, JSON.stringify(next))
    return
  }
  emit('update:state', control.id, value)
}
</script>

<template>
  <div
    v-show="sectionVisible"
    class="rounded-lg border border-gray-200 bg-white shadow-xp overflow-hidden transition-opacity"
    :class="!sectionEnabled ? 'opacity-50' : ''"
  >
    <div v-if="title" class="px-4 py-2 bg-gray-50 border-b border-gray-200">
      <h3 class="text-sm font-semibold text-xp-label uppercase tracking-wide">{{ title }}</h3>
    </div>

    <div
      class="p-4"
      :class="[
        columnLayoutClass,
        !sectionEnabled ? 'pointer-events-none select-none' : ''
      ]"
    >
      <div
        v-for="(col, colIdx) in columns"
        v-show="isColumnVisible(col)"
        :key="colIdx"
        class="flex flex-col gap-4 transition-opacity"
        :class="!isColumnEnabled(col) && sectionEnabled ? 'opacity-50 pointer-events-none select-none' : ''"
      >
        <template v-for="control in col.controls" :key="control.id">
          <div
            v-show="isControlVisible(control)"
            class="relative transition-opacity"
            :class="[
              !isControlEnabled(control, col) && isColumnEnabled(col) && sectionEnabled ? 'opacity-50 pointer-events-none select-none' : '',
              isConnDisabled(control) ? 'opacity-50' : ''
            ]"
          >
            <ControlPassword
              v-if="control.type === 'password'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :error="errors[control.id]"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <div v-else-if="control.type === 'text' && control.value_from" class="text-sm text-gray-600">
              <span class="font-semibold text-xp-label">{{ control.title }}:</span>
              {{ state[control.value_from] ?? '' }}
            </div>

            <ControlText
              v-else-if="control.type === 'text'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :error="errors[control.id]"
              :disabled="control.disabled"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlBoolean
              v-else-if="control.type === 'boolean'"
              :title="control.title"
              :model-value="control.detailOf
                ? !!controlModel(control, false)
                : (control.value_from
                    ? (control.invert ? !state[control.value_from] : !!state[control.value_from])
                    : (state[control.id] ?? false))"
              :disabled="control.disabled || !isControlEnabled(control, col)"
              @update:model-value="control.detailOf
                ? updateControl(control, $event)
                : (control.inverts
                    ? emit('update:state', control.inverts, !$event)
                    : emit('update:state', control.id, $event))"
            />

            <ControlNumber
              v-else-if="control.type === 'number'"
              :title="control.title"
              :model-value="state[control.id] ?? 0"
              :error="errors[control.id]"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlNumberSpinner
              v-else-if="control.type === 'number_spinner'"
              :title="control.title"
              :model-value="state[control.id] ?? 0"
              :validations="control.validations"
              :error="errors[control.id]"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <!-- Unified select: static (options) OR dynamic (dynOptions / legacy loadFrom). The
                 select_dynamic type is kept only for legacy static-JSON schemas and renders here too. -->
            <ControlSelect
              v-else-if="control.type === 'select' || control.type === 'select_dynamic'"
              :title="control.title"
              :model-value="control.dynOptions || control.loadFrom ? (state[control.id] ?? -1) : state[control.id]"
              :options="control.options ?? []"
              :dyn-options="control.dynOptions"
              :load-from="control.loadFrom"
              :guid="guid"
              :service-base="serviceBase"
              :error="errors[control.id]"
              :show-refresh-button="control.dynOptionsShowRefreshButton"
              :refresh-trigger="control.refreshOnControlChange ? state[control.refreshOnControlChange] : undefined"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlRadio
              v-else-if="control.type === 'radio'"
              :id="control.id"
              :title="control.title"
              :model-value="state[control.id]"
              :options="control.options ?? []"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlButtonBar
              v-else-if="control.type === 'button_bar'"
              :buttons="control.buttons ?? []"
              :state="state"
              :active-action-id="activeActionId"
              :id-field="control.payload ? masterIdField(control.payload) : undefined"
              @action="(id, handler, payload) => emit('action', id, handler, payload)"
            />

            <ControlLogView
              v-else-if="control.type === 'log_view'"
              :guid="guid"
              :service-base="serviceBase"
            />

            <ControlCustomFields
              v-else-if="control.type === 'customFields'"
              :title="control.title"
              :entity="control.entity"
              :key-title="control.key_title"
              :key-header="control.key_header"
              :value-title="control.value_title"
              :value-header="control.value_header"
              :load-from="control.loadFrom"
              :destination-load-from="control.destinationLoadFrom"
              :check-columns="control.checkColumns"
              :state="state"
              :guid="guid"
              :service-base="serviceBase"
              :model-value="customFieldsPairs(state[control.id])"
              @update:model-value="emit('update:state', control.id, pairsToObject($event))"
              @update:state-key="(key, value) => emit('update:state', key, value)"
            />

            <ControlSocketInterfaces
              v-else-if="control.type === 'socket_interfaces'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :load-from="control.loadFrom"
              :guid="guid"
              :service-base="serviceBase"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlIpBadgeMappings
              v-else-if="control.type === 'ip_badge_mappings'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :guid="guid"
              :service-base="serviceBase"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlSyncTimer
              v-else-if="control.type === 'timer'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :service-base="serviceBase"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlCustomSync
              v-else-if="control.type === 'custom_sync'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :options="control.options"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlSiteTimezones
              v-else-if="control.type === 'site_timezones'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :guid="guid"
              :service-base="serviceBase"
              :state="state"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlTable
              v-else-if="control.type === 'table'"
              :title="control.title"
              :fields="control.fields ?? []"
              :model-value="state[control.id] ?? '[]'"
              :guid="guid"
              :service-base="serviceBase"
              :modal-actions="control.modalActions"
              :selectable="control.selectable"
              :control-id="control.id"
              :id-field="control.idField"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlDiagnostics
              v-else-if="control.type === 'diagnostics'"
              :diagnostics="diagnostics"
            />

            <ControlMultiselect
              v-else-if="control.type === 'multiselect'"
              :title="control.title"
              :model-value="control.detailOf ? (controlModel(control, '') ?? '') : (state[control.id] ?? '')"
              :options="control.options"
              :dyn-options="control.dynOptions"
              :load-from="control.loadFrom"
              :separator="control.separator"
              :guid="guid"
              :service-base="serviceBase"
              @update:model-value="control.detailOf ? updateControl(control, $event) : emit('update:state', control.id, $event)"
            />

            <!-- requiresConnection: a transparent overlay blocks interaction and carries the tooltip that
                 explains the control is disabled because the connection test is failing. -->
            <div
              v-if="isConnDisabled(control)"
              class="absolute inset-0 cursor-not-allowed"
              :title="CONN_DISABLED_TOOLTIP"
            ></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
