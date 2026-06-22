<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FormSchema, Control } from '../types/schema'
import { useFormState } from '../composables/useFormState'
import FormSection from './FormSection.vue'
import ControlButtonBar from './controls/ControlButtonBar.vue'

const props = defineProps<{
  schema: FormSchema
  initialValues?: Record<string, any>
}>()
const emit = defineEmits<{ action: [id: string, handler: string] }>()

const activeTab = ref(0)
const visibleTabs = computed(() =>
  props.schema.tabs.filter((tab) =>
    tab.columns?.some((col) => col.sections?.some((s) => s.controls?.length > 0))
  ),
)
const showTabs = computed(() => visibleTabs.value.length > 1)
const currentTab = computed(() => visibleTabs.value[activeTab.value])

const allSections = computed(() =>
  currentTab.value.columns?.flatMap((col) => col.sections) ?? [],
)

const isFooterSection = (s: { title?: string }) => !s.title || s.title.trim() === ''

const sections = computed(() =>
  allSections.value.map((s) => ({
    ...s,
    controls: isFooterSection(s)
      ? s.controls.filter((c) => c.type !== 'button_bar')
      : s.controls,
  })).filter((s) => s.controls.length > 0),
)

const buttonBarControls = computed<Control[]>(() =>
  allSections.value
    .filter((s) => isFooterSection(s))
    .flatMap((s) => s.controls.filter((c) => c.type === 'button_bar')),
)

const { state, errors, validate } = useFormState(props.schema, props.initialValues)

defineExpose({ state })

const controlMap = computed<Record<string, Control>>(() => {
  const map: Record<string, Control> = {}
  props.schema.tabs.forEach((tab) =>
    tab.columns?.forEach((col) =>
      col.sections.forEach((section) =>
        section.controls.forEach((ctrl) => { map[ctrl.id] = ctrl })
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
        :class="activeTab === idx
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
        @click="activeTab = idx"
      >
        {{ tab.title }}
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="allSections.length" class="flex flex-col gap-4 max-w-2xl mx-auto">
        <FormSection
          v-for="(section, idx) in sections"
          :key="idx"
          :title="section.title"
          :controls="section.controls"
          :state="state"
          :errors="errors"
          :enable="section.enable"
          :display="section.display"
          @update:state="onUpdateState"
          @action="(id, handler) => emit('action', id, handler)"
        />

        <!-- Button bar always at the bottom -->
        <div v-if="buttonBarControls.length" class="flex justify-end pt-2">
          <ControlButtonBar
            v-for="ctrl in buttonBarControls"
            :key="ctrl.id"
            :buttons="ctrl.buttons ?? []"
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
