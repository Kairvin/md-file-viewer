/**
 * Global In-App Alert System
 * Dispatches software interface alert modals to completely replace browser alert() dialogs.
 */

export function showInAppAlert(message, title = 'Notice', variant = 'warning', confirmLabel = 'Got it') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app-alert', {
        detail: {
          message: typeof message === 'string' ? message : String(message),
          title,
          variant,
          confirmLabel
        }
      })
    );
  }
}
