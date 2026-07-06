<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useCentrifugo } from '../../composables/useCentrifugo'
import type { DmLogEntry } from '../../composables/useCentrifugo'

const props = defineProps<{
  guid?:        string
  serviceBase?: string
}>()

const logs       = ref<DmLogEntry[]>([])
const logEl      = ref<HTMLDivElement | null>(null)
const autoScroll = ref(true)

let stopStream: (() => void) | null = null

onMounted(() => {
  const { subscribe } = useCentrifugo()
  stopStream = subscribe(props.guid, entry => {
    logs.value.push(entry)
    if (autoScroll.value) {
      nextTick(() => {
        if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
      })
    }
  })
})

onUnmounted(() => stopStream?.())

function clearLogs() { logs.value = [] }

function lineClass(entry: DmLogEntry): string {
  const level = (entry.level ?? '').toUpperCase()
  const type  = (entry.type  ?? '').toUpperCase()
  if (level === 'ERROR'   || type === 'ERROR')   return 'text-red-400'
  if (level === 'WARNING' || type === 'WARNING' || level === 'WARN' || type === 'WARN')
    return 'text-yellow-400'
  return 'text-green-400'
}
</script>

<template>
  <div class="flex flex-col gap-1" style="height: 320px;">
    <div class="flex items-center gap-3">
      <label class="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
        <input v-model="autoScroll" type="checkbox" class="cursor-pointer" />
        Auto-scroll
      </label>
      <button
        type="button"
        class="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition"
        @click="clearLogs"
      >
        Clear
      </button>
    </div>

    <div
      ref="logEl"
      class="flex-1 w-full overflow-y-auto rounded-lg border border-gray-200 bg-gray-950 font-mono text-xs p-3 leading-relaxed"
    >
      <div v-if="logs.length === 0" class="text-gray-600">Waiting for sync events...</div>
      <div
        v-for="(entry, i) in logs"
        :key="i"
        :class="lineClass(entry)"
      >
        [{{ entry.timestamp }}] [{{ entry.type }}] {{ entry.message }}
      </div>
    </div>
  </div>
</template>
