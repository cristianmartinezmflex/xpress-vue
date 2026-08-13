<script setup lang="ts">
import { computed } from 'vue'
import type { Column, Control, EnableProp, DisplayProp } from '../types/schema'
import { evaluateEnable, evaluateDisplay } from '../composables/useDisabled'
import ControlText from './controls/ControlText.vue'
import ControlPassword from './controls/ControlPassword.vue'
import ControlBoolean from './controls/ControlBoolean.vue'
import ControlNumber from './controls/ControlNumber.vue'
import ControlNumberSpinner from './controls/ControlNumberSpinner.vue'
import ControlSelect        from './controls/ControlSelect.vue'
import ControlSelectDynamic from './controls/ControlSelectDynamic.vue'
import ControlRadio from './controls/ControlRadio.vue'
import ControlButtonBar from './controls/ControlButtonBar.vue'
import ControlKeyValue             from './controls/ControlKeyValue.vue'
import ControlCustomFields         from './controls/ControlCustomFields.vue'
import ControlLogView              from './controls/ControlLogView.vue'
import ControlMultiselectDynamic   from './controls/ControlMultiselectDynamic.vue'
import ControlSocketInterfaces     from './controls/ControlSocketInterfaces.vue'
import ControlIpBadgeMappings      from './controls/ControlIpBadgeMappings.vue'
import ControlRioDevices           from './controls/ControlRioDevices.vue'
import ControlSiteTimezones        from './controls/ControlSiteTimezones.vue'
import ControlCheckboxMultiselect   from './controls/ControlCheckboxMultiselect.vue'

const props = defineProps<{
  title?: string
  columns: Column[]
  state: Record<string, any>
  errors: Readonly<Record<string, string>>
  enable?: EnableProp
  display?: DisplayProp
  guid?:        string
  serviceBase?: string
}>()

const emit = defineEmits<{
  'update:state': [id: string, value: any]
  action: [id: string, handler: string, payload?: unknown]
}>()

const sectionEnabled  = computed(() => evaluateEnable(props.enable, props.state))
const sectionVisible  = computed(() => evaluateDisplay(props.display, props.state))

// Column layout: a section with N columns (2–4 supported) renders as an N-wide grid on
// desktop and collapses to a single column on small screens. Classes are written out in full
// so Tailwind's scanner picks them up (no dynamic class-name interpolation).
const columnLayoutClass = computed(() => {
  const n = Math.min(Math.max(props.columns.length, 1), 4)
  return {
    1: 'flex flex-col gap-4',
    2: 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4',
  }[n]!
})

function isColumnEnabled(col: Column): boolean {
  return sectionEnabled.value && evaluateEnable(col.enable, props.state)
}

function isColumnVisible(col: Column): boolean {
  return evaluateDisplay(col.display, props.state)
}

function isControlEnabled(control: Control, col: Column): boolean {
  return isColumnEnabled(col) && evaluateEnable(control.enable, props.state)
}

function isControlVisible(control: Control): boolean {
  return evaluateDisplay(control.display, props.state)
}
</script>

<template>
  <div
    v-show="sectionVisible"
    class="rounded-lg border border-gray-200 bg-white shadow-xp overflow-hidden transition-opacity"
    :class="!sectionEnabled ? 'opacity-50' : ''"
  >
    <div v-if="title" class="px-4 py-2 bg-gray-50 border-b border-gray-200">
      <h3 class="text-sm font-semibold text-xp-label uppercase tracking-wide">{{ title }}</h3>
    </div>

    <div
      class="p-4"
      :class="[
        columnLayoutClass,
        !sectionEnabled ? 'pointer-events-none select-none' : ''
      ]"
    >
      <div
        v-for="(col, colIdx) in columns"
        v-show="isColumnVisible(col)"
        :key="colIdx"
        class="flex flex-col gap-4 transition-opacity"
        :class="!isColumnEnabled(col) && sectionEnabled ? 'opacity-50 pointer-events-none select-none' : ''"
      >
        <template v-for="control in col.controls" :key="control.id">
          <div
            v-show="isControlVisible(control)"
            class="transition-opacity"
            :class="!isControlEnabled(control, col) && isColumnEnabled(col) && sectionEnabled ? 'opacity-50 pointer-events-none select-none' : ''"
          >
            <ControlPassword
              v-if="control.type === 'password'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :error="errors[control.id]"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <div v-else-if="control.type === 'text' && control.value_from" class="text-sm text-gray-600">
              <span class="font-semibold text-xp-label">{{ control.title }}:</span>
              {{ state[control.value_from] ?? '' }}
            </div>

            <ControlText
              v-else-if="control.type === 'text'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :error="errors[control.id]"
              :disabled="control.disabled"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlBoolean
              v-else-if="control.type === 'boolean'"
              :title="control.title"
              :model-value="control.value_from
                ? (control.invert ? !state[control.value_from] : !!state[control.value_from])
                : (state[control.id] ?? false)"
              :disabled="control.disabled || !isControlEnabled(control, col)"
              @update:model-value="control.inverts
                ? emit('update:state', control.inverts, !$event)
                : emit('update:state', control.id, $event)"
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

            <ControlSelectDynamic
              v-else-if="control.type === 'select_dynamic'"
              :title="control.title"
              :model-value="state[control.id] ?? -1"
              :load-from="control.loadFrom ?? ''"
              :guid="guid"
              :service-base="serviceBase"
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

            <ControlLogView
              v-else-if="control.type === 'log_view'"
              :guid="guid"
              :service-base="serviceBase"
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

            <ControlCustomFields
              v-else-if="control.type === 'customFields'"
              :title="control.title"
              :key-title="control.key_title"
              :key-header="control.key_header"
              :value-title="control.value_title"
              :value-header="control.value_header"
              :load-from="control.loadFrom"
              :destination-load-from="control.destinationLoadFrom"
              :guid="guid"
              :service-base="serviceBase"
              :model-value="state[control.id] ?? []"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlMultiselectDynamic
              v-else-if="control.type === 'multiselect_dynamic'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :load-from="control.loadFrom ?? ''"
              :guid="guid"
              :service-base="serviceBase"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlSocketInterfaces
              v-else-if="control.type === 'socket_interfaces'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlIpBadgeMappings
              v-else-if="control.type === 'ip_badge_mappings'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlRioDevices
              v-else-if="control.type === 'rio_devices'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :buttons="control.buttons ?? []"
              @update:model-value="emit('update:state', control.id, $event)"
              @action="(id, handler, payload) => emit('action', id, handler, payload)"
            />

            <ControlSiteTimezones
              v-else-if="control.type === 'site_timezones'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :guid="guid"
              :service-base="serviceBase"
              :state="state"
              @update:model-value="emit('update:state', control.id, $event)"
            />

            <ControlCheckboxMultiselect
              v-else-if="control.type === 'checkbox_multiselect'"
              :title="control.title"
              :model-value="state[control.id] ?? ''"
              :options-key="control.optionsKey"
              :state="state"
              @update:model-value="emit('update:state', control.id, $event)"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
