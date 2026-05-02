import { isWeekend, isFuture, isToday } from '../utils/dates'

export default function DayRow({ dateStr, dayData, t, lang, formatMoney, onClick }) {
  const date = new Date(dateStr)
  const dow = date.getDay()
  const dayNum = date.getDate()
  const weekdayShort = (lang === 'ru'
    ? ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
    : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[dow]

  const future = isFuture(dateStr)
  const today = isToday(dateStr)
  const weekend = isWeekend(dateStr)
  const filled = !!dayData
  const unfilled = !filled && !future

  let cls = 'day-row'
  if (weekend) cls += ' day-row--weekend'
  if (today) cls += ' day-row--today'
  if (future) cls += ' day-row--future'

  const typeLabel = dayData ? (t.dayTypes[dayData.type] || dayData.type) : ''

  return (
    <div className={cls} onClick={onClick}>
      <div className="day-row__left">
        {unfilled && <span className="day-row__dot" />}
        <span className="day-row__num">{dayNum}</span>
        <span className="day-row__dow">{weekdayShort}</span>
      </div>
      <div className="day-row__center">
        {dayData && (
          <span className={`day-row__type-badge${dayData.type === '결근' ? ' day-row__type-badge--negative' : ''}`}>
            {typeLabel}
          </span>
        )}
        {dayData?.note && <span className="day-row__note">{dayData.note}</span>}
      </div>
      <div className="day-row__right">
        {filled && !future && (
          <>
            <span className={`day-row__gross${dayData.gross < 0 ? ' day-row__gross--negative' : ''}`}>{formatMoney(dayData.gross)}</span>
            {dayData.overtime > 0 && (
              <span className="day-row__ot">+{dayData.overtime}h</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
