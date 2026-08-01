// Semantic day-type ids. Stored data from older versions used Korean/Russian
// labels as ids — LEGACY_TYPE_MAP converts them on load (see services/storage).
export const DAY_TYPES = ['day', 'night', 'off', 'vacation', 'half', 'absence', 'casual']

export const LEGACY_TYPE_MAP = {
  '주간': 'day',
  '야간': 'night',
  '쉬는 날': 'off',
  '연차': 'vacation',
  '반차': 'half',
  '결근': 'absence',
  'разовая': 'casual',
}

export function normalizeType(type) {
  if (DAY_TYPES.includes(type)) return type
  return LEGACY_TYPE_MAP[type] || 'day'
}

// Worked shifts — days that count as "worked" in stats (actual shifts only)
export const WORKED_TYPES = ['day', 'night', 'half']

// Types that can have overtime hours
export function canHaveOvertime(type) {
  return type === 'day' || type === 'night' || type === 'half'
}

// Pay schemes — how the rate the user enters is interpreted
export const PAY_TYPES = ['hourly', 'daily', 'weekly', 'monthly', 'annual']

// Korean employment forms; labels localized via t.employmentTypes[id]
export const EMPLOYMENT_TYPES = [
  { id: 'regular', ko: '정규직' },
  { id: 'contract', ko: '계약직' },
  { id: 'fixedTerm', ko: '기간제' },
  { id: 'dayLabor', ko: '일용직' },
  { id: 'partTime', ko: '아르바이트' },
  { id: 'dispatch', ko: '파견직' },
  { id: 'subcontract', ko: '도급' },
  { id: 'freelance', ko: '프리랜서' },
  { id: 'soleProprietor', ko: '개인사업자' },
  { id: 'selfEmployed', ko: '자영업' },
]
