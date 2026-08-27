<script setup lang="ts">
/**
 * ControlDiagnostics — renders the schema's settings-hygiene diagnostics (Debug builds only), one row
 * per issue with its severity, code, message and the property it points at. Data comes from the
 * schema's `diagnostics` key (not from form state), threaded in via the `diagnostics` prop.
 */
import type { DiagnosticIssue } from '../../types/schema'

const props = defineProps<{
  diagnostics?: DiagnosticIssue[]
}>()

function sevClass(sev: string): string {
  const s = (sev || '').toLowerCase()
  if (s === 'error')   return 'bg-red-100 text-xp-red border-red-200'
  if (s === 'warning') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-gray-100 text-gray-600 border-gray-200'
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="!diagnostics || diagnostics.length === 0"
         class="text-sm text-xp-success border border-green-200 bg-green-50 rounded-lg px-4 py-3">
      ✓ No settings issues detected.
    </div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="(d, i) in diagnostics"
        :key="i"
        class="flex items-start gap-3 border border-gray-200 rounded-lg px-3 py-2 bg-white"
      >
        <span class="shrink-0 text-xs font-semibold uppercase px-2 py-0.5 rounded-full border" :class="sevClass(d.severity)">
          {{ d.severity }}
        </span>
        <div class="min-w-0 flex flex-col gap-0.5">
          <div class="text-sm text-gray-800">
            <span class="font-mono text-xs text-gray-400 mr-1">{{ d.code }}</span>{{ d.message }}
          </div>
          <div v-if="d.declaringType || d.propertyName || d.settingKey" class="text-xs text-gray-400 font-mono">
            <span v-if="d.declaringType">{{ d.declaringType }}<span v-if="d.propertyName">.{{ d.propertyName }}</span></span>
            <span v-if="d.settingKey"> · key: {{ d.settingKey }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
