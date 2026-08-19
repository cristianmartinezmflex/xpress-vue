<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { KeyValuePair } from '../../types/schema'
import { resolveLoadFromUrl } from '../../utils/loadFrom'

// Maps an external system field -> an XPressEntry field. Mirrors the WinForm ctlCustomFields:
//   - Source Columns / Destination Columns are EDITABLE combos: pick from the loaded list OR type a
//     custom value (WinForm uses editable ComboBox.Text).
//   - The "+" button is ALWAYS enabled; clicking with either combo empty simply does nothing.
//   - Duplicate source fields are not added.
// Source Columns  = loadFrom            (the DM's external fields)
// Destination Cols = destinationLoadFrom (local XPressEntry fields; /api/shared/entity-fields-users).
// Value round-trips as the same KeyValuePair[] the service expects (key = source, value = XPE field).
const props = defineProps<{
  title?:               string
  entity?:              string   // customFields target entity (Users/Badges/…) — drives the default title
  keyHeader?:           string
  valueHeader?:         string
  keyTitle?:            string
  valueTitle?:          string
  loadFrom?:            string
  destinationLoadFrom?: string
  guid?:                string
  serviceBase?:         string
  modelValue:           KeyValuePair[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: KeyValuePair[]] }>()

// Title: an explicit title wins; otherwise derive a generic one from the entity ("Users Custom Mapping",
// "Badges Custom Mapping", …). Falls back to nothing when neither is provided.
const displayTitle = computed(() => {
  if (props.title && props.title.trim()) return props.title
  if (props.entity && props.entity.trim()) return `${props.entity} Custom Mapping`
  return ''
})

// When loadFrom / destinationLoadFrom aren't given explicitly, derive them from `entity` (same
// convention as the .NET generator): source = external custom fields, destination = XPressEntry fields.
// A DM whose source list is entity-specific (e.g. AEOS employee/visitor/contractor) still declares its
// own `loadFrom`; the destination is almost always derivable from the entity, so it can be omitted.
const entityLower = computed(() => (props.entity ?? '').trim().toLowerCase())
const effectiveLoadFrom = computed(() =>
  props.loadFrom || (entityLower.value ? `custom-fields-${entityLower.value}` : undefined),
)
const effectiveDestinationLoadFrom = computed(() =>
  props.destinationLoadFrom || (entityLower.value ? `shared/entity-fields-${entityLower.value}` : undefined),
)

interface Combo { text: string; options: string[]; loading: boolean; open: boolean; menu: { left: number; top: number; width: number } }
const newCombo = (): Combo => ({ text: '', options: [], loading: false, open: false, menu: { left: 0, top: 0, width: 0 } })
const source = reactive<Combo>(newCombo())
const dest   = reactive<Combo>(newCombo())
const loadErr = reactive({ msg: '' })

// Input refs so the (teleported, position:fixed) dropdown can be re-anchored to the input on scroll/
// resize — otherwise it would detach from the input when the page scrolls.
const sourceInputRef = ref<HTMLInputElement | null>(null)
const destInputRef   = ref<HTMLInputElement | null>(null)

function place(combo: Combo, el: HTMLElement | null | undefined) {
  if (!el) return
  const r = el.getBoundingClientRect()
  combo.menu = { left: r.left, top: r.bottom + 4, width: r.width }
}

// Open a combo and anchor its dropdown to the input's viewport rect (renders on top of everything and
// escapes the section's overflow-hidden).
function openCombo(combo: Combo, el: HTMLElement) {
  place(combo, el)
  combo.open = true
}

// Keep any open dropdown glued to its input while the page scrolls / resizes (capture:true so it also
// fires for the inner scrollable content container, not just window).
function reposition() {
  if (source.open) place(source, sourceInputRef.value)
  if (dest.open)   place(dest, destInputRef.value)
}

async function loadInto(url: string | null, combo: Combo) {
  if (!url) return
  combo.loading = true
  try {
    const res = await fetch(url)
    if (!res.ok) { loadErr.msg = `Error ${res.status}`; return }
    const data = await res.json()
    combo.options = Array.isArray(data)
      ? data.map((d: any) => (typeof d === 'string' ? d : (d?.name ?? d?.id ?? ''))).filter(Boolean)
      : []
  } catch {
    loadErr.msg = 'Could not load'
  } finally {
    combo.loading = false
  }
}

onMounted(() => {
  loadInto(resolveLoadFromUrl(effectiveLoadFrom.value, props.serviceBase ?? '', props.guid), source)
  loadInto(resolveLoadFromUrl(effectiveDestinationLoadFrom.value, props.serviceBase ?? '', props.guid), dest)
  window.addEventListener('scroll', reposition, true)
  window.addEventListener('resize', reposition)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', reposition, true)
  window.removeEventListener('resize', reposition)
})

// While loading show a loading hint; otherwise the normal prompt.
function placeholderFor(combo: Combo, normal: string): string {
  return combo.loading ? 'Loading fields…' : normal
}

