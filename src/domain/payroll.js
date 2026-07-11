import { isWeekend } from './dates'

// ── Pay rules ─────────────────────────────────────────────────────────────
// Weekday shift:        rate × 8
// Weekend shift:        rate × 8 × 1.5
// Night shift:          rate × 8 + rate × nightBonusMultiplier × nightBonusHours
// Overtime:             rate × 1.5 (weekday) / × 2.0 (weekend) / × nightOvertimeMultiplier
// Public holiday base:  rate × 8 × (1 + weekdayBase) or × (1.5 + weekendBase)
// Absence:              −(rate × 8 + optional bonus deduction)
// Vacation / half day:  paid at rate × 8 (covered by the ×209 base in KR mode)

function holidayRatesOf(settings) {
  const hr = settings?.holidayRates || {}
  return {
    weekdayBase: hr.weekdayBase ?? 0,
    weekdayOvertime: hr.weekdayOvertime ?? 0,
    weekendBase: hr.weekendBase ?? 0,
    weekendOvertime: hr.weekendOvertime ?? 0,
  }
}

function nightShiftOf(settings) {
  const ns = settings?.nightShift || {}
  return {
    bonusMultiplier: ns.bonusMultiplier ?? 0,
    bonusHours: ns.bonusHours ?? 0,
    overtimeMultiplier: ns.overtimeMultiplier ?? 0,
  }
}

function overtimeRate(type, weekend, holiday, rate, hr, ns) {
  if (holiday) return rate * (weekend ? hr.weekendOvertime : hr.weekdayOvertime)
  if (type === 'night') return rate * ns.overtimeMultiplier
  return rate * (weekend ? 2.0 : 1.5)
}

// Gross for a single day (shown live in the day editor and stored on save)
export function calcDayGross(day, rate, settings) {
  const { type, dateStr, overtime = 0, bonusDeduction = 0, isHoliday = false } = day
  const weekend = isWeekend(dateStr)
  const hr = holidayRatesOf(settings)
  const ns = nightShiftOf(settings)

  let base
  if (isHoliday && type !== 'absence' && type !== 'off') {
    base = weekend
      ? rate * 8 * (1.5 + hr.weekendBase)
      : rate * 8 * (1 + hr.weekdayBase)
  } else {
    switch (type) {
      case 'day': base = weekend ? rate * 8 * 1.5 : rate * 8; break
      case 'night': base = rate * 8 + rate * ns.bonusMultiplier * ns.bonusHours; break
      case 'vacation':
      case 'half': base = rate * 8; break
      case 'absence': base = -(rate * 8 + bonusDeduction); break
      default: base = 0 // off, casual
    }
  }

  if (overtime > 0 && ['day', 'night', 'half'].includes(type)) {
    base += overtimeRate(type, weekend, isHoliday, rate, hr, ns) * overtime
  }
  return base
}

// KR mode: pay components above/below the ×209 monthly base for a single day
function calcDayExtras(day, rate, settings) {
  const { type, dateStr, overtime = 0, bonusDeduction = 0, isHoliday = false } = day
  const weekend = isWeekend(dateStr)
  const hr = holidayRatesOf(settings)
  const ns = nightShiftOf(settings)

  let overtimePay = 0, holidayPremium = 0, weekendPremium = 0, nightPremium = 0, deduction = 0

  if (isHoliday) {
    if (type === 'absence') {
      deduction = rate * 8 + bonusDeduction
    } else if (type === 'day' || type === 'night') {
      if (weekend) {
        weekendPremium = rate * 8 * 1.5
        holidayPremium = rate * 8 * hr.weekendBase
      } else {
        holidayPremium = rate * 8 * hr.weekdayBase
      }
    }
    // off / vacation / half on a holiday: covered by base — no extra, no deduction
  } else {
    switch (type) {
      case 'day': if (weekend) weekendPremium = rate * 8 * 1.5; break
      case 'night':
        if (weekend) weekendPremium = rate * 8
        nightPremium = rate * ns.bonusMultiplier * ns.bonusHours
        break
      case 'absence': deduction = rate * 8 + bonusDeduction; break
      // off / vacation / half: covered by the ×209 base
    }
  }

  if (overtime > 0 && ['day', 'night', 'half'].includes(type)) {
    overtimePay = overtimeRate(type, weekend, isHoliday, rate, hr, ns) * overtime
  }

  return { overtimePay, holidayPremium, weekendPremium, nightPremium, deduction }
}

