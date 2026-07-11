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

// Worked shifts — days that count as "worked" in stats
export const WORKED_TYPES = ['day', 'night', 'vacation', 'half', 'absence']

// Types that can have overtime hours
export function canHaveOvertime(type) {
  return type === 'day' || type === 'night' || type === 'half'
}
