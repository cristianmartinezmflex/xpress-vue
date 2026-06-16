<script setup lang="ts">
import { ref } from 'vue'
import FormRenderer from '@/features/form-renderer/components/FormRenderer.vue'
import type { FormSchema } from '@/features/form-renderer/types/schema'
import schemaJson from '@/data/example.json'

const schema = ref<FormSchema>(schemaJson as FormSchema)

const actions: Record<string, () => void> = {
  testConnect: () => alert('Test Connect: Connection successful!'),
  setDefaults: () => alert('Defaults: All values have been reset to defaults.'),
}

function handleAction(_id: string, handler: string) {
  actions[handler]?.()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <FormRenderer :schema="schema" @action="handleAction" />
  </div>
</template>
