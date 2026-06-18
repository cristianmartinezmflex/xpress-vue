<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const managers = [
  {
    key:        'example',
    title:      'Example',
    icon:       '🧪',
    badge:      'Demo',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    key:        'galaxy-rest',
    title:      'Galaxy REST',
    icon:       '🔗',
    badge:      'Data Manager',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    key:        'on-guard',
    title:      'OnGuard',
    icon:       '🛡️',
    badge:      'Data Manager',
    badgeColor: 'bg-green-100 text-green-700',
  },
]
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-10">

    <!-- Header -->
    <div class="max-w-4xl mx-auto mb-10">
      <h1 class="text-2xl font-bold text-gray-900">XPressEntry</h1>
      <p class="mt-1 text-sm text-gray-500">Select a data manager to configure.</p>
    </div>

    <!-- Cards -->
    <div class="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <button
        v-for="dm in managers"
        :key="dm.key"
        type="button"
        class="group text-left bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md hover:border-blue-300 transition cursor-pointer"
        @click="router.push(`/form/${dm.key}`)"
      >
        <!-- Icon + badge -->
        <div class="flex items-start justify-between">
          <span class="text-3xl">{{ dm.icon }}</span>
          <span class="text-xs font-medium px-2 py-1 rounded-full" :class="dm.badgeColor">
            {{ dm.badge }}
          </span>
        </div>

        <!-- Title -->
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition">
            {{ dm.title }}
          </h2>
        </div>

        <!-- CTA -->
        <div class="flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
          Configure
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>

  </div>
</template>