export function bonusForMonth(allowances, month) {
  if (!allowances?.bonusEnabled) return 0
  const bonusMonths = allowances.bonusMonths || [3, 6, 9, 12]
  return bonusMonths.includes(month) ? (allowances.bonus || 0) : 0
}

export function isKRMode(settings) {
  if (!settings) return false
  return (settings.laborLaw ?? (settings.currency === 'KRW' ? 'KR' : 'default')) === 'KR'
}

// KR mode: full month breakdown around the rate×209 base
export function calcMonthBreakdownKR(monthDayKeys, days, rate, settings, month) {
  const base = rate * 209
  let overtime = 0, holiday = 0, weekend = 0, deductions = 0, casual = 0

  for (const dateStr of monthDayKeys) {
    const d = days[dateStr]
    if (!d) continue
    if (d.type === 'casual') { casual += d.gross || 0; continue }
    const e = calcDayExtras({ ...d, dateStr }, rate, settings)
    overtime += e.overtimePay + e.nightPremium
    holiday += e.holidayPremium
    weekend += e.weekendPremium
    deductions += e.deduction
  }

  const bonus = bonusForMonth(settings.allowances, month)
  const allowances = (settings.allowances?.job || 0) + (settings.allowances?.seniority || 0)
  const total = Math.round(base + overtime + holiday + weekend + allowances + bonus + casual - deductions)

  return { base, overtime, holiday, weekend, allowances, bonus, deductions, casual, total }
}

// Default mode: sum of logged days + allowances (+ bonus added by caller)
export function calcMonthGrossDefault(monthDayKeys, days, settings, month) {
  const logged = monthDayKeys.filter(k => days[k])
  if (logged.length === 0) return 0
  const dailySum = logged.reduce((s, k) => s + (days[k].gross || 0), 0)
  const allowances = (settings.allowances?.job || 0) + (settings.allowances?.seniority || 0)
  return Math.round(dailySum + allowances + bonusForMonth(settings.allowances, month))
}

// Unified month gross for any mode
export function calcMonthGross(monthDayKeys, days, rate, settings, month) {
  if (isKRMode(settings)) return calcMonthBreakdownKR(monthDayKeys, days, rate, settings, month).total
  return calcMonthGrossDefault(monthDayKeys, days, settings, month)
}

// Month stats for the dashboard chips
export function calcMonthStats(monthDayKeys, days) {
  let worked = 0, off = 0, vacation = 0, overtime = 0, holidays = 0
  for (const k of monthDayKeys) {
    const d = days[k]
    if (!d) continue
    if (['day', 'night', 'vacation', 'half', 'absence'].includes(d.type)) worked++
    if (d.type === 'off') off++
    if (d.type === 'vacation') vacation += 1
    if (d.type === 'half') vacation += 0.5
    overtime += d.overtime || 0
    if (d.isHoliday) holidays++
  }
  return { worked, off, vacation, overtime, holidays }
}

// Vacation days used across a year (vacation = 1, half day = 0.5)
export function vacationUsedInYear(days, year) {
  const prefix = String(year)
  let used = 0
  for (const [k, d] of Object.entries(days)) {
    if (!k.startsWith(prefix)) continue
    if (d.type === 'vacation') used += 1
    else if (d.type === 'half') used += 0.5
  }
  return used
}
