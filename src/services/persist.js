// Storage durability.
//
// Everything lives in localStorage on the device. By default a browser may
// evict that data on its own when the phone runs low on space; asking for
// persistent storage takes the origin out of that eviction pool. It does NOT
// survive the user clearing site data by hand — backups are still the answer.

export async function isPersisted() {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

export async function requestPersistence() {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export function persistenceSupported() {
  return typeof navigator !== 'undefined' && !!navigator.storage?.persist
}

// Chrome decides silently from its own heuristics (installed / bookmarked /
// engaged), Firefox shows a permission prompt. Only auto-ask where the answer
// is already known to be yes, so nobody gets a prompt they did not trigger.
export async function ensurePersistenceQuietly() {
  if (!persistenceSupported()) return false
  if (await isPersisted()) return true
  try {
    const status = await navigator.permissions?.query?.({ name: 'persistent-storage' })
    if (status?.state !== 'granted') return false
  } catch {
    return false
  }
  return requestPersistence()
}

// Bytes currently used by this origin, or null when the browser won't say
export async function storageUsage() {
  try {
    const { usage } = await navigator.storage.estimate()
    return typeof usage === 'number' ? usage : null
  } catch {
    return null
  }
}
