<script setup lang="ts">
import type { Control } from '../types/schema'
import ControlText from './controls/ControlText.vue'
import ControlBoolean from './controls/ControlBoolean.vue'
import ControlNumber from './controls/ControlNumber.vue'
import ControlNumberSpinner from './controls/ControlNumberSpinner.vue'
import ControlSelect from './controls/ControlSelect.vue'
import ControlRadio from './controls/ControlRadio.vue'
import ControlButtonBar from './controls/ControlButtonBar.vue'
import ControlKeyValue from './controls/ControlKeyValue.vue'

defineProps<{
  title?: string
  controls: Control[]
  state: Record<string, any>
  errors: Readonly<Record<string, string>>
}>()

const emit = defineEmits<{
  'update:state': [id: string, value: any]
  action: [id: string, handler: string]
}>()
</script>

<template>
  <div class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
    <div v-if="title" class="px-4 py-2 bg-gray-50 border-b border-gray-200">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">{{ title }}</h3>
    </div>
    <div class="p-4 flex flex-col gap-4">
      <template v-for="control in controls" :key="control.id">

        <ControlText
          v-if="control.type === 'text'"
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

      </template>
    </div>
  </div>
</template>
