import WebApp from '@twa-dev/sdk'

function checkCloudAvailable() {
  try { return typeof WebApp?.CloudStorage?.getItem === 'function' }
  catch { return false }
}

const USE_CLOUD = checkCloudAvailable()

function parseVal(v) {
  try { return (v && v !== '') ? JSON.parse(v) : null } catch { return null }
}

const cloud = {
  get(key) {
    return new Promise(resolve =>
      WebApp.CloudStorage.getItem(key, (err, val) =>
        resolve(err ? null : parseVal(val))
      )
    )
  },
  set(key, value) {
    return new Promise(resolve =>
      WebApp.CloudStorage.setItem(key, JSON.stringify(value), () => resolve())
    )
  },
  remove(key) {
    return new Promise(resolve =>
      WebApp.CloudStorage.removeItem(key, () => resolve())
    )
  },
  getMany(keys) {
    if (!keys.length) return Promise.resolve({})
    return new Promise(resolve =>
      WebApp.CloudStorage.getItems(keys, (err, vals) => {
        if (err) { resolve(Object.fromEntries(keys.map(k => [k, null]))); return }
        resolve(Object.fromEntries(keys.map(k => [k, parseVal(vals[k])])))
      })
    )
  },
  removeMany(keys) {
    if (!keys.length) return Promise.resolve()
    return new Promise(resolve =>
      WebApp.CloudStorage.removeItems(keys, () => resolve())
    )
  },
}

const local = {
  get(key) {
    try { return Promise.resolve(parseVal(localStorage.getItem(key))) }
    catch { return Promise.resolve(null) }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
    return Promise.resolve()
  },
  remove(key) {
    try { localStorage.removeItem(key) } catch {}
    return Promise.resolve()
  },
  getMany(keys) {
    const result = {}
    keys.forEach(k => {
      try { result[k] = parseVal(localStorage.getItem(k)) }
      catch { result[k] = null }
    })
    return Promise.resolve(result)
  },
  removeMany(keys) {
    keys.forEach(k => { try { localStorage.removeItem(k) } catch {} })
    return Promise.resolve()
  },
}

export const storage = USE_CLOUD ? cloud : local

// "2026-05-15" → "days_2026_05"
export function daysMonthKey(dateStr) {
  return `days_${dateStr.slice(0, 4)}_${dateStr.slice(5, 7)}`
}

// "2026" or "2026-05" → "months_2026"
export function monthsYearKey(yearOrMonthKey) {
  return `months_${String(yearOrMonthKey).slice(0, 4)}`
}

// All 12 storage keys for a year's days
export function allMonthStorageKeys(year) {
  return Array.from({ length: 12 }, (_, i) =>
    `days_${year}_${String(i + 1).padStart(2, '0')}`
  )
}
