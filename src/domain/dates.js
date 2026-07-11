export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isWeekend(dateStr) {
  const dow = new Date(dateStr).getDay()
  return dow === 0 || dow === 6
}

export function isFuture(dateStr) {
  return dateStr > todayStr()
}

export function isToday(dateStr) {
  return dateStr === todayStr()
}

// "2026-07" for year=2026, month=7
export function monthKeyOf(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

// All date strings of a month, "YYYY-MM-DD"
export function getMonthDays(year, month) {
  const count = new Date(year, month, 0).getDate()
  const prefix = monthKeyOf(year, month)
  return Array.from({ length: count }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`)
}
