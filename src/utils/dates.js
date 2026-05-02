export function formatDate(dateStr, locale) {
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function isWeekend(dateStr) {
  const d = new Date(dateStr)
  return d.getDay() === 0 || d.getDay() === 6
}

export function isFuture(dateStr) {
  return dateStr > todayStr()
}

export function isToday(dateStr) {
  return dateStr === todayStr()
}
