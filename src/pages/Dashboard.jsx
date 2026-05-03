import { useState, useMemo } from 'react'
import WebApp from '@twa-dev/sdk'
import {
  calcMonthGross, bonusForMonth, getMonthDays,
  calcMonthGrossKR, calcMonthBreakdownKR, isKRMode
} from '../utils/calculations'
import { todayStr } from '../utils/dates'
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
  const [statsMonth, setStatsMonth] = useState(currentMonth)
  const isKR = isKRMode(settings)
  const rate = settings?.rates[String(currentYear)] || 0

  // Hero + chart + forecast — always current month
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  const monthDayKeys = getMonthDays(currentYear, currentMonth)
  const monthDaysData = Object.fromEntries(monthDayKeys.map(k => [k, days[k]]).filter(([, v]) => v))

  const monthGross = useMemo(() => {
    if (!settings) return 0
    if (isKR) return calcMonthGrossKR(monthDayKeys, days, rate, settings, currentMonth)
    return calcMonthGross(monthDaysData, settings.allowances) + bonusForMonth(settings.allowances, currentMonth)
  }, [monthDaysData, monthDayKeys, days, settings, currentMonth, isKR, rate])

  const monthNet = months[monthKey]?.net || null

  // Stats section — follows statsMonth
  const statsMonthDayKeys = useMemo(() => getMonthDays(currentYear, statsMonth), [currentYear, statsMonth])
  const workedDays = statsMonthDayKeys.filter(k => days[k] && ['주간', '야간', '연차', '반차', '결근'].includes(days[k]?.type)).length
  const daysOff = statsMonthDayKeys.filter(k => days[k]?.type === '쉬는 날').length
  const statsVacation = statsMonthDayKeys.reduce((sum, k) => {
    if (days[k]?.type === '연차') return sum + 1
    if (days[k]?.type === '반차') return sum + 0.5
    return sum
  }, 0)
  const totalOT = statsMonthDayKeys.reduce((s, k) => s + (days[k]?.overtime || 0), 0)
  const holidayDays = statsMonthDayKeys.filter(k => days[k]?.isHoliday).length

  const statsMonthKey = `${currentYear}-${String(statsMonth).padStart(2, '0')}`
  const statsNet = months[statsMonthKey]?.net || null

  const statsBreakdown = useMemo(() => {
    if (!settings || !isKR) return null
    return calcMonthBreakdownKR(statsMonthDayKeys, days, rate, settings, statsMonth)
  }, [statsMonthDayKeys, days, rate, settings, statsMonth, isKR])

  const statsGross = useMemo(() => {
    if (!settings) return 0
    if (isKR) return statsBreakdown?.total ?? 0
    const data = Object.fromEntries(statsMonthDayKeys.map(k => [k, days[k]]).filter(([, v]) => v))
    return calcMonthGross(data, settings.allowances) + bonusForMonth(settings.allowances, statsMonth)
  }, [statsMonthDayKeys, days, settings, statsMonth, isKR, statsBreakdown])

  // YTD vacation — for the "remaining" card, always full year
  const vacationUsedYTD = Object.keys(days)
    .filter(k => k.startsWith(String(currentYear)))
    .reduce((sum, k) => {
      if (days[k]?.type === '연차') return sum + 1
      if (days[k]?.type === '반차') return sum + 0.5
      return sum
    }, 0)
  const vacationTotal = settings?.allowances?.vacationTotal ?? 0
  const vacationRemaining = Math.max(0, vacationTotal - vacationUsedYTD)

  const todayLogged = !!days[today]

  // Daily chart data
  const dailyData = useMemo(() => {
    return statsMonthDayKeys.map(dateStr => {
      const dayNum = parseInt(dateStr.slice(8, 10))
      const gross = days[dateStr]?.gross || 0
      return { day: dayNum, gross }
    })
  }, [statsMonthDayKeys, days])

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
      const gross = settings
        ? (isKR ? calcMonthGrossKR(mDays, days, rate, settings, m) : calcMonthGross(mDaysData, settings.allowances) + bonusForMonth(settings.allowances, m))
        : 0
      return { label: monthNames[i], gross, monthIndex: m }
    })
  }, [currentYear, currentMonth, days, settings, lang, isKR, rate])

  // Year totals — only sum months that have actual data
  const yearGross = useMemo(() => yearData.reduce((s, d) => s + d.gross, 0), [yearData])

  const yearNet = useMemo(() => {
    return Object.keys(months).filter(k => k.startsWith(String(currentYear)))
      .reduce((s, k) => s + (months[k]?.net || 0), 0)
  }, [months, currentYear])

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString(
    lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long' }
  )

  return (
    <div className="page page--dashboard">
      <div style={{fontSize: '10px', color: 'red', padding: '4px', lineHeight: '1.6'}}>
        LANG1: {WebApp?.initDataUnsafe?.user?.language_code || 'undefined'}{' '}
        INIT: {WebApp?.initData ? 'yes' : 'no'}{' '}
        BROWSER: {navigator.language || 'undefined'}{' '}
        RESOLVED: {lang}
      </div>
      <div className="dashboard-hero">
        <div className="dashboard-hero__month">{monthName.charAt(0).toUpperCase() + monthName.slice(1)} {currentYear}</div>
        <div className="dashboard-hero__gross">{formatMoney(monthGross)}</div>
        {isKR && (
          <div className="dashboard-hero__base">{t.dashboard.base}: {formatMoney(rate * 209)} (×209)</div>
        )}
        {monthNet && (
          <>
            <div className="dashboard-hero__net">{t.month.net}: {formatMoney(monthNet)}</div>
            <div className="dashboard-hero__deduction">{t.month.deductions}: {formatMoney(monthGross - monthNet)}</div>
          </>
        )}
      </div>

      <div className="stats-nav">
        <button
          className="stats-nav__btn"
          onClick={() => setStatsMonth(m => Math.max(1, m - 1))}
          disabled={statsMonth === 1}
        >&#8249;</button>
        <span className={`stats-nav__label${statsMonth === currentMonth ? ' stats-nav__label--current' : ''}`}>
          {new Date(currentYear, statsMonth - 1, 1).toLocaleDateString(
            lang === 'ru' ? 'ru-RU' : 'en-US',
            { month: 'long', year: 'numeric' }
          )}
        </span>
        <button
          className="stats-nav__btn"
          onClick={() => setStatsMonth(m => Math.min(12, m + 1))}
          disabled={statsMonth === 12}
        >&#8250;</button>
      </div>

      <div className="stats-row">
        {[
          { label: t.dashboard.workedDays, value: workedDays },
          { label: t.dashboard.daysOff, value: daysOff },
          { label: t.dashboard.vacation, value: statsVacation % 1 === 0 ? statsVacation : statsVacation.toFixed(1) },
          { label: t.dashboard.overtime, value: totalOT.toFixed(1) },
          { label: t.dashboard.holidays, value: holidayDays },
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
        <div className="section-label">{t.dashboard.monthTotal}</div>
        {isKR && statsBreakdown ? (
          <div className="breakdown-list">
            <div className="breakdown-row">
              <span>{t.month.baseKR}</span>
              <span>{formatMoney(statsBreakdown.base)}</span>
            </div>
            {statsBreakdown.overtime > 0 && (
              <div className="breakdown-row">
                <span>{t.month.overtimePay}</span>
                <span>+{formatMoney(statsBreakdown.overtime)}</span>
              </div>
            )}
            {statsBreakdown.holiday > 0 && (
              <div className="breakdown-row">
                <span>{t.month.holidayPay}</span>
                <span>+{formatMoney(statsBreakdown.holiday)}</span>
              </div>
            )}
            {statsBreakdown.weekend > 0 && (
              <div className="breakdown-row">
                <span>{t.month.weekendPay}</span>
                <span>+{formatMoney(statsBreakdown.weekend)}</span>
              </div>
            )}
            {statsBreakdown.allowances > 0 && (
              <div className="breakdown-row">
                <span>{t.month.allowancesPay}</span>
                <span>+{formatMoney(statsBreakdown.allowances)}</span>
              </div>
            )}
            {statsBreakdown.bonus > 0 && (
              <div className="breakdown-row">
                <span>{t.month.quarterBonus}</span>
                <span className="breakdown-row__bonus">+{formatMoney(statsBreakdown.bonus)}</span>
              </div>
            )}
            {statsBreakdown.casual > 0 && (
              <div className="breakdown-row">
                <span>{t.dashboard.casualPay}</span>
                <span>+{formatMoney(statsBreakdown.casual)}</span>
              </div>
            )}
            {statsBreakdown.deductions > 0 && (
              <div className="breakdown-row">
                <span>{t.month.absences}</span>
                <span className="month-footer__amount--deduction">−{formatMoney(statsBreakdown.deductions)}</span>
              </div>
            )}
            <div className="breakdown-row breakdown-row--total">
              <span>{t.month.gross}</span>
              <span>{formatMoney(statsBreakdown.total)}</span>
            </div>
            {statsNet && (
              <>
                <div className="breakdown-row">
                  <span>{t.month.net}</span>
                  <span>{formatMoney(statsNet)}</span>
                </div>
                <div className="breakdown-row">
                  <span>{t.month.deductions}</span>
                  <span className="month-footer__amount--deduction">{formatMoney(statsBreakdown.total - statsNet)}</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="breakdown-row breakdown-row--total">
              <span>{t.month.gross}</span>
              <span>{formatMoney(statsGross)}</span>
            </div>
            {statsNet && (
              <>
                <div className="breakdown-row">
                  <span>{t.month.net}</span>
                  <span>{formatMoney(statsNet)}</span>
                </div>
                <div className="breakdown-row">
                  <span>{t.month.deductions}</span>
                  <span className="month-footer__amount--deduction">{formatMoney(statsGross - statsNet)}</span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="section-card">
        <div className="section-label">{t.dashboard.dailyDynamics}</div>
        <DailyChart data={dailyData} todayNum={statsMonth === currentMonth ? todayNum : null} />
      </div>

      <div className="section-card">
        <div className="section-label">{t.dashboard.yearOverview}</div>
        <BarChartMonth data={yearData} onBarClick={(m) => onGoToMonth(m)} currentMonth={currentMonth} />
      </div>

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
