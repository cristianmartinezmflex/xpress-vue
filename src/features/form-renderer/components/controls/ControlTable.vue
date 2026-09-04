<script setup lang="ts">
/**
 * ControlTable — a GENERIC editable grid (schema type "table").
 *
 * Nothing about the columns or the Add-row modal is hardcoded: both are built from `fields`, which the
 * .NET schema generator produces by reflecting the row type of the backend List(Of T) setting
 * (e.g. GenetecSettings.RioDeviceRow). Each field is itself a control def (text/password/boolean/number/
 * select), so the modal renders the right input per field.
 *
 * Value round-trips as a JSON string holding an array of row objects (keyed by field id).
 */
import { ref, computed } from 'vue'
import type { Control, Button } from '../../types/schema'
import { useTableSelection } from '../../composables/useTableSelection'
import { sortRowsForDisplay } from '../../utils/tableRows'
import ControlText          from './ControlText.vue'
import ControlBoolean       from './ControlBoolean.vue'
import ControlNumber        from './ControlNumber.vue'
import ControlNumberSpinner from './ControlNumberSpinner.vue'
import ControlSelect        from './ControlSelect.vue'
import ControlPassword      from './ControlPassword.vue'

type Row = Record<string, any>

const props = defineProps<{
  title?:        string
  modelValue:    string | Row[]   // JSON string (or array) of row objects
  fields:        Control[]
  guid?:         string
  serviceBase?:  string
  // Optional action button(s) in the modal footer (between Cancel and Save), e.g. Genetec "Ping".
  modalActions?: Button[]
  // Master-detail: when true, clicking a row SELECTS it (a detail control keyed by controlId edits it)
  // instead of opening the modal — editing is via a per-row pencil button. Needs controlId.
  selectable?:   boolean
  controlId?:    string
  // Name of a numeric identity field kept UNIQUE per row (e.g. RIODevice "ID"). The backend keys its
  // device dictionary by it, so duplicate/missing ids would silently overwrite rows on save.
  idField?:      string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// ─── Rows ────────────────────────────────────────────────────────────────────
// Rows in DISPLAY order (by idField desc — same order the WinForm's Hashtable-by-id shows). All row
// operations and the shared selection index below use this order, so it stays in sync with the detail.
const rows = computed<Row[]>(() => {
  const v = props.modelValue
  let parsed: Row[] = []
  if (Array.isArray(v)) parsed = v
  else if (typeof v === 'string' && v.trim()) {
    try { const p = JSON.parse(v); if (Array.isArray(p)) parsed = p } catch { parsed = [] }
  }
  return sortRowsForDisplay(parsed, props.idField)
})

// Guarantee a unique numeric id per row when `idField` is set. The backend stores rows in a dictionary
// keyed by this id (e.g. RIODevice.ID), so a missing/duplicate/negative id makes rows overwrite each
// other on save (the classic "the first device disappears" bug). Valid, unique, non-negative ids are
// preserved; everything else is assigned the next free id (matching the WinForm's incrementing counter).
function normalizeIds(list: Row[]): Row[] {
  const key = props.idField
  if (!key) return list
  let maxId = -1
  for (const r of list) {
    const v = Number(r[key])
    if (Number.isInteger(v) && v >= 0) maxId = Math.max(maxId, v)
  }
  const seen = new Set<number>()
  return list.map((r) => {
    let v = Number(r[key])
    if (!Number.isInteger(v) || v < 0 || seen.has(v)) v = ++maxId
    seen.add(v)
    return r[key] === v ? r : { ...r, [key]: v }
  })
}

function emitRows(next: Row[]) {
  emit('update:modelValue', JSON.stringify(normalizeIds(next)))
}

// ─── Master-detail selection ────────────────────────────────────────────────────
// The selected row index lives in the shared registry keyed by this control's id, so a detail control
// (e.g. RIO Door Settings) can read/edit the selected row.
const selection = useTableSelection()
const selKey = computed(() => props.controlId ?? '')
const selectedIndex = computed<number | null>(() =>
  props.selectable && selKey.value ? (selection[selKey.value] ?? null) : null,
)

function selectRow(idx: number) {
  if (!selKey.value) return
  selection[selKey.value] = selection[selKey.value] === idx ? null : idx
}

function onRowClick(idx: number) {
  if (props.selectable) selectRow(idx)
  else                  openEdit(idx)
}

// Columns: every field EXCEPT password (secrets aren't shown in the grid, matching the WinForm).
const columns = computed(() => props.fields.filter((f) => f.type !== 'password'))

function cellText(row: Row, field: Control): string {
  const v = row[field.id]
  if (field.type === 'boolean') return v ? 'True' : 'False'
  return v == null ? '' : String(v)
}

function removeRow(idx: number) {
  emitRows(rows.value.filter((_, i) => i !== idx))
  // Keep the shared selection pointing at the same row (or clear it if that row was removed).
  if (props.selectable && selKey.value) {
    const cur = selection[selKey.value]
    if (cur != null) {
      if (cur === idx)      selection[selKey.value] = null
      else if (cur > idx)   selection[selKey.value] = cur - 1
    }
  }
}

// ─── Add / Edit modal ──────────────────────────────────────────────────────────
// editIndex: null = adding a new row; a number = editing that existing row.
const modalOpen = ref(false)
const editIndex = ref<number | null>(null)
const draft     = ref<Row>({})
const original  = ref<Row>({})   // snapshot to detect changes when editing

// Modal action (e.g. Ping) state: inline result message + which action is in-flight — mirrors the
// WinForm's status label ("Device ping successful!" / "Device ping failed: …").
const actionStatus = ref<{ ok: boolean; message: string } | null>(null)
const actionBusy   = ref<string | null>(null)

function fieldDefault(f: Control): any {
  if (f.default !== undefined) return f.default
  if (f.type === 'boolean') return false
  if (f.type === 'number' || f.type === 'number_spinner') return 0
  return ''
}

function openAdd() {
  const d: Row = {}
  for (const f of props.fields) d[f.id] = fieldDefault(f)
  draft.value = d
  original.value = { ...d }
  editIndex.value = null
  actionStatus.value = null
  modalOpen.value = true
}

// Click a row → open the modal pre-filled with that row's values for editing.
// IMPORTANT: start from the FULL row so properties the schema doesn't expose as fields (e.g. ID,
// DoorList, AllDoorsOnline) are preserved on save instead of being dropped. Only fill in missing
// schema fields with their defaults.
function openEdit(idx: number) {
  const row = rows.value[idx] ?? {}
  const d: Row = { ...row }
  for (const f of props.fields) if (d[f.id] === undefined) d[f.id] = fieldDefault(f)
  draft.value = d
  original.value = { ...d }
  editIndex.value = idx
  actionStatus.value = null
  modalOpen.value = true
}

function closeModal() { modalOpen.value = false }

// Run a modal action button (e.g. Ping): POST the current draft row to the DM's dm-action endpoint and
// show the returned { success, message } inline. Purely a device check — never mutates the table rows.
async function runModalAction(btn: Button) {
  if (!props.guid || !props.serviceBase || !btn.action) {
    actionStatus.value = { ok: false, message: 'No service connection.' }
    return
  }
  actionBusy.value = btn.id
  actionStatus.value = null
  try {
    // btn.action is a full URL template (short-form already expanded by the generator); {dmId} → guid.
    const url = `${props.serviceBase}${btn.action.replace(/\{dmId\}/g, props.guid)}`
    const res = await fetch(url, {
      method: (btn.verb || 'POST').toUpperCase(),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft.value),
    })
    const body = await res.json().catch(() => null)
    const ok = res.ok && body?.success !== false
    const message = body?.message ?? body?.Error ?? body?.error ?? (ok ? 'Success.' : `The service returned ${res.status}.`)
    actionStatus.value = { ok, message: String(message) }
  } catch {
    actionStatus.value = { ok: false, message: 'Could not reach the service.' }
  } finally {
    actionBusy.value = null
  }
}

