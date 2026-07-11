import { useMemo, useState } from 'react'
import { useApp } from '../app/store'
import { getMonthDays, monthKeyOf, todayStr } from '../domain/dates'
import { calcMonthGross, calcMonthStats, isKRMode, vacationUsedInYear } from '../domain/payroll'
import { haptics } from '../services/haptics'
import BarChart from '../components/BarChart'
import MonthBreakdown from '../components/MonthBreakdown'
import DayEditor from '../components/DayEditor'

export default function Dashboard({ onGoToMonth }) {
  const { t, intl, settings, days, months, formatMoney } = useApp()
  const today = todayStr()
  const currentYear = parseInt(today.slice(0, 4))
  const currentMonth = parseInt(today.slice(5, 7))
  const todayNum = parseInt(today.slice(8, 10))

  const [month, setMonth] = useState(currentMonth)
  const [sheetOpen, setSheetOpen] = useState(false)

  const isKR = isKRMode(settings)
  const rate = settings.rates[String(currentYear)] || 0
  const monthDayKeys = useMemo(() => getMonthDays(currentYear, month), [currentYear, month])

  const gross = useMemo(
    () => calcMonthGross(monthDayKeys, days, rate, settings, month),
    [monthDayKeys, days, rate, settings, month]
  )
  const net = months[monthKeyOf(currentYear, month)]?.net || null
  const stats = useMemo(() => calcMonthStats(monthDayKeys, days), [monthDayKeys, days])

  const vacationTotal = settings.allowances?.vacationTotal ?? 0
  const vacationLeft = Math.max(0, vacationTotal - vacationUsedInYear(days, currentYear))

  const isCurrentMonth = month === currentMonth
  const todayLogged = !!days[today]

  const monthLabel = useMemo(() => {
    const s = new Date(currentYear, month - 1, 1).toLocaleDateString(intl, { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }, [currentYear, month, intl])

  const dailyItems = useMemo(() => monthDayKeys.map(k => ({
    label: String(parseInt(k.slice(8, 10))),
    value: days[k]?.gross || 0,
    highlight: isCurrentMonth && parseInt(k.slice(8, 10)) === todayNum,
  })), [monthDayKeys, days, isCurrentMonth, todayNum])

  const yearItems = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const label = new Date(currentYear, i, 1).toLocaleDateString(intl, { month: 'short' })
      const keys = getMonthDays(currentYear, m)
      // Only months that were actually logged count — otherwise the KR ×209
      // base would show phantom income for months before the user started
      const hasData = keys.some(k => days[k])
      if (m > currentMonth || (!hasData && m !== currentMonth)) return { label, value: 0, muted: true }
      return {
        label,
        value: calcMonthGross(keys, days, rate, settings, m),
        highlight: m === month,
      }
    })
  }, [currentYear, currentMonth, month, days, rate, settings, intl])

  const yearGross = useMemo(() => yearItems.reduce((s, it) => s + Math.max(0, it.value), 0), [yearItems])
  const yearNet = useMemo(() =>
    Object.entries(months)
      .filter(([k]) => k.startsWith(String(currentYear)))
      .reduce((s, [, m]) => s + (m?.net || 0), 0),
  [months, currentYear])

  const statChips = [
    { label: t.dashboard.workedDays, value: stats.worked },
    { label: t.dashboard.daysOff, value: stats.off },
    { label: t.dashboard.vacation, value: stats.vacation % 1 === 0 ? stats.vacation : stats.vacation.toFixed(1) },
    { label: t.dashboard.overtime, value: stats.overtime % 1 === 0 ? stats.overtime : stats.overtime.toFixed(1) },
    { label: t.dashboard.holidays, value: stats.holidays },
  ]

  return (
    <div className="page">
      <header className="hero">
        <div className="month-nav">
          <button type="button" className="month-nav__arrow" aria-label="‹" disabled={month <= 1}
            onClick={() => { haptics.light(); setMonth(m => m - 1) }}>‹</button>
          <button
            type="button"
            className={`month-nav__label${isCurrentMonth ? ' month-nav__label--current' : ''}`}
            onClick={() => { haptics.light(); setMonth(currentMonth) }}
          >
            {monthLabel}
          </button>
          <button type="button" className="month-nav__arrow" aria-label="›" disabled={month >= 12}
            onClick={() => { haptics.light(); setMonth(m => m + 1) }}>›</button>
        </div>

        <div className="hero__gross num">{formatMoney(gross)}</div>
        {isKR && <div className="hero__sub">{t.dashboard.base}: <span className="num">{formatMoney(rate * 209)}</span> ×209</div>}
        {net && (
          <div className="hero__net">
            {t.month.net}: <span className="num">{formatMoney(net)}</span>
            <span className="hero__deduction"> −{formatMoney(Math.max(0, gross - net))}</span>
          </div>
        )}
      </header>

      {isCurrentMonth && !todayLogged && (
        <button type="button" className="today-banner" onClick={() => setSheetOpen(true)}>
          <span className="today-banner__plus">+</span>
          {t.dashboard.todayNotLogged}
        </button>
      )}

      <div className="stats-row">
        {statChips.map(({ label, value }) => (
          <div key={label} className="stat-chip">
            <span className="stat-chip__value num">{value}</span>
            <span className="stat-chip__label">{label}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="card__title">{t.dashboard.monthTotal}</h2>
        <MonthBreakdown year={currentYear} month={month} />
      </section>

      <section className="card">
        <h2 className="card__title">{t.dashboard.dailyDynamics}</h2>
        <BarChart items={dailyItems} formatValue={formatMoney} height={88} labelEvery={5} />
      </section>

      <section className="card">
        <h2 className="card__title">{t.dashboard.yearOverview}</h2>
        <BarChart
          items={yearItems}
          formatValue={formatMoney}
          height={110}
          onBarTap={i => { haptics.light(); onGoToMonth(i + 1) }}
        />
        <div className="year-totals">
          <div className="year-totals__row">
            <span>{t.dashboard.yearTotal}</span>
            <span className="num">{formatMoney(yearGross)}</span>
          </div>
          {yearNet > 0 && (
            <div className="year-totals__row year-totals__row--muted">
              <span>{t.month.net}</span>
              <span className="num">{formatMoney(yearNet)}</span>
            </div>
          )}
        </div>
      </section>

      {vacationTotal > 0 && (
        <section className="card card--row">
          <span className="card__title card__title--inline">{t.dashboard.vacationRemaining}</span>
          <span className="vacation-left num">{vacationLeft} / {vacationTotal}</span>
        </section>
      )}

      {sheetOpen && <DayEditor dateStr={today} onClose={() => setSheetOpen(false)} />}
    </div>
  )
}
