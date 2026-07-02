<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useDmLogStream } from '../../composables/useDmLogStream'
import type { DmLogEntry }  from '../../composables/useDmLogStream'

const props = defineProps<{
  guid?:        string
  serviceBase?: string
}>()

const logs       = ref<DmLogEntry[]>([])
const logEl      = ref<HTMLTextAreaElement | null>(null)
const autoScroll = ref(true)

let stopStream: (() => void) | null = null

onMounted(() => {
  stopStream = useDmLogStream(
    props.serviceBase ?? 'http://localhost:30011',
    props.guid,
    entry => {
      logs.value.push(entry)
      if (autoScroll.value) {
        nextTick(() => {
          if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
        })
      }
    }
  )
})

onUnmounted(() => stopStream?.())

function clearLogs() { logs.value = [] }

function logText(): string {
  return logs.value.map(e => `[${e.timestamp}] [${e.type}] ${e.message}`).join('\n')
}
</script>

<template>
  <div class="flex flex-col gap-1" style="height: 320px;">
    <div class="flex items-center justify-between">
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
    </div>

    <textarea
      ref="logEl"
      :value="logText()"
      readonly
      class="flex-1 w-full resize-none rounded-lg border border-gray-200 bg-gray-950 text-green-400 font-mono text-xs p-3 leading-relaxed focus:outline-none"
      placeholder="Waiting for sync events..."
    />
  </div>
</template>
