<script setup lang="ts">
import { ref, computed } from 'vue'
import type { KeyValuePair } from '../../types/schema'

const props = defineProps<{
  title?: string
  keyTitle?: string
  keyHeader?: string
  valueTitle?: string
  valueHeader?: string
  modelValue: KeyValuePair[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: KeyValuePair[]] }>()

const filterKey = ref('')
const filterValue = ref('')

const keyOptions = computed(() =>
  [...new Set(props.modelValue.map((r) => r.key).filter((k) => k.trim() !== ''))],
)
const valueOptions = computed(() =>
  [...new Set(props.modelValue.map((r) => r.value).filter((v) => v.trim() !== ''))],
)

const filtered = computed(() =>
  props.modelValue.filter((row) => {
    return (
      (!filterKey.value || row.key === filterKey.value) &&
      (!filterValue.value || row.value === filterValue.value)
    )
  }),
)

const selectedRow = ref<number | null>(null)
const hasEmptyRow = computed(() =>
  props.modelValue.some((r) => r.key.trim() === '' || r.value.trim() === ''),
)

function addRow() {
  if (hasEmptyRow.value) return
  const updated = [...props.modelValue, { key: '', value: '' }]
  emit('update:modelValue', updated)
  selectedRow.value = updated.length - 1
}

function pruneEmptyOnBlur(index: number) {
  const row = props.modelValue[index]
  if (row && row.key.trim() === '' && row.value.trim() === '') {
    removeRow(index)
  }
}

function removeRow(index: number) {
  const updated = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
  selectedRow.value = null
}

function updateRow(index: number, field: 'key' | 'value', val: string) {
  const updated = props.modelValue.map((row, i) =>
    i === index ? { ...row, [field]: val } : row,
  )
  emit('update:modelValue', updated)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <span v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</span>

    <!-- Filter row -->
    <div class="flex gap-3 items-end">
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">{{ keyTitle ?? 'Source Columns' }}</label>
        <select
          v-model="filterKey"
          class="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option v-for="k in keyOptions" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs text-gray-500">{{ valueTitle ?? 'Destination Columns' }}</label>
        <select
          v-model="filterValue"
          class="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option v-for="v in valueOptions" :key="v" :value="v">{{ v }}</option>
        </select>
      </div>
      <button
        type="button"
        class="flex items-center justify-center w-9 h-9 rounded-full text-white font-bold transition self-end leading-none"
        :class="hasEmptyRow ? 'bg-green-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 cursor-pointer'"
        style="font-size: 22px; padding-bottom: 1px;"
        :title="hasEmptyRow ? 'Complete the empty row first' : 'Add row'"
        :disabled="hasEmptyRow"
        @click="addRow"
      >+</button>
    </div>

    <!-- Table -->
    <div class="border border-gray-200 rounded-md overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-3 py-2 font-medium text-gray-600">{{ keyHeader ?? 'Source Field' }}</th>
            <th class="text-left px-3 py-2 font-medium text-gray-600">{{ valueHeader ?? 'Destination Field' }}</th>
            <th class="w-8"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in filtered"
            :key="idx"
            class="border-b border-gray-100 last:border-0 cursor-pointer"
            :class="selectedRow === idx ? 'bg-blue-50' : 'hover:bg-gray-50'"
            @click="selectedRow = idx"
          >
            <td class="px-3 py-2">
              <input
                :value="row.key"
                class="w-full bg-transparent border-0 focus:outline-none text-sm"
                :class="{ 'placeholder:text-red-300': row.key.trim() === '' }"
                placeholder="Required"
                @input="updateRow(idx, 'key', ($event.target as HTMLInputElement).value)"
                @blur="pruneEmptyOnBlur(idx)"
                @click.stop
              />
            </td>
            <td class="px-3 py-2">
              <input
                :value="row.value"
                class="w-full bg-transparent border-0 focus:outline-none text-sm"
                :class="{ 'placeholder:text-red-300': row.value.trim() === '' }"
                placeholder="Required"
                @input="updateRow(idx, 'value', ($event.target as HTMLInputElement).value)"
                @blur="pruneEmptyOnBlur(idx)"
                @click.stop
              />
            </td>
            <td class="px-3 py-2 text-center">
              <button
                type="button"
                class="text-red-400 hover:text-red-600 text-xs"
                @click.stop="removeRow(idx)"
              >✕</button>
            </td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="3" class="px-3 py-4 text-center text-gray-400 text-sm">No rows</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
