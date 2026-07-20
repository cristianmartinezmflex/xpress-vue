<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FormSchema, Control } from '../types/schema'
import { useFormState } from '../composables/useFormState'
import { evaluateEnable, evaluateDisplay } from '../composables/useDisabled'
import FormSection from './FormSection.vue'

const props = defineProps<{
  schema:         FormSchema
  initialValues?: Record<string, any>
  guid?:          string
  serviceBase?:   string
}>()
const emit = defineEmits<{ action: [id: string, handler: string] }>()

const activeTab = ref(0)

const visibleTabs = computed(() =>
  props.schema.tabs.filter((tab) =>
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

const { state, errors, validate, resetToDefaults } = useFormState(props.schema, props.initialValues)

defineExpose({ state, resetToDefaults })

const controlMap = computed<Record<string, Control>>(() => {
  const map: Record<string, Control> = {}
  props.schema.tabs.forEach((tab) =>
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

    <!-- Tab bar -->
    <div v-if="showTabs" class="flex border-b border-gray-200 bg-white">
      <button
        v-for="(tab, idx) in visibleTabs"
        :key="tab.title"
        type="button"
        class="px-5 py-3 text-sm font-medium border-b-2 transition"
        :class="[
          !isTabEnabled(tab)
            ? 'border-transparent text-gray-300 cursor-not-allowed'
            : activeTab === idx
              ? 'border-blue-500 text-blue-600 cursor-pointer'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'
        ]"
        :disabled="!isTabEnabled(tab)"
        @click="isTabEnabled(tab) && (activeTab = idx)"
      >
        {{ tab.title }}
      </button>
    </div>

    <!-- Sticky action bar (generic buttons always visible) -->
    <div class="flex items-center justify-end gap-2 px-6 py-2 bg-white border-b border-gray-200 shadow-sm">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        @click="emit('action', 'btn_test_connect', 'dm_shared_testConnection')"
      >
        Test Connect
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        @click="emit('action', 'btn_defaults', 'setDefaults')"
      >
        Defaults
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-md border border-blue-500 bg-blue-500 text-white hover:bg-blue-600 transition cursor-pointer"
        @click="emit('action', 'btn_save', 'dm_shared_save')"
      >
        Save
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="sections.length" class="flex flex-col gap-4 max-w-2xl mx-auto">
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
          @action="(id, handler) => emit('action', id, handler)"
        />
      </div>
      <div v-else class="flex items-center justify-center h-40 text-gray-400 text-sm">
        No content defined for this tab.
      </div>
    </div>

  </div>
</template>
