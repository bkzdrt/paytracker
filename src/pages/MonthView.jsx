import { useState, useMemo } from 'react'
import { calcMonthGross, bonusForMonth, getMonthDays, calcMonthBreakdownKR, isKRMode } from '../utils/calculations'
import { todayStr } from '../utils/dates'
import MonthHeader from '../components/MonthHeader'
import DayRow from '../components/DayRow'
import DayBottomSheet from '../components/DayBottomSheet'
import { useWeekTemplate } from '../hooks/useWeekTemplate'

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
  const rate = settings?.rates[String(currentYear)] || 13589
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

  function prevMonth() {
    setViewMonth(m => m <= 1 ? 1 : m - 1)
  }
  function nextMonth() {
    setViewMonth(m => m >= 12 ? 12 : m + 1)
  }

  function saveNet() {
    const val = parseInt(netInput)
    if (!isNaN(val)) {
      setMonth(monthKey, { ...(months[monthKey] || {}), net: val })
    }
    setEditingNet(false)
  }

  return (
    <div className="page page--month">
      <MonthHeader
        year={currentYear}
        month={viewMonth}
        onPrev={prevMonth}
        onNext={nextMonth}
        t={t}
        lang={lang}
      />

      <div className="day-list">
        {monthDayKeys.map(dateStr => (
          <DayRow
            key={dateStr}
            dateStr={dateStr}
            dayData={days[dateStr]}
            t={t}
            lang={lang}
            formatMoney={formatMoney}
            onClick={() => setSheetDate(dateStr)}
          />
        ))}
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
