export default function MonthHeader({ year, month, onPrev, onNext, t, lang }) {
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(
    lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long' }
  )
  const label = lang === 'ru'
    ? `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`
    : `${monthName} ${year}`
  return (
    <div className="month-header">
      <button className="month-header__arrow" onClick={onPrev}>&#8249;</button>
      <span className="month-header__title">{label}</span>
      <button className="month-header__arrow" onClick={onNext}>&#8250;</button>
    </div>
  )
}
