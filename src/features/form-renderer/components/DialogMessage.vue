<script setup lang="ts">
import { useDialog } from '../composables/useDialog'

const { state, close } = useDialog()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="state.visible"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30" />

        <!-- Panel -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">

          <!-- Icon + title -->
          <div class="flex items-center gap-3">
            <div
              :class="state.success
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-600'"
              class="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
            >
              <!-- Check -->
              <svg v-if="state.success" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <!-- X -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 class="text-sm font-semibold text-gray-800">{{ state.title }}</h2>
          </div>

          <!-- Message -->
          <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{{ state.message }}</p>

          <!-- OK button -->
          <div class="flex justify-end">
            <button
              type="button"
              class="px-4 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition"
              :class="state.success
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'"
              @click="close"
            >
              OK
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
.dialog-enter-active .relative,
.dialog-leave-active .relative {
  transition: transform 0.15s ease;
}
.dialog-enter-from .relative,
.dialog-leave-to .relative {
  transform: scale(0.95);
}
</style>
