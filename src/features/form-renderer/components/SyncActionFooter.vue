<script setup lang="ts">
/**
 * SyncActionFooter — the always-visible, full-width page footer shared by every Data Manager: the live
 * sync log plus the row of "run now" sync buttons.
 *
 * These are common to all DMs and must stay pinned to the bottom of the page regardless of the active
 * tab, so — unlike the rest of the form — they are intentionally NOT schema-driven. The button
 * definitions (ids, actions, tooltips) live here in the frontend and are dispatched through the same
 * generic `dm_shared_runAction` handler as before (via the `action` event the parent already wires).
 */
import type { Button } from '../types/schema'
import ControlLogView from './controls/ControlLogView.vue'
import ControlButtonBar from './controls/ControlButtonBar.vue'

defineProps<{
  guid?:           string
  serviceBase?:    string
  activeActionId?: string | null
}>()
const emit = defineEmits<{ action: [id: string, handler: string, payload?: unknown] }>()

// The six "run now" sync actions (WinForm parity). Plain REST buttons: verb + action URL ({dmId} is
// substituted with the DM guid by dm_shared_runAction). All are fireAndForget: they only TRIGGER an
// async sync, so no "Completed successfully" dialog fires on click. Tooltips match the WinForm verbatim.
const SYNC_NOW_BUTTONS: Button[] = [
  {
    id: 'btn_send_activities', title: 'Send XPressEntry Activities Now', verb: 'POST',
    action: '/api/data-managers/send-activity-sync', fireAndForget: true,
    tooltip: 'Push all XPressEntry scans to the external system',
  },
  {
    id: 'btn_activity_now', title: 'Download Activity Now', verb: 'POST',
    action: '/api/data-managers/{dmId}/run-sync?syncType=PULL_ACTIVITY_SYNC', fireAndForget: true,
    tooltip: 'Update XPressEntry Occupancy by pulling and saving the latest scan activity records from the external system. "Pull Data Manager Activities into XPressEntry" must be enabled under "Sync Options"',
  },
  {
    id: 'btn_occupancy_now', title: 'Occupancy Sync Now', verb: 'POST',
    action: '/api/data-managers/{dmId}/run-sync?syncType=OCCUPANCY_SYNC', fireAndForget: true,
    tooltip: 'Update XPressEntry Occupancy by pulling only the latest zone where each user has been. "Pull DataManager Occupancy" must be enabled under "Sync Options"',
  },
  {
    id: 'btn_partial_now', title: 'Partial Sync Now', verb: 'POST',
    action: '/api/data-managers/{dmId}/run-sync?syncType=PARTIAL_SYNC', fireAndForget: true,
    tooltip: "Pull the latest table changes from the external system. Partial syncs are incremental changes to Users and Badges, if allowed by the external system's API",
  },
  {
    id: 'btn_full_now', title: 'Full Sync Now', verb: 'POST',
    action: '/api/data-managers/{dmId}/run-sync?syncType=FULL_SYNC', fireAndForget: true,
    tooltip: "Pull all relevant data from the external system to compare against XPressEntry's current data. Any changes made on the external system will be applied in XPressEntry",
  },
  {
    id: 'btn_custom_now', title: 'Custom Sync Now', verb: 'POST',
    action: '/api/data-managers/{dmId}/run-sync?syncType=CUSTOM_SYNC', fireAndForget: true,
    tooltip: 'Set the tables to pull from the external system in the "Custom Sync" tab',
  },
]
</script>

<template>
  <!-- Compact footer: log on the LEFT, "run now" buttons on the RIGHT (side by side on wide screens,
       stacked on narrow ones), and a shorter log so the form isn't covered on small/laptop monitors. -->
  <footer class="shrink-0 w-full border-t border-gray-200 bg-white px-6 py-3">
    <div class="flex flex-col lg:flex-row gap-4 lg:items-stretch">
      <div class="flex-1 min-w-0">
        <ControlLogView :guid="guid" :service-base="serviceBase" height-class="h-36" />
      </div>
      <div class="lg:w-[26rem] shrink-0">
        <ControlButtonBar
          :buttons="SYNC_NOW_BUTTONS"
          :active-action-id="activeActionId"
          @action="(id, handler, payload) => emit('action', id, handler, payload)"
        />
      </div>
    </div>
  </footer>
</template>
