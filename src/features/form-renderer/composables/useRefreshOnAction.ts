import { onMounted, onBeforeUnmount } from 'vue'

/**
 * The button-completion half of `refreshOnControlChange`.
 *
 * `refreshOnControlChange` lists ids that should make a dynamic-option control (Select / MultiSelect)
 * re-fetch. Those ids can be:
 *   - another CONTROL's id → re-fetch when its VALUE changes (handled by the debounced refreshTrigger), or
 *   - a BUTTON's id        → re-fetch when that button's ACTION completes (handled here).
 *
 * On a successful button action, `dm_shared_runAction` broadcasts `dm:action-done` carrying the button id.
 * This hook re-fetches when that id is among the ones the control declares in `refreshOnControlChange`.
 * (Unifies what used to be the separate `RefreshOnSuccess` button flag — buttons no longer need it.)
 */
export function useRefreshOnAction(getRefreshOnControlChange: () => string | undefined, reload: () => void): void {
  function onActionDone(e: Event): void {
    const id = (e as CustomEvent<{ id?: string }>).detail?.id
    if (!id) return
    const ids = (getRefreshOnControlChange() ?? '')
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (ids.includes(id)) reload()
  }
  onMounted(() => window.addEventListener('dm:action-done', onActionDone))
  onBeforeUnmount(() => window.removeEventListener('dm:action-done', onActionDone))
}
