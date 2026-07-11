// Vibration API — silently ignored where unsupported (iOS Safari, desktop)
function vibrate(pattern) {
  try { navigator.vibrate?.(pattern) } catch { /* noop */ }
}

export const haptics = {
  light: () => vibrate(8),
  medium: () => vibrate(16),
  success: () => vibrate([10, 40, 14]),
}
