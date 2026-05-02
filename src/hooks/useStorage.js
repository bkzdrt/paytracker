import { useState, useEffect, useCallback } from 'react'
import { storage, daysMonthKey, monthsYearKey, allMonthStorageKeys } from '../utils/storage'

export const DEFAULT_SETTINGS = {
  currency: 'KRW',
  laborLaw: 'KR',
  rates: {},
  allowances: { job: 200000, seniority: 30000, bonus: 256000, bonusEnabled: true, vacationTotal: 15, bonusMonths: [3, 6, 9, 12] },
  weekTemplate: {
    '1': { type: '주간', overtime: 0 },
    '2': { type: '주간', overtime: 0 },
    '3': { type: '주간', overtime: 0 },
    '4': { type: '주간', overtime: 0 },
    '5': { type: '주간', overtime: 0 },
    '6': { type: '쉬는 날', overtime: 0 },
    '0': { type: '쉬는 날', overtime: 0 },
  },
  holidayRates: { weekdayBase: 1.5, weekdayOvertime: 2.0, weekendBase: 1.5, weekendOvertime: 2.0 },
  nightShift: { bonusMultiplier: 0.5, bonusHours: 7.5, overtimeMultiplier: 2.0 },
  newYearPromptShown: String(new Date().getFullYear()),
}

// Migrate from old flat localStorage format (pt_days, pt_months) to new per-month/per-year keys.
// Runs regardless of cloud vs fallback — handles both the initial cloud migration and
// the fallback key-format upgrade.
async function migrateFromLegacy() {
  let rawSettings
  try { rawSettings = localStorage.getItem('pt_settings') } catch { return null }
  if (!rawSettings) return null

  let settingsData
  try { settingsData = JSON.parse(rawSettings) } catch { return null }

  // Migrate days: flat {dateStr: dayData} → per-month chunks
  try {
    const oldDays = JSON.parse(localStorage.getItem('pt_days') || '{}')
    const byMonth = {}
    for (const [dateStr, dayData] of Object.entries(oldDays)) {
      const key = daysMonthKey(dateStr)
      if (!byMonth[key]) byMonth[key] = {}
      byMonth[key][dateStr] = dayData
    }
    for (const [key, val] of Object.entries(byMonth)) {
      await storage.set(key, val)
    }
  } catch {}

  // Migrate months: flat {"2026-05": {net}} → per-year {"months_2026": {"2026-05": {net}}}
  try {
    const oldMonths = JSON.parse(localStorage.getItem('pt_months') || '{}')
    const byYear = {}
    for (const [monthKey, data] of Object.entries(oldMonths)) {
      const key = monthsYearKey(monthKey)
      if (!byYear[key]) byYear[key] = {}
      byYear[key][monthKey] = data
    }
    for (const [key, val] of Object.entries(byYear)) {
      await storage.set(key, val)
    }
  } catch {}

  // Save settings under new key and clear old keys
  await storage.set('pt_settings', settingsData)
  try {
    localStorage.removeItem('pt_settings')
    localStorage.removeItem('pt_days')
    localStorage.removeItem('pt_months')
  } catch {}

  return settingsData
}

export function useStorage() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettingsState] = useState(null)
  const [days, setDaysState] = useState({})
  const [months, setMonthsState] = useState({})

  useEffect(() => {
    const year = new Date().getFullYear()

    async function init() {
      // 1. Try primary storage (cloud or local new-format)
      let settingsData = await storage.get('pt_settings')

      // 2. Nothing found → attempt legacy migration
      if (!settingsData) {
        settingsData = await migrateFromLegacy()
      }

      // 3. Load current year's days (12 month keys) and month-net data
      const [daysResult, monthsData] = await Promise.all([
        storage.getMany(allMonthStorageKeys(year)),
        storage.get(monthsYearKey(String(year))),
      ])

      // Flatten per-month chunks into one days object
      const daysFlat = {}
      for (const chunk of Object.values(daysResult)) {
        if (chunk) Object.assign(daysFlat, chunk)
      }

      setSettingsState(settingsData)
      setDaysState(daysFlat)
      setMonthsState(monthsData || {})
      setLoading(false)
    }

    init().catch(() => setLoading(false))
  }, [])

  const setSettings = useCallback((updater) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      storage.set('pt_settings', next)
      return next
    })
  }, [])

  const setDay = useCallback((dateStr, dayData) => {
    setDaysState(prev => {
      const next = { ...prev, [dateStr]: dayData }
      const mPrefix = dateStr.slice(0, 7) // "2026-05"
      const chunk = Object.fromEntries(
        Object.entries(next).filter(([k]) => k.startsWith(mPrefix))
      )
      storage.set(daysMonthKey(dateStr), chunk)
      return next
    })
  }, [])

  const deleteDay = useCallback((dateStr) => {
    setDaysState(prev => {
      const next = { ...prev }
      delete next[dateStr]
      const mPrefix = dateStr.slice(0, 7)
      const chunk = Object.fromEntries(
        Object.entries(next).filter(([k]) => k.startsWith(mPrefix))
      )
      storage.set(daysMonthKey(dateStr), chunk)
      return next
    })
  }, [])

  const setMonth = useCallback((monthKey, data) => {
    setMonthsState(prev => {
      const next = { ...prev, [monthKey]: data }
      const yearPrefix = monthKey.slice(0, 4)
      const yearData = Object.fromEntries(
        Object.entries(next).filter(([k]) => k.startsWith(yearPrefix))
      )
      storage.set(monthsYearKey(monthKey), yearData)
      return next
    })
  }, [])

  const initSettings = useCallback((initial) => {
    const merged = { ...DEFAULT_SETTINGS, ...initial }
    storage.set('pt_settings', merged)
    setSettingsState(merged)
  }, [])

  const clearYear = useCallback((year) => {
    const prefix = String(year)
    const keysToRemove = [...allMonthStorageKeys(year), monthsYearKey(prefix)]
    storage.removeMany(keysToRemove)
    setDaysState(prev =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix)))
    )
    setMonthsState(prev =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix)))
    )
  }, [])

  return { loading, settings, days, months, setSettings, setDay, deleteDay, setMonth, initSettings, clearYear, DEFAULT_SETTINGS }
}
