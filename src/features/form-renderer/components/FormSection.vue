<script setup lang="ts">
import { computed } from 'vue'
import type { Control, EnableProp, DisplayProp } from '../types/schema'
import { evaluateEnable, evaluateDisplay } from '../composables/useDisabled'
import ControlText from './controls/ControlText.vue'
import ControlPassword from './controls/ControlPassword.vue'
import ControlBoolean from './controls/ControlBoolean.vue'
import ControlNumber from './controls/ControlNumber.vue'
import ControlNumberSpinner from './controls/ControlNumberSpinner.vue'
import ControlSelect from './controls/ControlSelect.vue'
import ControlRadio from './controls/ControlRadio.vue'
import ControlButtonBar from './controls/ControlButtonBar.vue'
import ControlKeyValue from './controls/ControlKeyValue.vue'

const props = defineProps<{
  title?: string
  controls: Control[]
  state: Record<string, any>
  errors: Readonly<Record<string, string>>
  enable?: EnableProp
  display?: DisplayProp
}>()

const emit = defineEmits<{
  'update:state': [id: string, value: any]
  action: [id: string, handler: string]
}>()

const sectionEnabled  = computed(() => evaluateEnable(props.enable, props.state))
const sectionVisible  = computed(() => evaluateDisplay(props.display, props.state))

function isControlEnabled(control: Control): boolean {
  return sectionEnabled.value && evaluateEnable(control.enable, props.state)
}

function isControlVisible(control: Control): boolean {
  return evaluateDisplay(control.display, props.state)
}
</script>

<template>
  <div
    v-show="sectionVisible"
    class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden transition-opacity"
    :class="!sectionEnabled ? 'opacity-50' : ''"
  >
    <div v-if="title" class="px-4 py-2 bg-gray-50 border-b border-gray-200">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">{{ title }}</h3>
    </div>
    <div class="p-4 flex flex-col gap-4" :class="!sectionEnabled ? 'pointer-events-none select-none' : ''">
      <template v-for="control in controls" :key="control.id">

        <div
          v-show="isControlVisible(control)"
          class="transition-opacity"
          :class="!isControlEnabled(control) && sectionEnabled ? 'opacity-50 pointer-events-none select-none' : ''"
        >
          <ControlPassword
            v-if="control.type === 'password'"
            :title="control.title"
            :model-value="state[control.id] ?? ''"
            :error="errors[control.id]"
            @update:model-value="emit('update:state', control.id, $event)"
          />

          <ControlText
            v-else-if="control.type === 'text'"
            :title="control.title"
            :model-value="state[control.id] ?? ''"
            :error="errors[control.id]"
            @update:model-value="emit('update:state', control.id, $event)"
          />

          <ControlBoolean
            v-else-if="control.type === 'boolean'"
            :title="control.title"
            :model-value="state[control.id] ?? false"
            @update:model-value="emit('update:state', control.id, $event)"
          />

          <ControlNumber
            v-else-if="control.type === 'number'"
            :title="control.title"
            :model-value="state[control.id] ?? 0"
            :error="errors[control.id]"
            @update:model-value="emit('update:state', control.id, $event)"
          />

          <ControlNumberSpinner
            v-else-if="control.type === 'number_spinner'"
            :title="control.title"
            :model-value="state[control.id] ?? 0"
            :validations="control.validations"
            :error="errors[control.id]"
            @update:model-value="emit('update:state', control.id, $event)"
          />

          <ControlSelect
            v-else-if="control.type === 'select'"
            :title="control.title"
            :model-value="state[control.id]"
            :values="control.values ?? []"
            :error="errors[control.id]"
            @update:model-value="emit('update:state', control.id, $event)"
          />

          <ControlRadio
            v-else-if="control.type === 'radio'"
            :id="control.id"
            :title="control.title"
            :model-value="state[control.id]"
            :values="control.values ?? []"
            @update:model-value="emit('update:state', control.id, $event)"
          />

          <ControlButtonBar
            v-else-if="control.type === 'button_bar'"
            :buttons="control.buttons ?? []"
            :state="state"
            @action="(id, handler) => emit('action', id, handler)"
          />

          <ControlKeyValue
            v-else-if="control.type === 'keyvalue'"
            :title="control.title"
            :key-title="control.key_title"
            :key-header="control.key_header"
            :value-title="control.value_title"
            :value-header="control.value_header"
            :model-value="state[control.id] ?? []"
            @update:model-value="emit('update:state', control.id, $event)"
          />
        </div>

      </template>
    </div>
  </div>
</template>
