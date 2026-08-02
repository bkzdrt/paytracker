// Home-screen install ("Add to Home Screen").
//
// Chrome/Edge fire `beforeinstallprompt` once, early — often before React has
// mounted — so the event is captured at module load and replayed to whoever
// subscribes later. Browsers that never fire it (iOS Safari, in-app webviews)
// fall back to written instructions in the UI.

let deferred = null
const listeners = new Set()
const emit = () => { for (const fn of listeners) fn() }

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

export function subscribeInstall(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function canInstall() {
  return deferred !== null
}

// The captured event is single-use: after prompt() it is dropped and the UI
// falls back to the manual instructions until the browser offers it again.
export async function promptInstall() {
  if (!deferred) return 'unavailable'
  const evt = deferred
  deferred = null
  emit()
  try {
    evt.prompt()
    const { outcome } = await evt.userChoice
    return outcome // 'accepted' | 'dismissed'
  } catch {
    return 'dismissed'
  }
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true
}

// iPadOS 13+ reports itself as "MacIntel", hence the touch-points check
export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
