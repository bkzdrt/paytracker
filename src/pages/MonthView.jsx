import { useState, useMemo } from 'react'
import { calcMonthGross, bonusForMonth, getMonthDays, calcMonthBreakdownKR, isKRMode } from '../utils/calculations'
import { todayStr, isFuture, isToday, isWeekend } from '../utils/dates'
import MonthHeader from '../components/MonthHeader'
import DayBottomSheet from '../components/DayBottomSheet'
import { useWeekTemplate } from '../hooks/useWeekTemplate'

function dotClass(dayData) {
  if (!dayData) return ''
  if (dayData.isHoliday && dayData.type !== '결근') return 'dot--hol'
  switch (dayData.type) {
    case '주간':    return 'dot--day'
    case '야간':    return 'dot--night'
    case '쉬는 날': return 'dot--off'
    case '연차':    return 'dot--vac'
    case '반차':    return 'dot--half'
    case '결근':    return 'dot--abs'
    case 'разовая': return 'dot--casual'
    default:        return 'dot--day'
  }
}

export default function MonthView({ settings, days, months, setDay, deleteDay, setMonth, t, lang, formatMoney, haptic, initialMonth }) {
  const today = todayStr()
  const currentYear = parseInt(today.slice(0, 4))
  const { getDefaultForDate } = useWeekTemplate(settings, days)
  const [viewMonth, setViewMonth] = useState(initialMonth || parseInt(today.slice(5, 7)))
  const [sheetDate, setSheetDate] = useState(null)
  const [editingNet, setEditingNet] = useState(false)
  const [netInput, setNetInput] = useState('')
  const [footerExpanded, setFooterExpanded] = useState(false)

  const monthKey = `${currentYear}-${String(viewMonth).padStart(2, '0')}`
  const monthDayKeys = getMonthDays(currentYear, viewMonth)
  const monthDaysData = Object.fromEntries(monthDayKeys.map(k => [k, days[k]]).filter(([, v]) => v))

  const isKR = isKRMode(settings)
  const rate = settings?.rates[String(currentYear)] || 0
  const bonusLineAmount = (!isKR && settings) ? bonusForMonth(settings.allowances, viewMonth) : 0

  const breakdown = useMemo(() => {
    if (!settings || !isKR) return null
    return calcMonthBreakdownKR(monthDayKeys, days, rate, settings, viewMonth)
  }, [monthDayKeys, days, rate, settings, viewMonth, isKR])

  const monthGross = useMemo(() => {
    if (!settings) return 0
    if (isKR) return breakdown?.total ?? 0
    return calcMonthGross(monthDaysData, settings.allowances) + bonusForMonth(settings.allowances, viewMonth)
  }, [monthDaysData, settings, viewMonth, isKR, breakdown])

  const monthNet = months[monthKey]?.net || null

  function prevMonth() { setViewMonth(m => m <= 1 ? 1 : m - 1) }
  function nextMonth() { setViewMonth(m => m >= 12 ? 12 : m + 1) }

  function saveNet() {
    const val = parseInt(netInput)
    if (!isNaN(val)) {
      setMonth(monthKey, { ...(months[monthKey] || {}), net: val })
    }
    setEditingNet(false)
  }

  // Build calendar grid (week starts Monday)
  const firstDow = new Date(currentYear, viewMonth - 1, 1).getDay()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  monthDayKeys.forEach(k => cells.push(k))
  while (cells.length % 7 !== 0) cells.push(null)

  // Weekday headers Mon→Sun; t.weekdays.short is [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  const weekHeaders = [1, 2, 3, 4, 5, 6, 0].map(i => t.weekdays?.short?.[i] || ['M','T','W','T','F','S','S'][i - 1 < 0 ? 6 : i - 1])

  return (
    <div className="page--month">
      <MonthHeader
        year={currentYear}
        month={viewMonth}
        onPrev={prevMonth}
        onNext={nextMonth}
        t={t}
        lang={lang}
      />

      <div className="cal-week-header">
        {weekHeaders.map((h, i) => (
          <div key={i} className={`cal-week-header__cell${i >= 5 ? ' cal-week-header__cell--weekend' : ''}`}>
            {h}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((dateStr, idx) => {
          if (!dateStr) {
            return <div key={`e-${idx}`} className="cal-cell cal-cell--empty" />
          }
          const dayNum = parseInt(dateStr.slice(8, 10))
          const dayData = days[dateStr]
          const filled = !!dayData
          const future = isFuture(dateStr)
          const todayCell = isToday(dateStr)
          const weekend = isWeekend(dateStr)
          const gross = dayData?.gross || 0
          const negativeGross = gross < 0

          let cls = 'cal-cell'
          if (weekend) cls += ' cal-cell--weekend'
          if (todayCell) cls += ' cal-cell--today'
          if (future && !filled) cls += ' cal-cell--future'
          if (filled) cls += ' cal-cell--filled'

          return (
            <div key={dateStr} className={cls} onClick={() => setSheetDate(dateStr)}>
              <span className="cal-cell__num">{dayNum}</span>
              {filled ? (
                <>
                  <span className={`cal-cell__dot ${dotClass(dayData)}`} />
                  <span className={`cal-cell__amount${negativeGross ? ' cal-cell__amount--negative' : ''}`}>
                    {formatMoney(gross)}
                  </span>
                </>
              ) : (
                <span className="cal-cell__dot dot--off" style={{ opacity: 0.15 }} />
              )}
            </div>
          )
        })}
      </div>

      <div className="month-footer">
        <div className="month-footer__summary" onClick={() => setFooterExpanded(x => !x)}>
          <span className="month-footer__summary-label">{t.month.gross}</span>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="month-footer__summary-amounts">
              <span className="month-footer__summary-gross">{formatMoney(monthGross)}</span>
              {monthNet && (
                <span className="month-footer__summary-net">{t.month.net}: {formatMoney(monthNet)}</span>
              )}
            </div>
            <span className={`month-footer__chevron${footerExpanded ? ' month-footer__chevron--up' : ''}`}>&#8964;</span>
          </div>
        </div>

        {footerExpanded && (
          <div className="month-footer__detail">
            {isKR && breakdown ? (
              <div className="breakdown-list">
                <div className="breakdown-row">
                  <span>{t.month.baseKR}</span>
                  <span>{formatMoney(breakdown.base)}</span>
                </div>
                {breakdown.overtime > 0 && (
                  <div className="breakdown-row">
                    <span>{t.month.overtimePay}</span>
                    <span>+{formatMoney(breakdown.overtime)}</span>
                  </div>
                )}
                {breakdown.holiday > 0 && (
                  <div className="breakdown-row">
                    <span>{t.month.holidayPay}</span>
                    <span>+{formatMoney(breakdown.holiday)}</span>
                  </div>
                )}
                {breakdown.weekend > 0 && (
                  <div className="breakdown-row">
                    <span>{t.month.weekendPay}</span>
                    <span>+{formatMoney(breakdown.weekend)}</span>
                  </div>
                )}
                {breakdown.allowances > 0 && (
                  <div className="breakdown-row">
                    <span>{t.month.allowancesPay}</span>
                    <span>+{formatMoney(breakdown.allowances)}</span>
                  </div>
                )}
                {breakdown.bonus > 0 && (
                  <div className="breakdown-row">
                    <span>{t.month.quarterBonus}</span>
                    <span className="breakdown-row__bonus">+{formatMoney(breakdown.bonus)}</span>
                  </div>
                )}
                {breakdown.casual > 0 && (
                  <div className="breakdown-row">
                    <span>{t.dashboard.casualPay}</span>
                    <span>+{formatMoney(breakdown.casual)}</span>
                  </div>
                )}
                {breakdown.deductions > 0 && (
                  <div className="breakdown-row">
                    <span>{t.month.absences}</span>
                    <span className="month-footer__amount--deduction">−{formatMoney(breakdown.deductions)}</span>
                  </div>
                )}
                <div className="breakdown-row breakdown-row--total">
                  <span>{t.month.gross}</span>
                  <span>{formatMoney(breakdown.total)}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="month-footer__row">
                  <span className="section-label">{t.month.gross}</span>
                  <span className="month-footer__amount">{formatMoney(monthGross)}</span>
                </div>
                {bonusLineAmount > 0 && (
                  <div className="month-footer__row">
                    <span className="section-label">{t.month.quarterBonus}</span>
                    <span className="month-footer__amount month-footer__amount--bonus">+{formatMoney(bonusLineAmount)}</span>
                  </div>
                )}
              </>
            )}
            <div className="month-footer__row" onClick={e => { e.stopPropagation(); setEditingNet(true); setNetInput(String(monthNet || '')) }}>
              <span className="section-label">{t.month.net}</span>
              {editingNet ? (
                <input
                  className="net-input"
                  type="number"
                  value={netInput}
                  onChange={e => setNetInput(e.target.value)}
                  onBlur={saveNet}
                  onKeyDown={e => e.key === 'Enter' && saveNet()}
                  autoFocus
                  inputMode="numeric"
                />
              ) : (
                <span className="month-footer__amount month-footer__amount--editable">
                  {monthNet ? formatMoney(monthNet) : <span className="text-muted">{t.month.enterNet}</span>}
                </span>
              )}
            </div>
            {monthNet && (
              <div className="month-footer__row">
                <span className="section-label">{t.month.deductions}</span>
                <span className="month-footer__amount month-footer__amount--deduction">{formatMoney(monthGross - monthNet)}</span>
              </div>
            )}
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
