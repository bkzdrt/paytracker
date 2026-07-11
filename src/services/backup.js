import { dumpAll, restoreAll } from './storage'

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

export function backupText() {
  return JSON.stringify(dumpAll(), null, 2)
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// Export cascade: native share sheet (works in mobile browsers and lets the
// user save to Files or send to a chat) → plain download (desktop).
// In-app webviews (e.g. Telegram) silently ignore downloads — for those the
// UI offers the copy-as-text path instead.
export async function exportBackup() {
  const json = backupText()
  const filename = `paytracker-backup-${stamp()}.json`
  const file = new File([json], filename, { type: 'application/json' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'PayTracker' })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled'
      // fall through to download
    }
  }
  download(new Blob([json], { type: 'application/json' }), filename)
  return 'downloaded'
}

export function restoreFromText(text) {
  restoreAll(JSON.parse(text))
}

// File-picker import. The input must be in the DOM for some webviews.
export function importJSON() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json,text/plain'
    input.style.cssText = 'position:fixed;left:-9999px'
    document.body.appendChild(input)
    const cleanup = () => document.body.removeChild(input)
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { cleanup(); resolve(false); return }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          restoreFromText(reader.result)
          cleanup()
          resolve(true)
        } catch (e) {
          cleanup()
          reject(e)
        }
      }
      reader.onerror = () => { cleanup(); reject(reader.error) }
      reader.readAsText(file)
    }
    input.oncancel = () => { cleanup(); resolve(false) }
    input.click()
  })
}