// The first field is the row's key/display column (must be non-empty to add a row).
const keyField = computed(() => props.fields[0])

const isEditing = computed(() => editIndex.value !== null)
const isDirty   = computed(() => JSON.stringify(draft.value) !== JSON.stringify(original.value))

const canSave = computed(() => {
  const kf = keyField.value
  const keyOk = !kf || String(draft.value[kf.id] ?? '').trim().length > 0
  // Add: require the key. Edit: require the key AND that something actually changed.
  return keyOk && (!isEditing.value || isDirty.value)
})

function saveRow() {
  if (!canSave.value) return
  const next = [...rows.value]
  if (editIndex.value === null) next.push({ ...draft.value })
  else                          next[editIndex.value] = { ...draft.value }
  emitRows(next)
  modalOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Header: title + Add button top-right -->
    <div class="flex items-center justify-between">
      <span v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</span>
      <button
        type="button"
        class="flex items-center gap-1 text-sm font-medium text-white bg-xp-primary hover:bg-xp-primary-hover rounded-lg px-3 py-1.5 cursor-pointer transition"
        @click="openAdd"
      >
        <span class="text-base leading-none">+</span> Add
      </button>
    </div>

    <!-- Grid -->
    <div class="border border-gray-200 rounded-lg overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th v-for="col in columns" :key="col.id" class="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
              {{ col.title ?? col.id }}
            </th>
            <th class="w-8"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rows"
            :key="idx"
            class="border-b border-gray-100 last:border-0 cursor-pointer transition-colors"
            :class="selectedIndex === idx ? 'bg-xp-primary/10 hover:bg-xp-primary/15' : 'hover:bg-gray-50'"
            @click="onRowClick(idx)"
          >
            <td v-for="col in columns" :key="col.id" class="px-3 py-2 whitespace-nowrap">{{ cellText(row, col) }}</td>
            <td class="px-3 py-2 text-center whitespace-nowrap">
              <!-- Selectable tables separate select (row click) from edit (this pencil). -->
              <button
                v-if="selectable"
                type="button"
                class="text-gray-400 hover:text-xp-primary text-xs cursor-pointer mr-2"
                title="Edit"
                @click.stop="openEdit(idx)"
              >✎</button>
              <button
                type="button"
                class="text-xp-red hover:text-xp-red-hover text-xs cursor-pointer"
                title="Remove"
                @click.stop="removeRow(idx)"
              >✕</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td :colspan="(columns.length || 1) + 1" class="px-3 py-6 text-center text-gray-400">No devices</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add / Edit modal (form built from `fields`) -->
    <Teleport to="body">
      <Transition name="dialog">
        <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="closeModal">
          <div class="absolute inset-0 bg-black/30" />
          <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <h2 class="text-sm font-semibold text-gray-800">{{ isEditing ? (title || 'Edit') : (title || 'Add') }}</h2>

            <!-- Each field renders with the same shared Control component the main form uses, so the
                 Add/Edit row form is consistent (each control renders its own label from `title`). -->
            <div class="flex flex-col gap-3">
              <div v-for="f in fields" :key="f.id">
                <ControlBoolean
                  v-if="f.type === 'boolean'"
                  :title="f.title"
                  v-model="draft[f.id]"
                />
                <ControlSelect
                  v-else-if="f.type === 'select'"
                  :title="f.title"
                  :options="f.options ?? []"
                  v-model="draft[f.id]"
                />
                <ControlNumberSpinner
                  v-else-if="f.type === 'number_spinner'"
                  :title="f.title"
                  :validations="f.validations"
                  v-model="draft[f.id]"
                />
                <ControlNumber
                  v-else-if="f.type === 'number'"
                  :title="f.title"
                  v-model="draft[f.id]"
                />
                <ControlPassword
                  v-else-if="f.type === 'password'"
                  :title="f.title"
                  v-model="draft[f.id]"
                />
                <ControlText
                  v-else
                  :title="f.title"
                  v-model="draft[f.id]"
                />
              </div>
            </div>

            <!-- Inline action result (e.g. Ping outcome), styled like the WinForm status label. -->
            <p
              v-if="actionStatus"
              class="text-xs -mt-1"
              :class="actionStatus.ok ? 'text-green-600' : 'text-xp-red'"
            >{{ actionStatus.message }}</p>

            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                class="px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition"
                @click="closeModal"
              >
                Cancel
              </button>

              <!-- Modal action button(s) declared on the row type (e.g. Genetec "Ping") — between Cancel and Save. -->
              <button
                v-for="btn in (modalActions ?? [])"
                :key="btn.id"
                type="button"
                :disabled="actionBusy === btn.id"
                :title="btn.tooltip"
                class="px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 transition flex items-center gap-2"
                :class="actionBusy === btn.id ? 'cursor-wait opacity-80' : 'hover:bg-gray-50 cursor-pointer'"
                @click="runModalAction(btn)"
              >
                <svg
                  v-if="actionBusy === btn.id"
                  class="animate-spin w-4 h-4 text-xp-primary"
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ btn.title }}
              </button>

              <button
                type="button"
                :disabled="!canSave"
                class="px-4 py-1.5 text-sm font-medium rounded-lg text-white transition"
                :class="canSave ? 'bg-xp-primary hover:bg-xp-primary-hover cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
                @click="saveRow"
              >
                {{ isEditing ? 'Save' : 'Add New' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active { transition: opacity 0.15s ease; }
.dialog-enter-from,
.dialog-leave-to { opacity: 0; }
</style>
