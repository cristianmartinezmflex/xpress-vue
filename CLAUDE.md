# Claude Instructions — xpress-vue

## Project
Vue 3 frontend for XPressEntry. Stack: Vue 3.5 + Vite 7 + TailwindCSS 4 + Pinia + Vue Router 4 + TypeScript.

## Architecture
Feature-based modular structure. Each feature is self-contained under `src/features/<name>/`.

| Folder | Purpose |
|--------|---------|
| `src/features/` | Feature modules (components, composables, stores, views per feature) |
| `src/components/ui/` | Shared base UI primitives |
| `src/components/layout/` | Layout components |
| `src/composables/` | Shared composables |
| `src/stores/` | Global Pinia stores |
| `src/services/` | HTTP / API layer |
| `src/types/` | TypeScript interfaces and types |
| `src/utils/` | Pure utility functions |
| `src/views/` | Top-level route pages |
| `src/router/` | Vue Router configuration |
| `src/layouts/` | Page layout wrappers |

## Conventions
- Always use `<script setup lang="ts">` (Composition API only, no Options API)
- Path aliases: `@/` maps to `src/`. Use aliases in all imports.
- TailwindCSS v4: no config file, just `@import "tailwindcss"` in CSS.
- State management: Pinia setup stores (not options stores).
- HTTP: always go through `src/services/http.ts` — never use raw fetch or axios directly.

## Git Policy
Do not create git commits unless the user explicitly asks.
