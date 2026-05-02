export const DAY_TYPES = ['주간', '야간', '쉬는 날', '연차', '반차', '결근', 'разовая']

export function calcDayGross(type, overtime, rate, dateStr, bonusDeduction = 0, isHoliday = false, holidayRates = {}, nightShift = {}) {
  const dow = new Date(dateStr).getDay()
  const isWeekend = dow === 0 || dow === 6
  const hr = {
    weekdayBase:     holidayRates.weekdayBase     ?? 1.5,
    weekdayOvertime: holidayRates.weekdayOvertime ?? 2.0,
    weekendBase:     holidayRates.weekendBase     ?? 1.5,
    weekendOvertime: holidayRates.weekendOvertime ?? 2.0,
  }
  const ns = {
    bonusMultiplier:    nightShift.bonusMultiplier    ?? 0.5,
    bonusHours:         nightShift.bonusHours         ?? 7.5,
    overtimeMultiplier: nightShift.overtimeMultiplier ?? 2.0,
  }

  let base = 0
  if (isHoliday && type !== '결근' && type !== '쉬는 날') {
    // holiday weekday:  base(1×) + holiday bonus(weekdayBase×)
    // holiday weekend:  base(1.5×) + holiday bonus(weekendBase×)
    base = isWeekend
      ? rate * 8 * (1.5 + hr.weekendBase)
      : rate * 8 * (1 + hr.weekdayBase)
  } else {
    switch (type) {
      case '주간': base = isWeekend ? rate * 8 * 1.5 : rate * 8; break
      case '야간': base = rate * 8 + rate * ns.bonusMultiplier * ns.bonusHours; break
      case '쉬는 날': base = 0; break
      case '연차': base = rate * 8; break
      case '반차': base = rate * 8; break
      case '결근': base = -(rate * 8 + bonusDeduction); break
      case 'разовая': base = 0; break
      default: base = 0
    }
  }

  if (overtime > 0 && type !== '쉬는 날' && type !== '연차' && type !== '결근' && type !== 'разовая') {
    const otRate = isHoliday
      ? rate * (isWeekend ? hr.weekendOvertime : hr.weekdayOvertime)
      : type === '야간' ? rate * ns.overtimeMultiplier : (isWeekend ? rate * 2.0 : rate * 1.5)
    base += otRate * overtime
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

// KR mode: extras above the 209h base for a single day
export function calcDayExtras(type, overtime, rate, dateStr, bonusDeduction = 0, isHoliday = false, holidayRates = {}, nightShift = {}) {
  const dow = new Date(dateStr).getDay()
  const isWeekend = dow === 0 || dow === 6
  const hr = {
    weekdayBase:     holidayRates.weekdayBase     ?? 1.5,
    weekdayOvertime: holidayRates.weekdayOvertime ?? 2.0,
    weekendBase:     holidayRates.weekendBase     ?? 1.5,
    weekendOvertime: holidayRates.weekendOvertime ?? 2.0,
  }
  const ns = {
    bonusMultiplier:    nightShift.bonusMultiplier    ?? 0.5,
    bonusHours:         nightShift.bonusHours         ?? 7.5,
    overtimeMultiplier: nightShift.overtimeMultiplier ?? 2.0,
  }

  let overtimePay = 0, holidayPremium = 0, weekendPremium = 0, nightPremium = 0, deduction = 0

  if (isHoliday) {
    // Holiday: no deductions; premium only for worked shifts
    if (type === '결근') {
      deduction = rate * 8 + bonusDeduction
    } else if (type === '주간' || type === '야간') {
      if (isWeekend) {
        // weekend: already earned the weekend premium (1.5×), plus holiday bonus on top
        weekendPremium = rate * 8 * 1.5
        holidayPremium = rate * 8 * hr.weekendBase
      } else {
        holidayPremium = rate * 8 * hr.weekdayBase
      }
    }
    // 쉬는 날 / 연차 / 반차 on holiday: covered by base, no extra, no deduction
  } else {
    switch (type) {
      case '주간': if (isWeekend) weekendPremium = rate * 8 * 1.5; break
      case '야간': if (isWeekend) weekendPremium = rate * 8; nightPremium = rate * ns.bonusMultiplier * ns.bonusHours; break
      case '쉬는 날': break  // scheduled rest day, no deduction from 209h base
      case '반차': break     // half-day: base (rate×209) covers it, no deduction
      case '결근': deduction = rate * 8 + bonusDeduction; break
    }
  }

  if (overtime > 0 && type !== '쉬는 날' && type !== '연차' && type !== '결근') {
    const otRate = isHoliday
      ? rate * (isWeekend ? hr.weekendOvertime : hr.weekdayOvertime)
      : type === '야간' ? rate * ns.overtimeMultiplier : (isWeekend ? rate * 2.0 : rate * 1.5)
    overtimePay = otRate * overtime
  }

  return { overtimePay, holidayPremium, weekendPremium, nightPremium, deduction }
}

export function calcMonthBreakdownKR(monthDayKeys, days, rate, settings, currentMonth) {
  const base = rate * 209
  let overtime = 0, holiday = 0, weekend = 0, deductions = 0, casual = 0

  for (const dateStr of monthDayKeys) {
    const d = days[dateStr]
    if (!d) continue
    if (d.type === 'разовая') { casual += d.gross || 0; continue }
    const e = calcDayExtras(d.type, d.overtime || 0, rate, dateStr, d.bonusDeduction || 0, d.isHoliday || false, settings.holidayRates || {}, settings.nightShift || {})
    overtime += e.overtimePay + e.nightPremium
    holiday += e.holidayPremium
    weekend += e.weekendPremium
    deductions += e.deduction
  }

  const bonusAmount = bonusForMonth(settings.allowances, currentMonth)
  const allowances = settings.allowances.job + settings.allowances.seniority
  const total = Math.round(base + overtime + holiday + weekend + allowances + bonusAmount + casual - deductions)

  return { base, overtime, holiday, weekend, allowances, bonus: bonusAmount, deductions, casual, total }
}

export function calcMonthGrossKR(monthDayKeys, days, rate, settings, currentMonth) {
  return calcMonthBreakdownKR(monthDayKeys, days, rate, settings, currentMonth).total
}

export function isKRMode(settings) {
  if (!settings) return false
  return (settings.laborLaw ?? (settings.currency === 'KRW' ? 'KR' : 'default')) === 'KR'
}

// Returns projected gross for current month
export function calcProjected(days, monthDayKeys, settings, currentMonth) {
  const year = parseInt(monthDayKeys[0]?.slice(0, 4) || new Date().getFullYear())
  const rate = settings.rates[String(year)] || 13589
  const allowances = settings.allowances.job + settings.allowances.seniority
  const bonusAmount = bonusForMonth(settings.allowances, currentMonth)

  if (isKRMode(settings)) {
    const base = rate * 209
    let positiveExtras = 0, deductions = 0, shiftCount = 0

    for (const dateStr of monthDayKeys) {
      const d = days[dateStr]
      if (!d) continue
      if (d.type === 'разовая') { positiveExtras += d.gross || 0; continue }
      const e = calcDayExtras(d.type, d.overtime || 0, rate, dateStr, d.bonusDeduction || 0, d.isHoliday || false, settings.holidayRates || {}, settings.nightShift || {})
      positiveExtras += e.overtimePay + e.nightPremium + e.holidayPremium + e.weekendPremium
      deductions += e.deduction
      if (d.type === '주간' || d.type === '야간') shiftCount++
    }

    const unloggedCount = monthDayKeys.filter(k => !days[k]).length
    const avgDailyExtra = shiftCount > 0 ? positiveExtras / shiftCount : 0

    return Math.round(base + positiveExtras + avgDailyExtra * unloggedCount + allowances + bonusAmount - deductions)
  }

  // Default mode: template-based projection
  const base = rate * 209
  const today = new Date().toISOString().slice(0, 10)
  const nsProj = settings.nightShift || {}
  const nightBonusProj = rate * (nsProj.bonusMultiplier ?? 0.5) * (nsProj.bonusHours ?? 7.5)
  const nightOTProj = nsProj.overtimeMultiplier ?? 2.0
  let adjustment = 0

  monthDayKeys.filter(k => k <= today && days[k]).forEach(dateStr => {
    const d = days[dateStr]
    const dow = new Date(dateStr).getDay()
    const isWeekend = dow === 0 || dow === 6
    switch (d.type) {
      case '주간': if (isWeekend) adjustment += rate * 8 * 0.5; break
      case '야간': adjustment += nightBonusProj; break
      case '반차': break
      case '결근': adjustment -= rate * 8; break
    }
    if (d.overtime > 0) {
      const otRate = d.type === '야간' ? nightOTProj : (isWeekend ? 2.0 : 1.5)
      adjustment += rate * otRate * d.overtime
    }
  })

  monthDayKeys.filter(k => k > today).forEach(dateStr => {
    const dow = new Date(dateStr).getDay()
    const isWeekend = dow === 0 || dow === 6
    const tmpl = settings.weekTemplate?.[String(dow)]
    if (!tmpl) return
    switch (tmpl.type) {
      case '주간': if (isWeekend) adjustment += rate * 8 * 0.5; break
      case '야간': adjustment += nightBonusProj; break
      case '반차': break
      case '결근': adjustment -= rate * 8; break
    }
    if (tmpl.overtime > 0) {
      const otRate = tmpl.type === '야간' ? nightOTProj : (isWeekend ? 2.0 : 1.5)
      adjustment += rate * otRate * tmpl.overtime
    }
  })

  return Math.round(base + adjustment + allowances + bonusAmount)
}
