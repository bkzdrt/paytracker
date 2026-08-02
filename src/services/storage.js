import { normalizeType } from '../domain/types'
import { DEFAULT_SETTINGS } from '../app/defaults'
import { legacyBreakStart } from '../domain/payroll'

// True when every value in a rates block is 0/undefined — i.e. never configured.
const allZero = (obj) => !obj || Object.values(obj).every(v => !v)

// localStorage layout:
//   pt_prefs            — { lang, theme }        (device-level, survives data resets)
//   pt_settings         — rates, allowances, week template, …
//   days_YYYY_MM        — { "YYYY-MM-DD": dayData } per-month chunks
//   months_YYYY         — { "YYYY-MM": { net } } per-year
// Same keys the Telegram-era version used, so existing data carries over.

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota/private mode */ }
}

function remove(key) {
  try { localStorage.removeItem(key) } catch { /* noop */ }
}

// "2026-05-15" → "days_2026_05"
export function daysMonthKey(dateStr) {
  return `days_${dateStr.slice(0, 4)}_${dateStr.slice(5, 7)}`
}

export function monthsYearKey(year) {
  return `months_${String(year).slice(0, 4)}`
}

function allDaysKeysOf(year) {
  return Array.from({ length: 12 }, (_, i) => `days_${year}_${String(i + 1).padStart(2, '0')}`)
}

// ── Migrations ────────────────────────────────────────────────────────────

// v0 → v1: flat pt_days / pt_months → per-month / per-year chunks
function migrateFlatKeys() {
  const oldDays = read('pt_days')
  if (oldDays) {
    const byChunk = {}
    for (const [dateStr, dayData] of Object.entries(oldDays)) {
      const key = daysMonthKey(dateStr)
      ;(byChunk[key] ||= {})[dateStr] = dayData
    }
    for (const [key, chunk] of Object.entries(byChunk)) write(key, chunk)
    remove('pt_days')
  }
  const oldMonths = read('pt_months')
  if (oldMonths) {
    const byYear = {}
    for (const [monthKey, data] of Object.entries(oldMonths)) {
      ;(byYear[monthsYearKey(monthKey)] ||= {})[monthKey] = data
    }
    for (const [key, data] of Object.entries(byYear)) write(key, data)
    remove('pt_months')
  }
}

// v1 → v2: Korean/Russian day-type labels → semantic ids
function normalizeDayChunk(chunk) {
  let changed = false
  const next = {}
  for (const [dateStr, d] of Object.entries(chunk)) {
    const type = normalizeType(d.type)
    if (type !== d.type) changed = true
    next[dateStr] = { ...d, type }
  }
  return changed ? next : chunk
}

function normalizeSettings(settings) {
  if (!settings) return settings
  const next = { ...settings }
  if (next.weekTemplate) {
    next.weekTemplate = Object.fromEntries(
      Object.entries(next.weekTemplate).map(([dow, tmpl]) => [
        dow,
        { ...tmpl, type: normalizeType(tmpl.type) },
      ])
    )
  }
  // v2 → v3: single hourly `rates` table → per-scheme payRates + profile; KRW only
  if (!next.payRates) {
    next.payRates = { hourly: { ...(next.rates || {}) }, daily: {}, weekly: {}, monthly: {}, annual: {} }
  } else {
    next.payRates = { ...next.payRates }
    for (const pt of ['hourly', 'daily', 'weekly', 'monthly', 'annual']) next.payRates[pt] ||= {}
  }
  delete next.rates
  // v3 → v4: fixed job/seniority allowances → editable custom list.
  // Non-zero legacy amounts are preserved as unnamed custom rows.
  if (next.allowances && !Array.isArray(next.allowances.custom)) {
    const a = { ...next.allowances }
    const custom = []
    if (a.job) custom.push({ id: 'legacy-job', name: '', amount: a.job })
    if (a.seniority) custom.push({ id: 'legacy-seniority', name: '', amount: a.seniority })
    a.custom = custom
    delete a.job
    delete a.seniority
    next.allowances = a
  }
  next.payType ||= 'hourly'
  next.profile ||= { company: '', employment: 'regular' }
  next.currency = 'KRW'
  // v4: prefill holiday rates with Korean Labor Standards Act values for existing
  // users who never configured them. One-time — later edits (incl. 0) stay.
  if (!next.krDefaultsApplied) {
    if (allZero(next.holidayRates)) next.holidayRates = { ...DEFAULT_SETTINGS.holidayRates }
    next.krDefaultsApplied = true
  }
  // v5: night shift raw coefficients (or empty) → clock schedule + premium %.
  // Legacy bonusMultiplier carries over as the premium; hours come from the
  // 22:00–06:00 default window. Idempotent (skips already-migrated settings).
  if (!next.nightShift || next.nightShift.start === undefined) {
    const old = next.nightShift || {}
    const premiumPercent = old.bonusMultiplier ? Math.round(old.bonusMultiplier * 100) : 50
    // A legacy 7.5 h night on a 22:00–06:00 shift meant a 30-min unpaid break.
    const breakMinutes = old.bonusHours ? Math.max(0, Math.round((8 - old.bonusHours) * 60)) : 30
    next.nightShift = {
      start: '22:00',
      end: '06:00',
      premiumPercent,
      breakMinutes,
      overtimeMultiplier: old.overtimeMultiplier || 1.5,
    }
  }
  // v6: configurable night window + break for settings already on the schedule
  // shape. Rebuilt rather than mutated — `next` is a shallow copy, so writing
  // through `next.nightShift` would also change the object we diff against and
  // the migration would never be persisted.
  next.nightShift = {
    windowStart: '22:00',
    windowEnd: '06:00',
    mode: 'law',
    ...next.nightShift,
  }
  // v7: a break's position decides whether it eats night hours, so a bare
  // duration is not enough. The legacy scalar is placed where it reproduces the
  // previous totals exactly, and is dropped rather than left as a second source
  // of truth (`breakMinutes` is destructured out, not deleted after the spread —
  // re-adding it above would resurrect it on every load).
  if (!Array.isArray(next.nightShift.breaks)) {
    const { breakMinutes = 30, ...rest } = next.nightShift
    next.nightShift = {
      ...rest,
      breaks: breakMinutes ? [{ start: legacyBreakStart(rest), minutes: breakMinutes }] : [],
    }
  }
  return next
}

