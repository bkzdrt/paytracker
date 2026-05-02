export const DAY_TYPES = ['주간', '야간', '쉬는 날', '연차', '반차', '결근']

export function calcDayGross(type, overtime, rate, dateStr, bonusDeduction = 0) {
  const dow = new Date(dateStr).getDay()
  const isWeekend = dow === 0 || dow === 6
  let base = 0
  switch (type) {
    case '주간': base = isWeekend ? rate * 8 * 1.5 : rate * 8; break
    case '야간': base = rate * 8 + (rate / 2) * 7.5; break
    case '쉬는 날': base = 0; break
    case '연차': base = rate * 8; break
    case '반차': base = rate * 4; break
    case '결근': base = -(rate * 8 + bonusDeduction); break
    default: base = 0
  }
  if (overtime > 0 && type !== '쉬는 날' && type !== '연차' && type !== '결근') {
    base += (isWeekend ? rate * 2.0 : rate * 1.5) * overtime
  }
  return base
}

export function calcMonthGross(days, allowances) {
  const hasData = Object.keys(days).length > 0
  if (!hasData) return 0
  const dailySum = Object.values(days).reduce((s, d) => s + (d.gross || 0), 0)
  return dailySum + allowances.job + allowances.seniority
}

export function bonusForMonth(allowances, month) {
  const bMonths = allowances.bonusMonths || [3, 6, 9, 12]
  if (!bMonths.includes(month) || !allowances.bonusEnabled) return 0
  return allowances.bonus || 0
}

export function getMonthDays(year, month) {
  const days = []
  const count = new Date(year, month, 0).getDate()
  for (let d = 1; d <= count; d++) {
    const mm = String(month).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push(`${year}-${mm}-${dd}`)
  }
  return days
}

export function getWeekNumber(dateStr) {
  const d = new Date(dateStr)
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
  return Math.ceil((d.getDate() + firstDay.getDay()) / 7)
}

export function getQuarter(month) {
  return Math.ceil(month / 3)
}

// Count '결근' (прогул) days in a quarter — for display only
export function countQuarterAbsences(days, year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1
  let count = 0
  for (let m = startMonth; m < startMonth + 3; m++) {
    getMonthDays(year, m).forEach(dateStr => {
      const dow = new Date(dateStr).getDay()
      if (dow >= 1 && dow <= 5 && days[dateStr]?.type === '결근') count++
    })
  }
  return count
}

// Bonus is always earned in bonus months; manual deductBonus on '결근' days is the only deduction mechanism
export function isQuarterlyBonusEarned() {
  return true
}

// Korean law: base monthly salary = rate × 209h
// Returns projected gross for current month
export function calcProjected(days, monthDayKeys, settings, currentMonth) {
  const year = parseInt(monthDayKeys[0]?.slice(0, 4) || new Date().getFullYear())
  const rate = settings.rates[String(year)] || 13589
  const today = new Date().toISOString().slice(0, 10)

  const base = rate * 209

  // Adjustments from logged past days
  let adjustment = 0
  monthDayKeys.filter(k => k <= today && days[k]).forEach(dateStr => {
    const d = days[dateStr]
    const dow = new Date(dateStr).getDay()
    const isWeekend = dow === 0 || dow === 6
    const isWeekday = !isWeekend
    switch (d.type) {
      case '주간': if (isWeekend) adjustment += rate * 8 * 0.5; break
      case '쉬는 날': if (isWeekday) adjustment -= rate * 8; break
      case '야간': adjustment += (rate / 2) * 7.5; break
      case '반차': adjustment -= rate * 4; break
      case '결근': adjustment -= rate * 8; break
    }
    if (d.overtime > 0) adjustment += (isWeekend ? rate * 2.0 : rate * 1.5) * d.overtime
  })

  // Project future days using week template
  monthDayKeys.filter(k => k > today).forEach(dateStr => {
    const dow = new Date(dateStr).getDay()
    const isWeekend = dow === 0 || dow === 6
    const tmpl = settings.weekTemplate?.[String(dow)]
    if (!tmpl) return
    switch (tmpl.type) {
      case '주간': if (isWeekend) adjustment += rate * 8 * 0.5; break
      case '쉬는 날': if (!isWeekend) adjustment -= rate * 8; break
      case '야간': adjustment += (rate / 2) * 7.5; break
      case '반차': adjustment -= rate * 4; break
      case '결근': adjustment -= rate * 8; break
    }
    if (tmpl.overtime > 0) adjustment += (isWeekend ? rate * 2.0 : rate * 1.5) * tmpl.overtime
  })

  // Allowances
  const baseAllowances = settings.allowances.job + settings.allowances.seniority

  // Quarterly bonus in projection
  const bonusMonths = settings.allowances.bonusMonths || [3, 6, 9, 12]
  const isBonusMonth = bonusMonths.includes(currentMonth)
  const quarter = getQuarter(currentMonth)
  const bonusEarned = isBonusMonth && settings.allowances.bonusEnabled && isQuarterlyBonusEarned(days, year, quarter)
  const bonusAmount = bonusEarned ? settings.allowances.bonus : 0

  return Math.round(base + baseAllowances + bonusAmount + adjustment)
}
