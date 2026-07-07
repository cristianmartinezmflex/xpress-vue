<script setup lang="ts">
import { computed } from 'vue'
import { useCustomSyncDialog, type CustomSyncTable } from '../composables/useCustomSyncDialog'

const { state, confirm, cancel } = useCustomSyncDialog()

// LISTS enum from modDataManagerEnums.vb — value matches the VB integer
const ALL_TABLES = [
  { value:  0, label: 'ZONES' },
  { value:  1, label: 'GROUPS' },
  { value:  2, label: 'GROUPS_USERS' },
  { value:  3, label: 'GROUPS_ZONES' },
  { value:  4, label: 'USERS' },
  { value:  5, label: 'BADGES' },
  { value:  6, label: 'READERS' },
  { value:  7, label: 'COMPANIES' },
  { value:  8, label: 'DOORS' },
  { value:  9, label: 'ACTIVITIES' },
  { value: 10, label: 'PICTURES' },
  { value: 11, label: 'USERS_LAST_ZONE' },
  { value: 12, label: 'GROUPS_READERS' },
  { value: 13, label: 'TIMEZONES' },
  { value: 14, label: 'TIMEZONE_INTERVALS' },
  { value: 15, label: 'FINGERPRINTS' },
  { value: 16, label: 'BADGE_TYPES' },
  { value: 17, label: 'WATCH_LISTS' },
  { value: 18, label: 'MUSTER_ACTIVITIES' },
  { value: 19, label: 'GROUPS_HOLIDAYS' },
  { value: 20, label: 'HOLIDAYS' },
  { value: 21, label: 'UDFS' },
  { value: 22, label: 'USERS_UDFS' },
  { value: 23, label: 'ACTIVITY_FORM_FIELDS' },
  { value: 24, label: 'USERS_ZONES' },
  { value: 25, label: 'VALIDATION_MESSAGES' },
  { value: 26, label: 'VEHICLES' },
  { value: 27, label: 'VEHICLE_TYPES' },
  { value: 28, label: 'USERS_VEHICLE_TYPES' },
  { value: 29, label: 'GROUPS_VEHICLES' },
]

const AVAILABLE_TABLES = computed(() =>
  state.allowedTables
    ? ALL_TABLES.filter(t => state.allowedTables!.includes(t.label))
    : ALL_TABLES
)

function addTable() {
  const defaultTable = AVAILABLE_TABLES.value[0]?.value ?? 4
  state.tables.push({ iDMTable: defaultTable, bPartial: false })
}

function removeTable(index: number) {
  state.tables.splice(index, 1)
}

function labelFor(value: number): string {
  return ALL_TABLES.find(t => t.value === value)?.label ?? String(value)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @mousedown.self="cancel"
    >
      <div class="bg-white rounded-lg shadow-xl w-[680px] max-h-[80vh] flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h2 class="text-sm font-semibold text-gray-800">Custom Table Sync</h2>
          <button type="button" class="text-gray-400 hover:text-gray-600 cursor-pointer" @click="cancel">✕</button>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <button
            type="button"
            class="px-4 py-1.5 text-sm font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer transition"
            @click="addTable"
          >
            Add Table
          </button>
          <button
            type="button"
            class="px-4 py-1.5 text-sm font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer transition"
            @click="confirm"
          >
            Done
          </button>
        </div>

        <!-- Table rows -->
        <div class="flex-1 overflow-y-auto px-5 py-3">
          <div v-if="state.tables.length === 0" class="text-sm text-gray-400 text-center py-8">
            No tables configured. Click "Add Table" to add one.
          </div>

          <div
            v-for="(row, i) in state.tables"
            :key="i"
            class="flex items-center gap-4 mb-3"
          >
            <span class="text-sm text-gray-500 w-10">Table</span>

            <select
              v-model.number="row.iDMTable"
              class="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
            >
              <option v-for="t in AVAILABLE_TABLES" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>

            <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
              <input v-model="row.bPartial" type="checkbox" class="cursor-pointer" />
              Partial?
            </label>

            <button
              type="button"
              class="w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-700 cursor-pointer transition text-lg leading-none"
              title="Remove"
              @click="removeTable(i)"
            >
              ✕
            </button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>
