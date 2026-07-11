import { useMemo, useState } from 'react'
import { useApp } from '../app/store'
import { getMonthDays, monthKeyOf } from '../domain/dates'
import { calcMonthBreakdown, calcMonthGrossSum, bonusForMonth, isSumMode } from '../domain/payroll'

// Month pay breakdown + tappable net (take-home) row.
// Used on the dashboard and in the calendar footer.
export default function MonthBreakdown({ year, month }) {
  const { t, settings, days, months, setMonthNet, formatMoney } = useApp()
  const [editingNet, setEditingNet] = useState(false)
  const [netInput, setNetInput] = useState('')

  const monthKey = monthKeyOf(year, month)
  const monthDayKeys = useMemo(() => getMonthDays(year, month), [year, month])
  const sumMode = isSumMode(settings)

  const breakdown = useMemo(
    () => (sumMode ? null : calcMonthBreakdown(monthDayKeys, days, settings, year, month)),
    [sumMode, monthDayKeys, days, settings, year, month]
  )
  const gross = sumMode
    ? calcMonthGrossSum(monthDayKeys, days, settings, month)
    : breakdown.total
  const bonusLine = sumMode ? bonusForMonth(settings.allowances, month) : 0
  const net = months[monthKey]?.net || null

  function saveNet() {
    const val = parseInt(netInput)
    if (!isNaN(val) && val > 0) setMonthNet(monthKey, val)
    setEditingNet(false)
  }

  const baseLabel = settings.payType === 'hourly' ? t.month.baseKR : t.baseSalary

  const rows = sumMode
    ? [
        { label: t.month.quarterBonus, value: bonusLine, plus: true, bonus: true },
      ]
    : [
        { label: baseLabel, value: breakdown.base, always: true },
        { label: t.month.overtimePay, value: breakdown.overtime, plus: true },
        { label: t.month.holidayPay, value: breakdown.holiday, plus: true },
        { label: t.month.weekendPay, value: breakdown.weekend, plus: true },
        { label: t.month.allowancesPay, value: breakdown.allowances, plus: true },
        { label: t.month.quarterBonus, value: breakdown.bonus, plus: true, bonus: true },
        { label: t.dashboard.casualPay, value: breakdown.casual, plus: true },
        { label: t.month.absences, value: -breakdown.deductions, minus: true },
      ]

  return (
    <div className="breakdown">
      {rows.filter(r => r.always || r.value > 0 || (r.minus && r.value < 0)).map(r => (
        <div key={r.label} className="breakdown__row">
          <span>{r.label}</span>
          <span className={`num${r.minus ? ' neg' : ''}${r.bonus ? ' bonus' : ''}`}>
            {r.minus ? `−${formatMoney(-r.value)}` : r.plus ? `+${formatMoney(r.value)}` : formatMoney(r.value)}
          </span>
        </div>
      ))}

      <div className="breakdown__row breakdown__row--total">
        <span>{t.month.gross}</span>
        <span className="num">{formatMoney(gross)}</span>
      </div>

      <div
        className="breakdown__row breakdown__row--tappable"
        onClick={() => { if (!editingNet) { setEditingNet(true); setNetInput(String(net || '')) } }}
      >
        <span>{t.month.net}</span>
        {editingNet ? (
          <input
            className="input input--inline"
            type="number"
            inputMode="numeric"
            value={netInput}
            onChange={e => setNetInput(e.target.value)}
            onBlur={saveNet}
            onKeyDown={e => e.key === 'Enter' && saveNet()}
            autoFocus
          />
        ) : (
          <span className={net ? 'num' : 'breakdown__placeholder'}>
            {net ? formatMoney(net) : t.month.enterNet}
          </span>
        )}
      </div>

      {net && (
        <div className="breakdown__row">
          <span>{t.month.deductions}</span>
          <span className="num neg">−{formatMoney(Math.max(0, gross - net))}</span>
        </div>
      )}
    </div>
  )
}
