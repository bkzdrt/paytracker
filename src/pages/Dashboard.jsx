import { useState, useMemo } from 'react'
import {
  calcMonthGross, bonusForMonth, getMonthDays, calcProjected,
  getQuarter, countQuarterAbsences
} from '../utils/calculations'
import { todayStr, isFuture } from '../utils/dates'
import BarChartMonth from '../components/BarChartMonth'
import DailyChart from '../components/DailyChart'
import DayBottomSheet from '../components/DayBottomSheet'
import { useWeekTemplate } from '../hooks/useWeekTemplate'

export default function Dashboard({ settings, days, months, setDay, deleteDay, t, lang, formatMoney, haptic, onGoToMonth }) {
  const today = todayStr()
  const currentYear = parseInt(today.slice(0, 4))
  const currentMonth = parseInt(today.slice(5, 7))
  const todayNum = parseInt(today.slice(8, 10))
  const { getDefaultForDate } = useWeekTemplate(settings, days)
  const [sheetDate, setSheetDate] = useState(null)

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  const monthDayKeys = getMonthDays(currentYear, currentMonth)
  const monthDaysData = Object.fromEntries(monthDayKeys.map(k => [k, days[k]]).filter(([, v]) => v))

  // Quarterly bonus logic
  const quarter = getQuarter(currentMonth)
  const quarterAbsences = useMemo(() => countQuarterAbsences(days, currentYear, quarter), [days, currentYear, quarter])

  const monthGross = useMemo(() => {
    if (!settings) return 0
    return calcMonthGross(monthDaysData, settings.allowances) + bonusForMonth(settings.allowances, currentMonth)
  }, [monthDaysData, settings, currentMonth])

  const monthNet = months[monthKey]?.net || null

  const workedDays = monthDayKeys.filter(k => days[k] && ['주간', '야간', '연차', '반차', '결근'].includes(days[k].type)).length
  const daysOff = monthDayKeys.filter(k => days[k]?.type === '쉬는 날').length
  const vacationUsed = Object.keys(days)
    .filter(k => k.startsWith(String(currentYear)))
    .reduce((sum, k) => {
      if (days[k]?.type === '연차') return sum + 1
      if (days[k]?.type === '반차') return sum + 0.5
      return sum
    }, 0)
  const vacationTotal = settings?.allowances?.vacationTotal ?? 15
  const vacationRemaining = Math.max(0, vacationTotal - vacationUsed)
  const totalOT = monthDayKeys.reduce((s, k) => s + (days[k]?.overtime || 0), 0)

  const todayLogged = !!days[today]
  const workingDays = monthDayKeys.filter(k => !isFuture(k)).length
  const filledDays = monthDayKeys.filter(k => days[k]).length
  const progress = workingDays > 0 ? filledDays / workingDays : 0

  const projected = useMemo(() => {
    if (!settings) return 0
    return calcProjected(days, monthDayKeys, settings, currentMonth)
  }, [days, monthDayKeys, settings, currentMonth])

  // Daily chart data
  const dailyData = useMemo(() => {
    return monthDayKeys.map(dateStr => {
      const dayNum = parseInt(dateStr.slice(8, 10))
      const gross = days[dateStr]?.gross || 0
      return { day: dayNum, gross }
    })
  }, [monthDayKeys, days])

  // Year overview — 0 for months with no data
  const yearData = useMemo(() => {
    const monthNames = lang === 'ru'
      ? ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      if (m > currentMonth) return { label: monthNames[i], gross: 0, monthIndex: m }
      const mDays = getMonthDays(currentYear, m)
      const mDaysData = Object.fromEntries(mDays.map(k => [k, days[k]]).filter(([, v]) => v))
      const gross = settings ? calcMonthGross(mDaysData, settings.allowances) + bonusForMonth(settings.allowances, m) : 0
      return { label: monthNames[i], gross, monthIndex: m }
    })
  }, [currentYear, currentMonth, days, settings, lang])

  // Records
  const bestDay = useMemo(() => {
    const entries = Object.entries(days).filter(([, d]) => d?.gross > 0)
    if (!entries.length) return null
    return entries.reduce((a, b) => a[1].gross > b[1].gross ? a : b)
  }, [days])

  // Year totals — only sum months that have actual data
  const yearGross = useMemo(() => yearData.reduce((s, d) => s + d.gross, 0), [yearData])

  const yearNet = useMemo(() => {
    return Object.keys(months).filter(k => k.startsWith(String(currentYear)))
      .reduce((s, k) => s + (months[k]?.net || 0), 0)
  }, [months, currentYear])

  function navigateSheet(dir) {
    if (!sheetDate) return
    const allDays = getMonthDays(currentYear, currentMonth)
    const idx = allDays.indexOf(sheetDate)
    const next = allDays[idx + dir]
    if (next) setSheetDate(next)
  }

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString(
    lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long' }
  )

  return (
    <div className="page page--dashboard">
      <div className="dashboard-hero">
        <div className="dashboard-hero__month">{monthName.charAt(0).toUpperCase() + monthName.slice(1)} {currentYear}</div>
        <div className="dashboard-hero__gross">{formatMoney(monthGross)}</div>
        {monthNet && (
          <>
            <div className="dashboard-hero__net">{t.month.net}: {formatMoney(monthNet)}</div>
            <div className="dashboard-hero__deduction">{t.month.deductions}: {formatMoney(monthGross - monthNet)}</div>
          </>
        )}
      </div>

      <div className="stats-row">
        {[
          { label: t.dashboard.workedDays, value: workedDays },
          { label: t.dashboard.daysOff, value: daysOff },
          { label: t.dashboard.vacation, value: `${vacationUsed}/${vacationTotal}` },
          { label: t.dashboard.overtime, value: totalOT.toFixed(1) },
        ].map(({ label, value }) => (
          <div key={label} className="stats-chip">
            <span className="stats-chip__value">{value}</span>
            <span className="stats-chip__label">{label}</span>
          </div>
        ))}
      </div>

      {vacationRemaining > 0 && (
        <div className="section-card">
          <span className="section-label">{t.dashboard.vacationRemaining}</span>
          <span className="projected-amount">{vacationRemaining} {lang === 'ru' ? 'дн.' : 'd.'}</span>
        </div>
      )}

      {!todayLogged && (
        <div className="today-banner" onClick={() => setSheetDate(today)}>
          {t.dashboard.todayNotLogged}
        </div>
      )}

      <div className="section-card">
        <div className="progress-bar-wrap">
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="progress-label">{filledDays}/{workingDays}</span>
        </div>
        <div className="projected-row">
          <span className="section-label">{t.dashboard.projected}</span>
          <span className="projected-amount">{formatMoney(projected)}</span>
        </div>
      </div>

      {settings?.allowances?.bonusEnabled && (
        <div className="section-card">
          <div className="section-label">{t.dashboard.quarterBonus}</div>
          <div className="quarter-bonus-row">
            <span className="quarter-status quarter-status--ok">
              {bonusForMonth(settings.allowances, currentMonth) > 0
                ? formatMoney(settings.allowances.bonus)
                : '+' + formatMoney(settings.allowances.bonus)}
            </span>
            <span className="quarter-absences">
              {t.dashboard.quarterAbsences}: {quarterAbsences}
            </span>
          </div>
        </div>
      )}



      <div className="section-card">
        <div className="section-label">{t.dashboard.dailyDynamics}</div>
        <DailyChart data={dailyData} todayNum={todayNum} />
      </div>

      <div className="section-card">
        <div className="section-label">{t.dashboard.yearOverview}</div>
        <BarChartMonth data={yearData} onBarClick={(m) => onGoToMonth(m)} currentMonth={currentMonth} />
      </div>

      {bestDay && (
        <div className="section-card">
          <div className="section-label">{t.dashboard.records}</div>
          <div className="record-row">
            <span>{t.dashboard.bestDay}</span>
            <span className="record-amount">{formatMoney(bestDay[1].gross)} <span className="record-date">{bestDay[0]}</span></span>
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="section-label">{t.dashboard.yearTotal}</div>
        <div className="year-total-row">
          <span>{t.month.gross}</span>
          <span className="year-total-amount">{formatMoney(yearGross)}</span>
        </div>
        {yearNet > 0 && (
          <div className="year-total-row">
            <span>{t.month.net}</span>
            <span className="year-total-amount">{formatMoney(yearNet)}</span>
          </div>
        )}
        {yearNet > 0 && (
          <div className="year-total-row">
            <span>{t.month.deductions}</span>
            <span className="year-total-amount deduction">{formatMoney(yearGross - yearNet)}</span>
          </div>
        )}
      </div>

      {sheetDate && (
        <DayBottomSheet
          dateStr={sheetDate}
          dayData={days[sheetDate]}
          settings={settings}
          onSave={setDay}
          onDelete={deleteDay}
          onClose={() => setSheetDate(null)}
          onNavigate={navigateSheet}
          t={t}
          lang={lang}
          formatMoney={formatMoney}
          haptic={haptic}
          getDefaultForDate={getDefaultForDate}
        />
      )}
    </div>
  )
}
