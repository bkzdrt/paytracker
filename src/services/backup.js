import { dumpAll, restoreAll } from './storage'

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJSON() {
  const data = dumpAll()
  const stamp = new Date().toISOString().slice(0, 10)
  download(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `paytracker-backup-${stamp}.json`
  )
}

// Opens a file picker, restores the chosen backup. Resolves true on success.
export function importJSON() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(false); return }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          restoreAll(JSON.parse(reader.result))
          resolve(true)
        } catch (e) {
          reject(e)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    }
    input.click()
  })
}

export function exportCSV(days, months, year) {
  const header = 'Date,Weekday,Type,Gross,Overtime Hours,Note,Month Net\n'
  const rows = Object.keys(days)
    .filter(k => k.startsWith(String(year)))
    .sort()
    .map(dateStr => {
      const d = days[dateStr]
      const weekday = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' })
      const net = months[dateStr.slice(0, 7)]?.net ?? ''
      const note = `"${String(d.note || '').replace(/"/g, '""')}"`
      return [dateStr, weekday, d.type, d.gross ?? 0, d.overtime ?? 0, note, net].join(',')
    })
  download(
    new Blob(['﻿' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' }),
    `paytracker-${year}.csv`
  )
}
