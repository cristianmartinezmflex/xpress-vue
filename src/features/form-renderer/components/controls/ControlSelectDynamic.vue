<script setup lang="ts">
import { ref, onMounted } from 'vue'

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
  if (!props.serviceBase || !props.loadFrom) return
  // `shared/<type>`  → GET /api/shared/<type>            (DM-agnostic local data, no guid needed)
  // `<type>`         → GET .../{guid}/dm-data?type=<type> (DM-specific data)
  const isShared = props.loadFrom.startsWith('shared/')
  if (!isShared && !props.guid) return
  loading.value  = true
  fetchErr.value = ''
  try {
    const url = isShared
      ? `${props.serviceBase}/api/shared/${props.loadFrom.slice(7)}`
      : `${props.serviceBase}/api/data-managers/${props.guid}/dm-data?type=${encodeURIComponent(props.loadFrom)}`
    const res = await fetch(url)
    if (!res.ok) { fetchErr.value = `Error ${res.status}`; return }
    const data: DynamicOption[] = await res.json()
    options.value = data
  } catch {
    fetchErr.value = 'Could not load'
  } finally {
    loading.value = false
  }
})

function onChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  const num = Number(raw)
  emit('update:modelValue', isNaN(num) ? raw : num)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="title" class="text-sm font-semibold text-xp-label">{{ title }}</label>
    <select
      :value="modelValue"
      class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
      :class="{ 'border-xp-red': error }"
      :disabled="loading"
      @change="onChange"
    >
      <option :value="-1">— All (no filter) —</option>
      <option v-if="loading" value="" disabled>Loading...</option>
      <option
        v-for="opt in options"
        :key="opt.id"
        :value="opt.id"
      >{{ opt.name }}</option>
    </select>
    <p v-if="fetchErr" class="text-xs text-xp-orange">{{ fetchErr }} — enter ID manually</p>
    <p v-if="error"    class="text-xs text-xp-red">{{ error }}</p>
  </div>
</template>
