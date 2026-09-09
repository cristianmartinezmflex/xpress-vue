<script setup lang="ts">
/**
 * ControlCustomSync — the custom-sync table editor that used to live in the "Custom Sync" dialog, now
 * an inline control for the common "Custom Sync" tab. Each row is a table to sync: { iDMTable, bPartial }.
 * The value round-trips as a JSON array string stored in the DM setting `custom_sync_settings`.
 *
 * The catalogue of syncable entities comes ENTIRELY from the schema (`options`, [{ id, name }]): the
 * base DataManagerSettings declares the full default set and each DM overrides it with its own subset
 * (DataManagerSettingCustomSyncEntities). Nothing here is hardcoded — a DM with no entities offers none.
 */
import { computed, ref, watch } from 'vue'
import type { SelectOption } from '../../types/schema'

interface Row { iDMTable: number; bPartial: boolean }

const props = defineProps<{
  title?:      string
  modelValue:  string             // JSON array of { iDMTable, bPartial } (or empty)
  options?:    SelectOption[]     // syncable-entity catalogue from the schema ([{ id, name }])
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// Normalise the schema options into the shape the editor uses. ids are the LISTS enum integers.
// Sorted alphabetically by label to match the WinForm's Custom Table Sync dropdown (the stored value is
// the id, so ordering the display doesn't change what gets saved).
const availableTables = computed(() =>
  (props.options ?? [])
    .map((o) => ({ value: Number(o.id), label: o.name }))
    .sort((a, b) => a.label.localeCompare(b.label)),
)

function parseRows(v: string): Row[] {
  if (!v) return []
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
}
// Only rows with a real selection (iDMTable >= 0) become the emitted value — a "-1" placeholder row (just
// added, not yet picked) is kept LOCALLY for rendering but never persisted, so an empty new row doesn't
// count as a change (Save stays disabled) and can't be saved.
function serializeValid(list: Row[]): string {
  const valid = list.filter((r) => r.iDMTable >= 0)
  return valid.length ? JSON.stringify(valid) : ''
}

// Local working copy (includes any in-progress empty row). Seeded from modelValue, and re-seeded only when
// modelValue changes to something OTHER than what we last emitted (external load/reset) — our own emits
// (which exclude the empty row) must not wipe that row.
const rows = ref<Row[]>(parseRows(props.modelValue))
watch(() => props.modelValue, (v) => {
  if ((v || '') !== serializeValid(rows.value)) rows.value = parseRows(v)
})

function commit() { emit('update:modelValue', serializeValid(rows.value)) }

function addTable() {
  // Start UNSELECTED (-1 sentinel) so the new row shows blank instead of a preselected entity — the user
  // must pick one explicitly (matches the WinForm, whose new row opens with an empty combo). commit()
  // emits only the valid rows, so this empty row does NOT dirty the form.
  rows.value = [...rows.value, { iDMTable: -1, bPartial: false }]
  commit()
}
function removeTable(i: number) { rows.value = rows.value.filter((_, idx) => idx !== i); commit() }
function setTable(i: number, value: number) { rows.value = rows.value.map((r, idx) => idx === i ? { ...r, iDMTable: value } : r); commit() }
function setPartial(i: number, value: boolean) { rows.value = rows.value.map((r, idx) => idx === i ? { ...r, bPartial: value } : r); commit() }

// ─── Drag-and-drop reorder (order matters — the sync runs the tables in this order) ───────────────
const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)

function onDragStart(i: number, e: DragEvent) {
  dragIndex.value = i
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i)) // required for Firefox to start the drag
  }
}
function onDragOver(i: number, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  overIndex.value = i
}
function onDrop(i: number) {
  const from = dragIndex.value
  if (from != null && from !== i) {
    const next = [...rows.value]
    const [moved] = next.splice(from, 1)
    next.splice(i, 0, moved)
    rows.value = next
    commit()
  }
  resetDrag()
}
function resetDrag() { dragIndex.value = null; overIndex.value = null }
</script>

<template>
  <div class="flex flex-col gap-3">
    <span v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</span>

    <div v-if="rows.length > 0" class="flex flex-col gap-2">
      <div
        v-for="(row, i) in rows"
        :key="i"
        class="flex items-center gap-3 rounded-lg px-1 py-0.5 transition"
        :class="[
          dragIndex === i ? 'opacity-40' : '',
          overIndex === i && dragIndex !== null && dragIndex !== i ? 'ring-2 ring-xp-primary/40 bg-xp-primary/5' : ''
        ]"
        @dragover="onDragOver(i, $event)"
        @drop="onDrop(i)"
        @dragend="resetDrag"
      >
        <!-- Drag handle — reorder the sync tables (order matters; the sync runs them top-to-bottom). -->
        <span
          class="shrink-0 w-5 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing select-none"
          draggable="true"
          title="Drag to reorder"
          @dragstart="onDragStart(i, $event)"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
        </span>
        <select
          :value="row.iDMTable"
          class="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary cursor-pointer"
          @change="setTable(i, Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-if="row.iDMTable < 0" :value="-1" disabled hidden></option>
          <option v-for="t in availableTables" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" :checked="row.bPartial" class="cursor-pointer accent-xp-primary" @change="setPartial(i, ($event.target as HTMLInputElement).checked)" />
          Partial?
        </label>
        <button type="button" class="w-6 h-6 flex items-center justify-center text-xp-red hover:text-xp-red-hover cursor-pointer transition text-lg leading-none" title="Remove" @click="removeTable(i)">✕</button>
      </div>
    </div>

    <div v-else class="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
      {{ availableTables.length
        ? 'No tables configured. Click "Add Table" to add one.'
        : 'This data manager has no syncable entities configured.' }}
    </div>

    <button
      v-if="availableTables.length"
      type="button"
      class="flex items-center gap-2 text-sm text-xp-primary hover:text-xp-primary-hover font-medium cursor-pointer w-fit"
      @click="addTable"
    >
      <span class="text-lg leading-none">+</span> Add Table
    </button>
  </div>
</template>