// ── Public API ────────────────────────────────────────────────────────────

export function loadPrefs() {
  return read('pt_prefs') || {}
}

export function savePrefs(prefs) {
  write('pt_prefs', prefs)
}

export function loadSettings() {
  migrateFlatKeys()
  const settings = read('pt_settings')
  if (!settings) return null
  const normalized = normalizeSettings(settings)
  if (JSON.stringify(normalized) !== JSON.stringify(settings)) write('pt_settings', normalized)
  return normalized
}

export function saveSettings(settings) {
  write('pt_settings', settings)
}

// Load all logged days of a year as one flat { dateStr: dayData } object
export function loadYearDays(year) {
  const flat = {}
  for (const key of allDaysKeysOf(year)) {
    const chunk = read(key)
    if (!chunk) continue
    const normalized = normalizeDayChunk(chunk)
    if (normalized !== chunk) write(key, normalized)
    Object.assign(flat, normalized)
  }
  return flat
}

export function loadYearMonths(year) {
  return read(monthsYearKey(year)) || {}
}

// Persist one month's chunk, given the full flat days object
export function saveMonthChunk(dateStr, allDays) {
  const prefix = dateStr.slice(0, 7)
  const chunk = {}
  for (const [k, v] of Object.entries(allDays)) {
    if (k.startsWith(prefix)) chunk[k] = v
  }
  write(daysMonthKey(dateStr), chunk)
}

export function saveYearMonths(year, monthsOfYear) {
  write(monthsYearKey(year), monthsOfYear)
}

export function clearYearData(year) {
  for (const key of allDaysKeysOf(year)) remove(key)
  remove(monthsYearKey(year))
}

// Years that have any stored day/month data (for backup + clear UI)
export function storedYears() {
  const years = new Set()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const m = /^(?:days|months)_(\d{4})/.exec(key)
      if (m) years.add(parseInt(m[1]))
    }
  } catch { /* noop */ }
  return [...years].sort()
}

// Full data dump / restore for JSON backups
export function dumpAll() {
  const data = { version: 2, exportedAt: new Date().toISOString(), settings: read('pt_settings'), days: {}, months: {} }
  for (const year of storedYears()) {
    Object.assign(data.days, loadYearDays(year))
    Object.assign(data.months, loadYearMonths(year))
  }
  return data
}

export function restoreAll(data) {
  if (!data || typeof data !== 'object' || !data.settings) throw new Error('invalid backup')
  for (const year of storedYears()) clearYearData(year)
  write('pt_settings', normalizeSettings(data.settings))
  const byChunk = {}
  for (const [dateStr, d] of Object.entries(data.days || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue
    ;(byChunk[daysMonthKey(dateStr)] ||= {})[dateStr] = { ...d, type: normalizeType(d.type) }
  }
  for (const [key, chunk] of Object.entries(byChunk)) write(key, chunk)
  const byYear = {}
  for (const [monthKey, m] of Object.entries(data.months || {})) {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue
    ;(byYear[monthsYearKey(monthKey)] ||= {})[monthKey] = m
  }
  for (const [key, months] of Object.entries(byYear)) write(key, months)
}
