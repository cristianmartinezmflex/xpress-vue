<script setup lang="ts">
/**
 * ControlShowcase — renders a single schema control exactly as the app would (via FormSection)
 * next to the JSON fragment you drop into a Data Manager schema to use it, plus the live value.
 * Used by Controls.stories.ts to document every control type.
 */
import { reactive, computed } from 'vue'
import FormSection from '@/features/form-renderer/components/FormSection.vue'
import type { Control } from '@/features/form-renderer/types/schema'

const props = defineProps<{
  control: Control
  /** Optional seed values for the form state (e.g. a preset value or related fields). */
  initial?: Record<string, any>
  /** Extra note shown under the title. */
  note?: string
}>()

const state = reactive<Record<string, any>>({ ...(props.initial ?? {}) })
if (props.control.default !== undefined && state[props.control.id] === undefined) {
  state[props.control.id] = props.control.default
}
const errors = reactive<Record<string, string>>({})
const columns = computed(() => [{ controls: [props.control] }])
const snippet = computed(() => JSON.stringify(props.control, null, 2))
const liveValue = computed(() => JSON.stringify(state, null, 2))

function onUpdate(id: string, value: any) {
  state[id] = value
}
</script>

<template>
  <div class="max-w-3xl flex flex-col gap-5 p-2">
    <p v-if="note" class="text-sm text-gray-500">{{ note }}</p>

    <!-- Rendered control (as it appears in the app) -->
    <section>
      <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Preview</h3>
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <FormSection
          :columns="columns"
          :state="state"
          :errors="errors"
          :enable="true"
          :display="true"
          service-base="http://localhost:30011"
          @update:state="onUpdate"
        />
      </div>
    </section>

    <!-- JSON fragment to paste into the DM schema -->
    <section>
      <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">JSON fragment</h3>
      <pre class="rounded-lg bg-gray-900 text-gray-100 text-xs leading-relaxed p-4 overflow-x-auto"><code>{{ snippet }}</code></pre>
    </section>

    <!-- Live form state -->
    <section>
      <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Live value</h3>
      <pre class="rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-xs leading-relaxed p-4 overflow-x-auto"><code>{{ liveValue }}</code></pre>
    </section>
  </div>
</template>
