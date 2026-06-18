<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormRenderer from '@/features/form-renderer/components/FormRenderer.vue'
import type { FormSchema } from '@/features/form-renderer/types/schema'

const route  = useRoute()
const router = useRouter()

const schema    = ref<FormSchema | null>(null)
const loading   = ref(true)
const notFound  = ref(false)

const schemaMap: Record<string, () => Promise<any>> = {
  'example':     () => import('@/data/example.json'),
  'galaxy-rest': () => import('@/data/galaxy-rest.json'),
  'on-guard':    () => import('@/data/on-guard.json'),
}

const title = computed(() => {
  const map: Record<string, string> = {
    'example':     'Example',
    'galaxy-rest': 'Galaxy REST Data Manager',
    'on-guard':    'OnGuard Data Manager',
  }
  return map[route.params.schema as string] ?? 'Form'
})

async function loadSchema(key: string) {
  loading.value  = true
  notFound.value = false
  schema.value   = null

  const loader = schemaMap[key]
  if (!loader) { notFound.value = true; loading.value = false; return }

  const mod    = await loader()
  schema.value = mod.default as FormSchema
  loading.value = false
}

watch(() => route.params.schema, (key) => loadSchema(key as string), { immediate: true })

const actions: Record<string, () => void> = {
  testConnect:        () => alert('Test Connect: Connection successful!'),
  setDefaults:        () => alert('Defaults: All values reset to defaults.'),
  save:               () => alert('OK: Settings saved.'),
  checkSubscriptions: () => alert('Checking XPressEntry Subscriptions...'),
  deleteSubscription: () => alert('Current Subscription deleted.'),
  updateSegmentList:  () => alert('Segment list updated.'),
  updatePanelList:    () => alert('Panel list updated.'),
  createLogicalSource:() => alert('Logical Source and Readers created.'),
}

function handleAction(_id: string, handler: string) {
  actions[handler]?.()
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Header -->
    <div class="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
      <button
        type="button"
        class="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 text-gray-500 transition cursor-pointer"
        title="Back to Home"
        @click="router.push('/')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-base font-semibold text-gray-800">{{ title }}</h1>
    </div>

    <!-- States -->
    <div v-if="loading" class="flex flex-1 items-center justify-center text-gray-400 text-sm">
      Loading...
    </div>

    <div v-else-if="notFound" class="flex flex-1 items-center justify-center text-red-400 text-sm">
      Schema not found.
    </div>

    <FormRenderer
      v-else-if="schema"
      :schema="schema"
      class="flex-1 overflow-hidden"
      @action="handleAction"
    />

  </div>
</template>
