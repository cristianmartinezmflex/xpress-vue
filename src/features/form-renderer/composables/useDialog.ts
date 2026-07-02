import { reactive } from 'vue'

interface DialogState {
  visible: boolean
  success: boolean
  title: string
  message: string
}

const state = reactive<DialogState>({
  visible: false,
  success: true,
  title: '',
  message: '',
})

export function useDialog() {
  function show(opts: { success: boolean; title: string; message: string }) {
    state.success = opts.success
    state.title   = opts.title
    state.message = opts.message
    state.visible = true
  }

  function close() {
    state.visible = false
  }

  return { state, show, close }
}
