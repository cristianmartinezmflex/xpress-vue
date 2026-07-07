<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FormSchema, Control } from '../types/schema'
import { useFormState } from '../composables/useFormState'
import { evaluateEnable } from '../composables/useDisabled'
import FormSection from './FormSection.vue'
import ControlButtonBar from './controls/ControlButtonBar.vue'

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
    evaluateEnable(tab.enable, state) &&
    tab.sections?.some((s) => s.columns?.some((col) => col.controls?.length > 0))
  ),
)

const showTabs   = computed(() => visibleTabs.value.length > 1)
const currentTab = computed(() => visibleTabs.value[activeTab.value])

const allSections = computed(() => currentTab.value?.sections ?? [])

const isFooterSection = (s: { title?: string }) => !s.title || s.title.trim() === ''

const sections = computed(() =>
  allSections.value.filter(
    (s) => !isFooterSection(s) && s.columns?.some((col) => col.controls?.length > 0),
  ),
)

const buttonBarControls = computed<Control[]>(() =>
  allSections.value
    .filter((s) => isFooterSection(s))
    .flatMap((s) => s.columns?.flatMap((col) => col.controls?.filter((c) => c.type === 'button_bar') ?? []) ?? []),
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
        class="px-5 py-3 text-sm font-medium border-b-2 transition cursor-pointer"
        :class="activeTab === idx
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
        @click="activeTab = idx"
      >
        {{ tab.title }}
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="allSections.length" class="flex flex-col gap-4 max-w-2xl mx-auto">
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

        <div v-if="buttonBarControls.length" class="flex justify-end pt-2">
          <ControlButtonBar
            v-for="ctrl in buttonBarControls"
            :key="ctrl.id"
            :buttons="ctrl.buttons ?? []"
            :state="state"
            @action="(id, handler) => emit('action', id, handler)"
          />
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-40 text-gray-400 text-sm">
        No content defined for this tab.
      </div>
    </div>

  </div>
</template>
