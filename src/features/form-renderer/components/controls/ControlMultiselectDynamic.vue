<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const props = defineProps<{
  title?:       string
  modelValue:   string   // vbBack-separated string of selected external IDs
  loadFrom:     string
  guid?:        string
  serviceBase?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

interface Option { id: number | string; name: string }

const options  = ref<Option[]>([])
const loading  = ref(false)
const fetchErr = ref('')

onMounted(async () => {
  if (!props.guid || !props.serviceBase || !props.loadFrom) return
  loading.value  = true
  fetchErr.value = ''
  try {
    const res = await fetch(`${props.serviceBase}/api/data-managers/${props.guid}/${props.loadFrom}`)
    if (!res.ok) { fetchErr.value = `Error ${res.status}`; return }
    options.value = await res.json()
  } catch {
    fetchErr.value = 'No se pudo cargar'
  } finally {
    loading.value = false
  }
})

// vbBack (\x08) is the separator used by the WinForms AEOS DM
const SEPARATOR = '\x08'

const selectedSet = computed<Set<string>>(() => {
  const val = props.modelValue ?? ''
  if (!val) return new Set()
  return new Set(val.split(SEPARATOR).filter(Boolean))
})

function isChecked(id: number | string): boolean {
  return selectedSet.value.has(String(id))
}

function toggle(id: number | string) {
  const key   = String(id)
  const next  = new Set(selectedSet.value)
  if (next.has(key)) next.delete(key)
  else               next.add(key)
  emit('update:modelValue', [...next].join(SEPARATOR))
}

function selectAll() {
  emit('update:modelValue', options.value.map((o) => String(o.id)).join(SEPARATOR))
}
function clearAll() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</span>

    <div v-if="loading" class="text-sm text-gray-400">Loading...</div>
    <div v-else-if="fetchErr" class="text-sm text-amber-500">{{ fetchErr }} — no se pudo cargar la lista</div>

    <template v-else>
      <!-- Select All / Clear All -->
      <div class="flex gap-2">
        <button
          type="button"
          class="text-xs text-blue-600 hover:underline cursor-pointer"
          @click="selectAll"
        >Select All</button>
        <span class="text-xs text-gray-300">|</span>
        <button
          type="button"
          class="text-xs text-blue-600 hover:underline cursor-pointer"
          @click="clearAll"
        >Clear All</button>
      </div>

      <!-- Checkbox list -->
      <div class="border border-gray-200 rounded-md overflow-hidden max-h-64 overflow-y-auto">
        <label
          v-for="opt in options"
          :key="opt.id"
          class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
        >
          <input
            type="checkbox"
            :checked="isChecked(opt.id)"
            class="w-4 h-4 rounded accent-blue-600"
            @change="toggle(opt.id)"
          />
          <span class="text-sm text-gray-800">{{ opt.name }}</span>
          <span class="ml-auto text-xs text-gray-400">{{ opt.id }}</span>
        </label>
        <div v-if="options.length === 0" class="px-3 py-4 text-center text-gray-400 text-sm">
          No options available
        </div>
      </div>

      <p class="text-xs text-gray-400">
        {{ selectedSet.size }} of {{ options.length }} selected
      </p>
    </template>
  </div>
</template>
