import { reactive } from 'vue'

interface DialogState {
  visible: boolean
  success: boolean
  title: string
  message: string
  mode: 'message' | 'confirm'
  confirmLabel: string
  cancelLabel: string
}

const state = reactive<DialogState>({
  visible: false,
  success: true,
  title: '',
  message: '',
  mode: 'message',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
})

// Pending resolver for the Promise returned by confirm().
let resolver: ((result: boolean) => void) | null = null

export function useDialog() {
  // Message dialog: a single OK button, no return value.
  function show(opts: { success: boolean; title: string; message: string }) {
    state.success = opts.success
    state.title   = opts.title
    state.message = opts.message
    state.mode    = 'message'
    state.visible = true
  }

  // Confirm dialog: Cancel / Confirm buttons. Resolves true if confirmed, false otherwise
  // (Cancel, backdrop click, or dismiss).
  function confirm(opts: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    success?: boolean
  }): Promise<boolean> {
    state.success      = opts.success ?? false
    state.title        = opts.title
    state.message      = opts.message
    state.confirmLabel = opts.confirmLabel ?? 'Confirm'
    state.cancelLabel  = opts.cancelLabel ?? 'Cancel'
    state.mode         = 'confirm'
    state.visible      = true
    return new Promise<boolean>((resolve) => { resolver = resolve })
  }

  // Hides the dialog and resolves any pending confirm() with the given result.
  function resolve(result: boolean) {
    state.visible = false
    if (resolver) {
      const r = resolver
      resolver = null
      r(result)
    }
  }

  // Dismiss (OK on a message dialog, or backdrop click) — counts as "not confirmed".
  function close() {
    resolve(false)
  }

  return { state, show, confirm, resolve, close }
}