// Options shown in the dropdown: filtered by the typed text (case-insensitive contains); all when empty.
function filtered(combo: Combo): string[] {
  const q = combo.text.trim().toLowerCase()
  if (!q) return combo.options
  return combo.options.filter((o) => o.toLowerCase().includes(q))
}

function pick(combo: Combo, value: string) {
  combo.text = value
  combo.open = false
}

// Always enabled (WinForm parity). No-op if either field is empty or the source is already mapped.
function addMapping() {
  const k = source.text.trim()
  const v = dest.text.trim()
  if (!k || !v) return
  const rows = props.modelValue ?? []
  if (rows.some((r) => r.key === k)) return   // one destination per source
  emit('update:modelValue', [...rows, { key: k, value: v }])
  source.text = ''
  dest.text   = ''
}

function removeRow(index: number) {
  emit('update:modelValue', (props.modelValue ?? []).filter((_, i) => i !== index))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <span v-if="displayTitle" class="text-sm font-semibold text-xp-label">{{ displayTitle }}</span>

    <!-- Editable combos (pick or type) + add — same as the WinForm -->
    <div class="flex gap-3 items-end">
      <!-- Source combo -->
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">{{ keyTitle ?? 'Source Columns' }}</label>
        <div class="relative">
          <input
            ref="sourceInputRef"
            v-model="source.text"
            type="text"
            :placeholder="placeholderFor(source, 'Select or type a source field')"
            class="w-full rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
            @focus="openCombo(source, $event.target as HTMLElement)"
            @input="openCombo(source, $event.target as HTMLElement)"
            @blur="source.open = false"
            @keydown.enter.prevent="addMapping"
          />
          <!-- loading spinner (right, inside the field) -->
          <svg v-if="source.loading" class="animate-spin w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <!-- caret when not loading -->
          <svg v-else class="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <!-- dropdown list (normal combo) — teleported to body + fixed position so it escapes the
               section's overflow-hidden and renders above everything -->
          <Teleport to="body">
            <ul
              v-if="source.open && !source.loading && filtered(source).length"
              class="fixed z-[60] max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
              :style="{ left: source.menu.left + 'px', top: source.menu.top + 'px', width: source.menu.width + 'px' }"
            >
              <li
                v-for="o in filtered(source)"
                :key="o"
                class="px-3 py-1.5 text-sm text-gray-800 hover:bg-xp-light-hover cursor-pointer"
                @mousedown.prevent="pick(source, o)"
              >{{ o }}</li>
            </ul>
          </Teleport>
        </div>
      </div>

      <!-- Destination combo -->
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">{{ valueTitle ?? 'Destination Columns' }}</label>
        <div class="relative">
          <input
            ref="destInputRef"
            v-model="dest.text"
            type="text"
            :placeholder="placeholderFor(dest, 'Select or type an XPressEntry field')"
            class="w-full rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
            @focus="openCombo(dest, $event.target as HTMLElement)"
            @input="openCombo(dest, $event.target as HTMLElement)"
            @blur="dest.open = false"
            @keydown.enter.prevent="addMapping"
          />
          <svg v-if="dest.loading" class="animate-spin w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <svg v-else class="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <Teleport to="body">
            <ul
              v-if="dest.open && !dest.loading && filtered(dest).length"
              class="fixed z-[60] max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
              :style="{ left: dest.menu.left + 'px', top: dest.menu.top + 'px', width: dest.menu.width + 'px' }"
            >
              <li
                v-for="o in filtered(dest)"
                :key="o"
                class="px-3 py-1.5 text-sm text-gray-800 hover:bg-xp-light-hover cursor-pointer"
                @mousedown.prevent="pick(dest, o)"
              >{{ o }}</li>
            </ul>
          </Teleport>
        </div>
      </div>

      <button
        type="button"
        class="flex items-center justify-center w-9 h-9 rounded-full text-white font-bold transition self-end leading-none bg-xp-success hover:bg-xp-success-hover cursor-pointer"
        style="font-size: 22px; padding-bottom: 1px;"
        title="Add mapping"
        @click="addMapping"
      >+</button>
    </div>

    <p v-if="loadErr.msg" class="text-xs text-xp-orange">{{ loadErr.msg }} — you can still type the fields manually</p>

    <!-- Mapping grid -->
    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-3 py-2 font-medium text-gray-600">{{ keyHeader ?? 'Source Field' }}</th>
            <th class="text-left px-3 py-2 font-medium text-gray-600">{{ valueHeader ?? 'XPressEntry Field' }}</th>
            <th class="w-8"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in (modelValue ?? [])"
            :key="idx"
            class="border-b border-gray-100 last:border-0"
          >
            <td class="px-3 py-2">{{ row.key }}</td>
            <td class="px-3 py-2">{{ row.value }}</td>
            <td class="px-3 py-2 text-center">
              <button
                type="button"
                class="text-xp-red hover:text-xp-red-hover text-xs cursor-pointer"
                @click="removeRow(idx)"
              >✕</button>
            </td>
          </tr>
          <tr v-if="(modelValue ?? []).length === 0">
            <td colspan="3" class="px-3 py-4 text-center text-gray-400 text-sm">No field mappings</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
