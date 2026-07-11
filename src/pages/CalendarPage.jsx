import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../app/store'
import { getMonthDays, monthKeyOf, isFuture, isToday, isWeekend, todayStr } from '../domain/dates'
import { calcMonthGross } from '../domain/payroll'
import { haptics } from '../services/haptics'
import DayEditor from '../components/DayEditor'
import MonthBreakdown from '../components/MonthBreakdown'

function dotType(dayData) {
  if (!dayData) return null
  if (dayData.isHoliday && dayData.type !== 'absence') return 'holiday'
  return dayData.type
}

export default function CalendarPage({ initialMonth }) {
  const { t, intl, settings, days, months, ensureYear, formatMoney, formatMoneyCompact } = useApp()
  const today = todayStr()

  const [view, setView] = useState({
    year: parseInt(today.slice(0, 4)),
    month: initialMonth || parseInt(today.slice(5, 7)),
  })
  const [sheetDate, setSheetDate] = useState(null)
  const [footerOpen, setFooterOpen] = useState(false)

  useEffect(() => { ensureYear(view.year) }, [view.year, ensureYear])

  const { year, month } = view
  const monthDayKeys = useMemo(() => getMonthDays(year, month), [year, month])
  const rate = settings.rates[String(year)] || 0

  const gross = useMemo(
    () => calcMonthGross(monthDayKeys, days, rate, settings, month),
    [monthDayKeys, days, rate, settings, month]
  )
  const net = months[monthKeyOf(year, month)]?.net || null

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

  // Grid, week starts Monday
  const firstDow = new Date(year, month - 1, 1).getDay()
  const offset = firstDow === 0 ? 6 : firstDow - 1
  const cells = [...Array(offset).fill(null), ...monthDayKeys]
  while (cells.length % 7 !== 0) cells.push(null)

  const weekHeaders = [1, 2, 3, 4, 5, 6, 0].map(i => t.weekdays.short[i])

  return (
    <div className="page page--calendar">
      <div className="month-nav month-nav--calendar">
        <button type="button" className="month-nav__arrow" aria-label="‹" onClick={() => shiftMonth(-1)}>‹</button>
        <span className="month-nav__label">{monthLabel}</span>
        <button type="button" className="month-nav__arrow" aria-label="›" onClick={() => shiftMonth(1)}>›</button>
      </div>

      <div className="cal-head">
        {weekHeaders.map((h, i) => (
          <div key={i} className={`cal-head__cell${i >= 5 ? ' cal-head__cell--weekend' : ''}`}>{h}</div>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <div key={`e-${idx}`} className="cal-cell cal-cell--empty" />
          const d = days[dateStr]
          const dt = dotType(d)
          let cls = 'cal-cell'
          if (isWeekend(dateStr)) cls += ' cal-cell--weekend'
          if (isToday(dateStr)) cls += ' cal-cell--today'
          if (!d && isFuture(dateStr)) cls += ' cal-cell--future'
          if (d) cls += ' cal-cell--filled'
          return (
            <button key={dateStr} type="button" className={cls} onClick={() => setSheetDate(dateStr)}>
              <span className="cal-cell__num num">{parseInt(dateStr.slice(8, 10))}</span>
              {d && <span className={`dot dot--${dt}`} />}
              {d && (d.gross || 0) !== 0 && (
                <span className={`cal-cell__amount num${d.gross < 0 ? ' neg' : ''}`}>
                  {formatMoneyCompact(d.gross)}
                </span>
              )}
              {d?.note && <span className="cal-cell__note-mark" />}
            </button>
          )
        })}
      </div>

      <div className="cal-legend">
        {['day', 'night', 'off', 'vacation', 'absence', 'holiday'].map(k => (
          <span key={k} className="cal-legend__item">
            <span className={`dot dot--${k}`} />
            {k === 'holiday' ? t.dashboard.holidays : t.dayTypes[k]}
          </span>
        ))}
      </div>

      <div className={`month-footer${footerOpen ? ' month-footer--open' : ''}`}>
        <button type="button" className="month-footer__summary" onClick={() => { haptics.light(); setFooterOpen(o => !o) }}>
          <span className="month-footer__label">{t.month.gross}</span>
          <span className="month-footer__amounts">
            <span className="month-footer__gross num">{formatMoney(gross)}</span>
            {net && <span className="month-footer__net num">{t.month.net}: {formatMoney(net)}</span>}
          </span>
          <span className={`month-footer__chevron${footerOpen ? ' month-footer__chevron--up' : ''}`}>⌄</span>
        </button>
        {footerOpen && (
          <div className="month-footer__detail">
            <MonthBreakdown year={year} month={month} />
          </div>
        )}
      </div>

      {sheetDate && <DayEditor dateStr={sheetDate} onClose={() => setSheetDate(null)} />}
    </div>
  )
}
