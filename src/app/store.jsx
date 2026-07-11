import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getLocale, detectLanguage } from '../i18n'
import * as db from '../services/storage'
import { DEFAULT_SETTINGS } from './defaults'

const AppContext = createContext(null)

const THEME_COLORS = { light: '#F5F3EE', dark: '#161A17' }

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme
  else delete root.dataset.theme
  const dark = theme === 'dark' ||
    (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light)
}

export function AppProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    const stored = db.loadPrefs()
    return { lang: stored.lang || detectLanguage(), theme: stored.theme || 'auto' }
  })
  const [settings, setSettingsState] = useState(() => db.loadSettings())
  const currentYear = new Date().getFullYear()
  const [days, setDays] = useState(() => db.loadYearDays(currentYear))
  const [months, setMonths] = useState(() => db.loadYearMonths(currentYear))
  const loadedYears = useRef(new Set([currentYear]))

  // Theme: apply + react to OS scheme changes while in auto
  useEffect(() => {
    applyTheme(prefs.theme)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(prefs.theme)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [prefs.theme])

  useEffect(() => {
    document.documentElement.lang = prefs.lang
  }, [prefs.lang])

  const setLang = useCallback((lang) => {
    setPrefs(p => { const next = { ...p, lang }; db.savePrefs(next); return next })
  }, [])

  const setTheme = useCallback((theme) => {
    setPrefs(p => { const next = { ...p, theme }; db.savePrefs(next); return next })
  }, [])

  const setSettings = useCallback((updater) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      db.saveSettings(next)
      return next
    })
  }, [])

  const initSettings = useCallback((initial) => {
    const merged = { ...DEFAULT_SETTINGS, ...initial }
    db.saveSettings(merged)
    setSettingsState(merged)
  }, [])

  // Lazily pull another year's data into state (calendar can browse years)
  const ensureYear = useCallback((year) => {
    if (loadedYears.current.has(year)) return
    loadedYears.current.add(year)
    const yearDays = db.loadYearDays(year)
    const yearMonths = db.loadYearMonths(year)
    if (Object.keys(yearDays).length) setDays(prev => ({ ...yearDays, ...prev }))
    if (Object.keys(yearMonths).length) setMonths(prev => ({ ...yearMonths, ...prev }))
  }, [])

  const setDay = useCallback((dateStr, dayData) => {
    setDays(prev => {
      const next = { ...prev, [dateStr]: dayData }
      db.saveMonthChunk(dateStr, next)
      return next
    })
  }, [])

  const deleteDay = useCallback((dateStr) => {
    setDays(prev => {
      const next = { ...prev }
      delete next[dateStr]
      db.saveMonthChunk(dateStr, next)
      return next
    })
  }, [])

  const setMonthNet = useCallback((monthKey, net) => {
    setMonths(prev => {
      const next = { ...prev, [monthKey]: { ...(prev[monthKey] || {}), net } }
      const year = monthKey.slice(0, 4)
      const yearData = Object.fromEntries(
        Object.entries(next).filter(([k]) => k.startsWith(year))
      )
      db.saveYearMonths(year, yearData)
      return next
    })
  }, [])

  const clearYear = useCallback((year) => {
    db.clearYearData(year)
    const prefix = String(year)
    setDays(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix))))
    setMonths(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix))))
  }, [])

  // Reload everything from storage (after a backup import)
  const reloadAll = useCallback(() => {
    setSettingsState(db.loadSettings())
    loadedYears.current = new Set()
    const flatDays = {}, flatMonths = {}
    for (const year of db.storedYears().length ? db.storedYears() : [currentYear]) {
      loadedYears.current.add(year)
      Object.assign(flatDays, db.loadYearDays(year))
      Object.assign(flatMonths, db.loadYearMonths(year))
    }
    setDays(flatDays)
    setMonths(flatMonths)
  }, [currentYear])

  const { t, lang, intl } = getLocale(prefs.lang)

  const formatMoney = useMemo(() => {
    const currency = settings?.currency || 'KRW'
    const fmt = new Intl.NumberFormat(intl, {
      style: 'currency', currency,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    })
    return (val) => fmt.format(val)
  }, [settings?.currency, intl])

  // Short plain-number form for tight spots (calendar cells): 86K / 86 тыс.
  const formatMoneyCompact = useMemo(() => {
    const fmt = new Intl.NumberFormat(intl, {
      notation: 'compact', maximumFractionDigits: 1,
    })
    return (val) => fmt.format(val)
  }, [intl])

  const value = {
    t, lang, intl, theme: prefs.theme, setLang, setTheme,
    settings, setSettings, initSettings,
    days, months, setDay, deleteDay, setMonthNet, clearYear, ensureYear, reloadAll,
    formatMoney, formatMoneyCompact,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  return useContext(AppContext)
}
