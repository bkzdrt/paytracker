export function exportCSV(days, months, year, locale) {
  const header = 'Date,Weekday,Type,Gross,Overtime Hours,Note,Month Net\n'
  const yearDays = Object.keys(days)
    .filter(k => k.startsWith(year))
    .sort()
  const rows = yearDays.map(dateStr => {
    const d = days[dateStr]
    const date = new Date(dateStr)
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
    const monthKey = dateStr.slice(0, 7)
    const net = months[monthKey]?.net || ''
    return [dateStr, weekday, d.type, d.gross, d.overtime, `"${d.note||''}"`, net].join(',')
  })
  const csv = header + rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `paytracker-${year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
