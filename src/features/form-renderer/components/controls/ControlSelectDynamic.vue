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
  if (!props.guid || !props.serviceBase || !props.loadFrom) return
  loading.value  = true
  fetchErr.value = ''
  try {
    const res = await fetch(`${props.serviceBase}/api/data-managers/${props.guid}/${props.loadFrom}`)
    if (!res.ok) { fetchErr.value = `Error ${res.status}`; return }
    const data: DynamicOption[] = await res.json()
    options.value = data
  } catch {
    fetchErr.value = 'No se pudo cargar'
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
    <label v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</label>
    <select
      :value="modelValue"
      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      :class="{ 'border-red-500': error }"
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
    <p v-if="fetchErr" class="text-xs text-amber-500">{{ fetchErr }} — enter ID manually</p>
    <p v-if="error"    class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
