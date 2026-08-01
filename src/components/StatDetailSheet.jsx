import { useEffect, useRef } from 'react'
import { useApp } from '../app/store'
import { WORKED_TYPES } from '../domain/types'

// Rows contributing to a given dashboard stat, in date order.
function rowsFor(statKey, monthDayKeys, days, t) {
  const rows = []
  for (const k of monthDayKeys) {
    const d = days[k]
    if (!d) continue
    let detail = null, dot = d.type
    switch (statKey) {
      case 'worked':
        if (WORKED_TYPES.includes(d.type)) detail = t.dayTypes[d.type]
        break
      case 'off':
        if (d.type === 'off') detail = t.dayTypes.off
        break
      case 'vacation':
        if (d.type === 'vacation') detail = t.dayTypes.vacation
        else if (d.type === 'half') detail = t.dayTypes.half
        break
      case 'overtime':
        if ((d.overtime || 0) > 0) detail = `+${d.overtime} ${t.dashboard.hoursSuffix}`
        break
      case 'holidays':
        if (d.isHoliday) { detail = t.dayTypes[d.type]; dot = 'holiday' }
        break
      default: break
    }
    if (detail == null) continue
    rows.push({ key: k, day: parseInt(k.slice(8, 10)), dateStr: k, detail, dot })
  }
  return rows
}

// Bottom sheet listing exactly which days make up a dashboard stat.
export default function StatDetailSheet({ statKey, title, value, monthDayKeys, days, onClose }) {
  const { t, intl } = useApp()
  const rows = rowsFor(statKey, monthDayKeys, days, t)

  const touchY = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const weekday = (dateStr) => {
    const wd = new Date(dateStr).toLocaleDateString(intl, { weekday: 'short' })
    return wd.charAt(0).toUpperCase() + wd.slice(1)
  }

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="sheet"
        role="dialog"
        aria-label={title}
        onTouchStart={e => { touchY.current = e.touches[0].clientY }}
        onTouchEnd={e => {
          if (touchY.current != null && e.changedTouches[0].clientY - touchY.current > 80) onClose()
          touchY.current = null
        }}
      >
        <div className="sheet__handle" />
        <div className="sheet__date">{title} · <span className="num">{value ?? rows.length}</span></div>

        {rows.length === 0 ? (
          <p className="stat-detail__empty">{t.dashboard.statEmpty}</p>
        ) : (
          <ul className="stat-detail__list">
            {rows.map(r => (
              <li key={r.key} className="stat-detail__row">
                <span className={`dot dot--${r.dot}`} />
                <span className="stat-detail__day num">{r.day}</span>
                <span className="stat-detail__wd">{weekday(r.dateStr)}</span>
                <span className="stat-detail__detail">{r.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
