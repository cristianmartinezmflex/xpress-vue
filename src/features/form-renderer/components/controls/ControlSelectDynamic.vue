<script setup lang="ts">
/**
 * ControlSelectDynamic — single-choice dropdown whose options are fetched from the API on mount
 * (`loadFrom` → `[{ id, name }]`). Shows a spinner while loading and a blank "unset" option first.
 * For a static list of compile-time options use `select` instead.
 */
import { ref, onMounted } from 'vue'
import { resolveLoadFromUrl } from '../../utils/loadFrom'

const props = defineProps<{
  title?:      string
  modelValue:  number | string
  loadFrom:    string
  guid?:       string
  serviceBase?: string
  error?:      string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number | string] }>()

interface DynamicOption { id: number | string; name: string }

const options  = ref<DynamicOption[]>([])
const loading  = ref(false)
const fetchErr = ref('')

onMounted(async () => {
  const url = resolveLoadFromUrl(props.loadFrom, props.serviceBase ?? '', props.guid)
  if (!url) return
  loading.value  = true
  fetchErr.value = ''
  try {
    const res = await fetch(url)
    if (!res.ok) { fetchErr.value = `Error ${res.status}`; return }
    options.value = await res.json()
  } catch {
    fetchErr.value = 'Could not load'
  } finally {
    loading.value = false
  }
})

// Dynamic values are usually numeric ids — coerce so the saved value matches the option id type.
function onChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  const num = Number(raw)
  emit('update:modelValue', raw === '' || isNaN(num) ? raw : num)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</label>
    <div class="relative">
      <select
        :value="modelValue"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
        :class="[{ 'border-xp-red': error }, loading ? 'pr-9 text-gray-400' : '']"
        :disabled="loading"
        @change="onChange"
      >
        <!-- Blank "unset" option — mirrors the WinForm (empty combo when no value is set). -->
        <option :value="-1"></option>
        <option v-if="loading" value="" disabled>Loading…</option>
        <option v-for="opt in options" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
      </select>
      <!-- Spinner overlaid at the right while the option list is being fetched from the API. -->
      <svg
        v-if="loading"
        class="animate-spin w-4 h-4 text-xp-primary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
    <p v-if="fetchErr" class="text-xs text-xp-orange">{{ fetchErr }} — enter ID manually</p>
    <p v-if="error"    class="text-xs text-xp-red">{{ error }}</p>
  </div>
</template>
