<script setup lang="ts">
/**
 * ControlRioDevices
 *
 * Renders a "rio_list" field as a list of CloudLink (RIO) devices. Each device:
 *   { id, name, server, username, password, acceptUntrustedCert, allDoorsOnline, doorList }
 * State is stored as a JSON array string so it round-trips through the API cleanly.
 *
 * Per-device action buttons (e.g. Ping, Update RIO Readers) are NOT hardcoded here —
 * they are declared in the schema JSON under the control's `buttons` and dispatched by
 * prefix like any other action. Clicking one emits `action(id, onClick, device)`, so the
 * matching DM action (e.g. genetec_updateRio) receives the device as its payload.
 */

import { ref, computed } from "vue";
import type { Button } from "../../types/schema";

interface RioDevice {
  id: number;
  name: string;
  server: string;
  username: string;
  password: string;
  acceptUntrustedCert: boolean;
  allDoorsOnline: boolean;
  doorList: string;
}

const props = defineProps<{
  title?: string;
  modelValue: string; // JSON array or empty string
  buttons?: Button[]; // per-device action buttons, from the schema JSON
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  action: [id: string, handler: string, payload?: unknown];
}>();

const expanded = ref<Set<number>>(new Set());
let nextId = 1;

const devices = computed<RioDevice[]>(() => {
  const val = props.modelValue;
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      parsed.forEach((d) => {
        if (d.id >= nextId) nextId = d.id + 1;
      });
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return [];
});

function emitDevices(next: RioDevice[]) {
  emit("update:modelValue", next.length ? JSON.stringify(next) : "");
}

function addDevice() {
  const newDev: RioDevice = {
    id: nextId++,
    name: `CloudLink ${nextId - 1}`,
    server: "",
    username: "admin",
    password: "",
    acceptUntrustedCert: false,
    allDoorsOnline: false,
    doorList: "",
  };
  emitDevices([...devices.value, newDev]);
  expanded.value = new Set([...expanded.value, newDev.id]);
}

function removeDevice(id: number) {
  emitDevices(devices.value.filter((d) => d.id !== id));
  const s = new Set(expanded.value);
  s.delete(id);
  expanded.value = s;
}

function updateField(
  id: number,
  field: keyof RioDevice,
  val: string | boolean | number,
) {
  emitDevices(
    devices.value.map((d) => (d.id === id ? { ...d, [field]: val } : d)),
  );
}

function toggleExpand(id: number) {
  const s = new Set(expanded.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  expanded.value = s;
}

// Dispatch a schema-declared button, passing the device as the action payload.
function runDeviceAction(btn: Button, dev: RioDevice) {
  emit("action", btn.id, btn.onClick, dev);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <span v-if="title" class="text-sm font-semibold text-xp-label">{{
      title
    }}</span>

    <div v-if="devices.length > 0" class="flex flex-col gap-2">
      <div
        v-for="dev in devices"
        :key="dev.id"
        class="border border-gray-200 rounded-lg overflow-hidden"
      >
        <!-- Header -->
        <div
          class="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer select-none"
          @click="toggleExpand(dev.id)"
        >
          <svg
            class="w-4 h-4 text-gray-400 shrink-0 transition-transform"
            :class="expanded.has(dev.id) ? 'rotate-90' : ''"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span class="text-sm font-semibold text-xp-label flex-1">
            {{ dev.name || dev.server || `Device ${dev.id}` }}
          </span>
          <span v-if="dev.server" class="text-xs text-gray-400">{{
            dev.server
          }}</span>
          <button
            type="button"
            class="ml-2 text-xp-red hover:text-xp-red-hover text-xs px-2"
            @click.stop="removeDevice(dev.id)"
          >
            ✕
          </button>
        </div>

        <!-- Fields -->
        <div
          v-if="expanded.has(dev.id)"
          class="p-3 border-t border-gray-100 flex flex-col gap-3"
        >
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Name</label>
              <input
                :value="dev.name"
                class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
                @input="
                  updateField(
                    dev.id,
                    'name',
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500"
                >Server (IP / Hostname)</label
              >
              <input
                :value="dev.server"
                class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
                @input="
                  updateField(
                    dev.id,
                    'server',
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Username</label>
              <input
                :value="dev.username"
                class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
                @input="
                  updateField(
                    dev.id,
                    'username',
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Password</label>
              <input
                type="password"
                :value="dev.password"
                class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary"
                @input="
                  updateField(
                    dev.id,
                    'password',
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
            </div>
          </div>

          <div class="flex items-center gap-6">
            <label
              class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="dev.acceptUntrustedCert"
                class="w-4 h-4 accent-xp-primary"
                @change="
                  updateField(
                    dev.id,
                    'acceptUntrustedCert',
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              Accept Untrusted Certificate
            </label>
            <label
              class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="dev.allDoorsOnline"
                class="w-4 h-4 accent-xp-primary"
                @change="
                  updateField(
                    dev.id,
                    'allDoorsOnline',
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              Allways Show Selected Doors Online
            </label>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500"
              >Door List (comma-separated door IDs)</label
            >
            <textarea
              :value="dev.doorList"
              rows="2"
              class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-xp-primary resize-none"
              @input="
                updateField(
                  dev.id,
                  'doorList',
                  ($event.target as HTMLTextAreaElement).value,
                )
              "
            />
          </div>

          <!-- Device actions (declared in the schema JSON) -->
          <div v-if="buttons?.length" class="flex flex-wrap gap-2 pt-1">
            <button
              v-for="btn in buttons"
              :key="btn.id"
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              :title="btn.tooltip"
              @click="runDeviceAction(btn, dev)"
            >
              {{ btn.title }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center"
    >
      No CloudLink devices configured
    </div>

    <button
      type="button"
      class="flex items-center gap-2 text-sm text-xp-primary hover:text-xp-primary-hover font-medium cursor-pointer w-fit"
      @click="addDevice"
    >
      <span class="text-lg leading-none">+</span> Add CloudLink Device
    </button>
  </div>
</template>
