export function useWeekTemplate(settings, days) {
  function getDefaultForDate(dateStr) {
    const today = new Date().toISOString().slice(0, 10)
    // Past empty days: no template, plain defaults
    if (dateStr < today) return { type: '주간', overtime: 0 }
    // Today and future empty days: apply week template
    const dow = String(new Date(dateStr).getDay())
    const template = settings?.weekTemplate?.[dow]
    if (template) return { type: template.type, overtime: template.overtime }
    // Fallback: copy last filled day
    const sortedKeys = Object.keys(days).filter(k => k < dateStr).sort()
    if (sortedKeys.length > 0) {
      const prev = days[sortedKeys[sortedKeys.length - 1]]
      return { type: prev.type, overtime: prev.overtime }
    }
    return { type: '주간', overtime: 0 }
  }
  return { getDefaultForDate }
}
