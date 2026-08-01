import { isWeekend } from './dates'

// ── Pay rules ─────────────────────────────────────────────────────────────
// Premiums stack the way 근로기준법 §56 defines them: overtime, night and
// holiday are separate additions, each on top of the ordinary wage.
//
// Weekday shift:        rate × 8
// Weekend shift:        rate × 8 × 1.5
// Night shift:          weekday/weekend base + rate × premium × night hours
// Overtime:             rate × 1.5 (weekday) / × 2.0 (weekend); a weekday night
//                       shift uses the configurable night overtime factor
// Public holiday base:  rate × 8 × (1 + weekdayBase) or × (1.5 + weekendBase),
//                       plus the night premium when the shift is a night one
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

const toMin = (t) => {
  const [h, m] = String(t ?? '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// Minute range of a shift; end rolls past midnight for overnight shifts.
function shiftRange(start, end) {
  const s = toMin(start)
  let e = toMin(end)
  if (e <= s) e += 24 * 60
  return [s, e]
}

// The night window defaults to the legal 22:00–06:00 (근로기준법 §56), but some
// employers count a different span, so it is configurable per settings.
const inWindow = (m, ws, we) => {
  const d = ((m % 1440) + 1440) % 1440
  if (ws === we) return false
  return ws < we ? (d >= ws && d < we) : (d >= ws || d < we) // latter wraps midnight
}

const round2 = (n) => Math.round(n * 100) / 100

// Total length of a shift, in hours (before any break).
export function shiftHoursOf(start, end) {
  const [s, e] = shiftRange(start, end)
  return round2((e - s) / 60)
}

// Hours of a shift [start, end) falling inside the night window.
// Times are "HH:MM"; end may roll past midnight.
export function nightHoursOf(start, end, windowStart = '22:00', windowEnd = '06:00') {
  const [s, e] = shiftRange(start, end)
  const ws = toMin(windowStart), we = toMin(windowEnd)
  let mins = 0
  for (let m = s; m < e; m++) if (inWindow(m, ws, we)) mins++
  return round2(mins / 60)
}

// Night hours actually paid the premium: the break is unpaid, so it comes off.
// Memoised on the schedule — this runs per logged day, and the year chart walks
// twelve months at a time, so recomputing the minute scan each call adds up.
let nightHoursMemo = { key: null, hours: 0 }
export function paidNightHoursOf(ns = {}) {
  const start = ns.start ?? '22:00', end = ns.end ?? '06:00'
  const ws = ns.windowStart ?? '22:00', we = ns.windowEnd ?? '06:00'
  const brk = ns.breakMinutes || 0
  const key = `${start}|${end}|${ws}|${we}|${brk}`
  if (nightHoursMemo.key === key) return nightHoursMemo.hours
  const hours = Math.max(0, round2(nightHoursOf(start, end, ws, we) - brk / 60))
  nightHoursMemo = { key, hours }
  return hours
}

// Paid length of the configured shift (clock time minus the unpaid break).
export function shiftPaidHoursOf(ns = {}) {
  const total = shiftHoursOf(ns.start ?? '22:00', ns.end ?? '06:00')
  return Math.max(0, round2(total - (ns.breakMinutes || 0) / 60))
}

// Overtime the shift itself implies: anything past the standard working day.
export function autoOvertimeOf(ns = {}, standardHours = 8) {
  return Math.max(0, round2(shiftPaidHoursOf(ns) - standardHours))
}

// The shift split into consecutive day/night runs, for the settings timeline.
export function shiftSegments(start, end, windowStart = '22:00', windowEnd = '06:00') {
  const [s, e] = shiftRange(start, end)
  const ws = toMin(windowStart), we = toMin(windowEnd)
  const segments = []
  for (let m = s; m < e; m++) {
    const night = inWindow(m, ws, we)
    const last = segments[segments.length - 1]
    if (last && last.night === night) last.minutes++
    else segments.push({ night, minutes: 1 })
  }
  return segments.map(seg => ({ night: seg.night, hours: round2(seg.minutes / 60) }))
}

// The night-work rates the payroll math runs on: a +50% (default) premium on
// each night hour, plus the overtime factor for hours past the standard day.
function nightShiftOf(settings) {
  const ns = settings?.nightShift || {}
  // Legacy raw-coefficient shape (pre-schedule): use as-is.
  if (ns.start === undefined && ns.premiumPercent === undefined) {
    return {
      bonusMultiplier: ns.bonusMultiplier ?? 0,
      bonusHours: ns.bonusHours ?? 0,
      overtimeMultiplier: ns.overtimeMultiplier ?? 0,
    }
  }
  const premium = (ns.premiumPercent ?? 50) / 100
  return {
    bonusMultiplier: premium,
    // Every night hour earns the premium, including overtime ones: the overtime
    // factor here is pure overtime and does not bake the night premium in.
    bonusHours: paidNightHoursOf(ns),
    // Pure overtime factor; the night premium is added separately per night hour.
    overtimeMultiplier: ns.overtimeMultiplier ?? 1.5,
  }
}

function overtimeRate(type, weekend, holiday, rate, hr, ns) {
  if (holiday) return rate * (weekend ? hr.weekendOvertime : hr.weekdayOvertime)
  // Weekends pay the weekend overtime factor even on a night shift; the night
  // premium is accounted separately over every night hour, so it is not in here.
  if (type === 'night' && !weekend) return rate * ns.overtimeMultiplier
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
    // Holiday and night premiums stack (근로기준법 §56) — a night shift worked on
    // a public holiday still earns its night hours.
    if (type === 'night') base += rate * ns.bonusMultiplier * ns.bonusHours
  } else {
    switch (type) {
      case 'day': base = weekend ? rate * 8 * 1.5 : rate * 8; break
      case 'night':
        base = (weekend ? rate * 8 * 1.5 : rate * 8) + rate * ns.bonusMultiplier * ns.bonusHours
        break
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
      // Night premium stacks on top of the holiday premium (근로기준법 §56)
      if (type === 'night') nightPremium = rate * ns.bonusMultiplier * ns.bonusHours
    }
    // off / vacation / half on a holiday: covered by base — no extra, no deduction
  } else {
    switch (type) {
      case 'day': if (weekend) weekendPremium = rate * 8 * 1.5; break
      case 'night':
        if (weekend) weekendPremium = rate * 8 * 1.5
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

// Total of the user's custom allowances, added to every month.
// Falls back to legacy job/seniority fields if migration hasn't run yet.
export function sumAllowances(allowances) {
  const custom = allowances?.custom
  if (Array.isArray(custom)) return custom.reduce((s, a) => s + (Number(a.amount) || 0), 0)
  return (allowances?.job || 0) + (allowances?.seniority || 0)
}

export function bonusForMonth(allowances, month) {
  if (!allowances?.bonusEnabled) return 0
  const bonusMonths = allowances.bonusMonths || [3, 6, 9, 12]
  return bonusMonths.includes(month) ? (allowances.bonus || 0) : 0
}

// ── Pay schemes ───────────────────────────────────────────────────────────────
// Rates are stored per scheme (payRates[payType][year]) so switching the
// scheme in settings never destroys previously entered rates, and stored
// day grosses are never recomputed retroactively.

// Raw rate for the active pay scheme; falls back to the nearest known year
export function getRate(settings, year) {
  const table = settings?.payRates?.[settings?.payType || 'hourly'] || {}
  if (table[year] != null) return table[year]
  const known = Object.keys(table).map(Number).filter(y => !isNaN(y) && table[y] > 0)
  const earlier = known.filter(y => y < year).sort((a, b) => b - a)
  if (earlier.length) return table[earlier[0]]
  const later = known.filter(y => y > year).sort((a, b) => a - b)
  return later.length ? table[later[0]] : 0
}

// Hourly equivalent of the active rate (shift/overtime math runs on hours)
export function getHourlyRate(settings, year) {
  const rate = getRate(settings, year)
  switch (settings?.payType) {
    case 'daily': return rate / 8
    case 'weekly': return rate * 52 / 12 / 209
    case 'monthly': return rate / 209
    case 'annual': return rate / 12 / 209
    default: return rate
  }
}

// Guaranteed monthly base for base-mode schemes
export function monthlyBaseOf(settings, year) {
  const rate = getRate(settings, year)
  switch (settings?.payType) {
    case 'weekly': return rate * 52 / 12
    case 'monthly': return rate
    case 'annual': return rate / 12
    default: return rate * 209
  }
}

// Daily pay scheme (일용직): no monthly base, the month is the sum of days.
// Legacy non-KR settings also use sum mode.
export function isSumMode(settings) {
  if (!settings) return false
  return settings.payType === 'daily' || (settings.laborLaw ?? 'KR') !== 'KR'
}

// Base mode: full month breakdown around the guaranteed monthly base
export function calcMonthBreakdown(monthDayKeys, days, settings, year, month) {
  const base = monthlyBaseOf(settings, year)
  const hourly = getHourlyRate(settings, year)
  let overtime = 0, night = 0, holiday = 0, weekend = 0, deductions = 0, casual = 0

  for (const dateStr of monthDayKeys) {
    const d = days[dateStr]
    if (!d) continue
    if (d.type === 'casual') { casual += d.gross || 0; continue }
    const e = calcDayExtras({ ...d, dateStr }, hourly, settings)
    overtime += e.overtimePay
    night += e.nightPremium
    holiday += e.holidayPremium
    weekend += e.weekendPremium
    deductions += e.deduction
  }

  const bonus = bonusForMonth(settings.allowances, month)
  const allowances = sumAllowances(settings.allowances)
  const total = Math.round(
    base + overtime + night + holiday + weekend + allowances + bonus + casual - deductions
  )

  return { base, overtime, night, holiday, weekend, allowances, bonus, deductions, casual, total }
}

// Sum mode: logged days + allowances + bonus
export function calcMonthGrossSum(monthDayKeys, days, settings, month) {
  const logged = monthDayKeys.filter(k => days[k])
  if (logged.length === 0) return 0
  const dailySum = logged.reduce((s, k) => s + (days[k].gross || 0), 0)
  const allowances = sumAllowances(settings.allowances)
  return Math.round(dailySum + allowances + bonusForMonth(settings.allowances, month))
}

// Unified month gross for any scheme
export function calcMonthGross(monthDayKeys, days, settings, year, month) {
  if (isSumMode(settings)) return calcMonthGrossSum(monthDayKeys, days, settings, month)
  return calcMonthBreakdown(monthDayKeys, days, settings, year, month).total
}

// Month stats for the dashboard chips
export function calcMonthStats(monthDayKeys, days) {
  let worked = 0, off = 0, vacation = 0, overtime = 0, holidays = 0
  for (const k of monthDayKeys) {
    const d = days[k]
    if (!d) continue
    // A half day splits evenly: 0.5 worked + 0.5 vacation.
    if (d.type === 'day' || d.type === 'night') worked += 1
    else if (d.type === 'half') worked += 0.5
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
