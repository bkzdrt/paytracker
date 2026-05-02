import { useState, useMemo } from 'react'
import { useStorage } from './hooks/useStorage'
import { useTelegram } from './hooks/useTelegram'
import { useLocale } from './hooks/useLocale'
import { useWeekTemplate } from './hooks/useWeekTemplate'
import Dashboard from './pages/Dashboard'
import MonthView from './pages/MonthView'
import Settings from './pages/Settings'
import BottomNav from './components/BottomNav'
import Onboarding from './components/Onboarding'
import NewYearPrompt from './components/NewYearPrompt'

export default function App() {
  const { settings, days, months, setSettings, setDay, deleteDay, setMonth, initSettings, clearYear, DEFAULT_SETTINGS } = useStorage()
  const { isDark, langCode, haptic } = useTelegram()
  const { t, lang } = useLocale(langCode)
  const [tab, setTab] = useState('home')
  const [goToMonth, setGoToMonth] = useState(null)

  // Apply theme
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }

  const currentYear = new Date().getFullYear()

  // Detect new year prompt
  const showNewYearPrompt = settings && String(settings.newYearPromptShown) !== String(currentYear)

  // Currency format
  const formatMoney = useMemo(() => {
    const currencyMap = { KRW: 'ko-KR', RUB: 'ru-RU', USD: 'en-US', EUR: 'de-DE', KZT: 'kk-KZ', UZS: 'uz-UZ' }
    const currency = settings?.currency || 'KRW'
    const locale = currencyMap[currency] || 'ko-KR'
    const fmt = new Intl.NumberFormat(locale, {
      style: 'currency', currency,
      minimumFractionDigits: 0, maximumFractionDigits: 0
    })
    return (val) => fmt.format(val)
  }, [settings?.currency])

  // Auto-detect currency on first launch
  function getDefaultCurrency() {
    if (langCode?.startsWith('ko')) return 'KRW'
    if (langCode?.startsWith('ru')) return 'RUB'
    return 'KRW'
  }

  if (!settings) {
    return (
      <Onboarding
        defaultCurrency={getDefaultCurrency()}
        onStart={(rate, currency) => {
          initSettings({
            ...DEFAULT_SETTINGS,
            currency,
            rates: { ...DEFAULT_SETTINGS.rates, [String(currentYear)]: rate },
            newYearPromptShown: String(currentYear),
          })
        }}
        t={t}
      />
    )
  }

  if (showNewYearPrompt) {
    return (
      <NewYearPrompt
        year={currentYear}
        settings={settings}
        onSave={(rate, allowances) => {
          setSettings(s => ({
            ...s,
            rates: { ...s.rates, [String(currentYear)]: rate },
            allowances,
            newYearPromptShown: String(currentYear),
          }))
        }}
        t={t}
      />
    )
  }

  function handleGoToMonth(month) {
    setGoToMonth(month)
    setTab('month')
  }

  return (
    <div className="app">
      <main className="main-content">
        {tab === 'home' && (
          <Dashboard
            settings={settings}
            days={days}
            months={months}
            setDay={setDay}
            deleteDay={deleteDay}
            t={t}
            lang={lang}
            formatMoney={formatMoney}
            haptic={haptic}
            onGoToMonth={handleGoToMonth}
          />
        )}
        {tab === 'month' && (
          <MonthView
            settings={settings}
            days={days}
            months={months}
            setDay={setDay}
            deleteDay={deleteDay}
            setMonth={setMonth}
            t={t}
            lang={lang}
            formatMoney={formatMoney}
            haptic={haptic}
            initialMonth={goToMonth}
          />
        )}
        {tab === 'settings' && (
          <Settings
            settings={settings}
            setSettings={setSettings}
            days={days}
            months={months}
            t={t}
            lang={lang}
            haptic={haptic}
            clearYear={clearYear}
          />
        )}
      </main>
      <BottomNav tab={tab} onChange={setTab} t={t} />
    </div>
  )
}
