import { useState, useCallback } from 'react'

const DEFAULT_SETTINGS = {
  currency: 'KRW',
  rates: { '2023': 11185, '2024': 11834, '2025': 13127, '2026': 13589 },
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
  newYearPromptShown: String(new Date().getFullYear()),
}

function load(key, def) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : def
  } catch { return def }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function useStorage() {
  const [settings, setSettingsState] = useState(() => load('pt_settings', null))
  const [days, setDaysState] = useState(() => load('pt_days', {}))
  const [months, setMonthsState] = useState(() => load('pt_months', {}))

  const setSettings = useCallback((updater) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save('pt_settings', next)
      return next
    })
  }, [])

  const setDay = useCallback((dateStr, dayData) => {
    setDaysState(prev => {
      const next = { ...prev, [dateStr]: dayData }
      save('pt_days', next)
      return next
    })
  }, [])

  const deleteDay = useCallback((dateStr) => {
    setDaysState(prev => {
      const next = { ...prev }
      delete next[dateStr]
      save('pt_days', next)
      return next
    })
  }, [])

  const setMonth = useCallback((monthKey, data) => {
    setMonthsState(prev => {
      const next = { ...prev, [monthKey]: data }
      save('pt_months', next)
      return next
    })
  }, [])

  const initSettings = useCallback((initial) => {
    const merged = { ...DEFAULT_SETTINGS, ...initial }
    save('pt_settings', merged)
    setSettingsState(merged)
  }, [])

  const clearYear = useCallback((year) => {
    const prefix = String(year)
    setDaysState(prev => {
      const next = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix)))
      save('pt_days', next)
      return next
    })
    setMonthsState(prev => {
      const next = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix)))
      save('pt_months', next)
      return next
    })
  }, [])

  return { settings, days, months, setSettings, setDay, deleteDay, setMonth, initSettings, clearYear, DEFAULT_SETTINGS }
}
