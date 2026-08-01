import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../app/store'
import { getMonthDays, monthKeyOf, todayStr } from '../domain/dates'
import { calcMonthGross, calcMonthStats, getRate, isSumMode, monthlyBaseOf, vacationUsedInYear } from '../domain/payroll'
import { haptics } from '../services/haptics'
import BarChart from '../components/BarChart'
import MonthBreakdown from '../components/MonthBreakdown'
import DayEditor from '../components/DayEditor'
import StatDetailSheet from '../components/StatDetailSheet'

export default function Dashboard({ onGoToMonth }) {
  const { t, intl, settings, days, months, ensureYear, formatMoney } = useApp()
  const today = todayStr()
  const currentYear = parseInt(today.slice(0, 4))
  const currentMonth = parseInt(today.slice(5, 7))
  const todayNum = parseInt(today.slice(8, 10))

  const [view, setView] = useState({ year: currentYear, month: currentMonth })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [statDetail, setStatDetail] = useState(null)

  const { year, month } = view
  useEffect(() => { ensureYear(year) }, [year, ensureYear])

  const sumMode = isSumMode(settings)
  const rate = getRate(settings, year)
  const monthDayKeys = useMemo(() => getMonthDays(year, month), [year, month])

  const gross = useMemo(
    () => calcMonthGross(monthDayKeys, days, settings, year, month),
    [monthDayKeys, days, settings, year, month]
  )
  const net = months[monthKeyOf(year, month)]?.net || null
  const stats = useMemo(() => calcMonthStats(monthDayKeys, days), [monthDayKeys, days])

  const vacationTotal = settings.allowances?.vacationTotal ?? 0
  const vacationLeft = Math.max(0, vacationTotal - vacationUsedInYear(days, year))

  const isCurrentMonth = year === currentYear && month === currentMonth
  const todayLogged = !!days[today]

  function shiftMonth(delta) {
    haptics.light()
    setView(v => {
      let m = v.month + delta, y = v.year
      if (m < 1) { m = 12; y-- }
      if (m > 12) { m = 1; y++ }
      return { year: y, month: m }
    })
  }

  const monthLabel = useMemo(() => {
    const s = new Date(year, month - 1, 1).toLocaleDateString(intl, { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }, [year, month, intl])

  const dailyItems = useMemo(() => monthDayKeys.map(k => ({
    label: String(parseInt(k.slice(8, 10))),
    value: days[k]?.gross || 0,
    highlight: isCurrentMonth && parseInt(k.slice(8, 10)) === todayNum,
  })), [monthDayKeys, days, isCurrentMonth, todayNum])

  const yearItems = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const label = new Date(year, i, 1).toLocaleDateString(intl, { month: 'short' })
      const keys = getMonthDays(year, m)
      // Only logged months count — otherwise the guaranteed base would show
      // phantom income for months the user never filled in
      const hasData = keys.some(k => days[k])
      const isNow = year === currentYear && m === currentMonth
      if (!hasData && !isNow) return { label, value: 0, muted: true }
      return {
        label,
        value: calcMonthGross(keys, days, settings, year, m),
        highlight: m === month,
      }
    })
  }, [year, currentYear, currentMonth, month, days, settings, intl])

  const yearGross = useMemo(() => yearItems.reduce((s, it) => s + Math.max(0, it.value), 0), [yearItems])
  const yearNet = useMemo(() =>
    Object.entries(months)
      .filter(([k]) => k.startsWith(String(year)))
      .reduce((s, [, m]) => s + (m?.net || 0), 0),
  [months, year])

  const statChips = [
    { key: 'worked', label: t.dashboard.workedDays, value: stats.worked % 1 === 0 ? stats.worked : stats.worked.toFixed(1) },
    { key: 'off', label: t.dashboard.daysOff, value: stats.off },
    { key: 'vacation', label: t.dashboard.vacation, value: stats.vacation % 1 === 0 ? stats.vacation : stats.vacation.toFixed(1) },
    { key: 'overtime', label: t.dashboard.overtime, value: stats.overtime % 1 === 0 ? stats.overtime : stats.overtime.toFixed(1) },
    { key: 'holidays', label: t.dashboard.holidays, value: stats.holidays },
  ]

  const company = settings.profile?.company

  return (
    <div className="page">
      <header className="hero">
        <div className="month-nav">
          <button type="button" className="month-nav__arrow" aria-label="‹"
            onClick={() => shiftMonth(-1)}>‹</button>
          <button
            type="button"
            className={`month-nav__label${isCurrentMonth ? ' month-nav__label--current' : ''}`}
            onClick={() => { haptics.light(); setView({ year: currentYear, month: currentMonth }) }}
          >
            {monthLabel}
          </button>
          <button type="button" className="month-nav__arrow" aria-label="›"
            onClick={() => shiftMonth(1)}>›</button>
        </div>

        <div className="hero__gross num">{formatMoney(gross)}</div>
        {company && <div className="hero__company">{company}</div>}
        {!sumMode && settings.payType === 'hourly' && (
          <div className="hero__sub">{t.dashboard.base}: <span className="num">{formatMoney(rate * 209)}</span> ×209</div>
        )}
        {!sumMode && settings.payType !== 'hourly' && (
          <div className="hero__sub">{t.baseSalary}: <span className="num">{formatMoney(monthlyBaseOf(settings, year))}</span></div>
        )}
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
        {statChips.map(({ key, label, value }) => (
          <button
            key={key}
            type="button"
            className="stat-chip"
            onClick={() => { haptics.light(); setStatDetail({ key, label, value }) }}
          >
            <span className="stat-chip__value num">{value}</span>
            <span className="stat-chip__label">{label}</span>
          </button>
        ))}
      </div>

      <section className="card">
        <h2 className="card__title">{t.dashboard.monthTotal}</h2>
        <MonthBreakdown year={year} month={month} />
      </section>

      <section className="card">
        <h2 className="card__title">{t.dashboard.dailyDynamics}</h2>
        <BarChart items={dailyItems} formatValue={formatMoney} height={88} labelEvery={5} />
      </section>

      <section className="card">
        <h2 className="card__title">{t.dashboard.yearOverview} · <span className="num">{year}</span></h2>
        <BarChart
          items={yearItems}
          formatValue={formatMoney}
          height={110}
          onBarTap={i => { haptics.light(); onGoToMonth({ year, month: i + 1 }) }}
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

      {statDetail && (
        <StatDetailSheet
          statKey={statDetail.key}
          title={statDetail.label}
          value={statDetail.value}
          monthDayKeys={monthDayKeys}
          days={days}
          onClose={() => setStatDetail(null)}
        />
      )}
    </div>
  )
}
