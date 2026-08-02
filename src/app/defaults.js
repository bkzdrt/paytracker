export const DEFAULT_SETTINGS = {
  currency: 'KRW',
  laborLaw: 'KR',
  payType: 'hourly',
  payRates: { hourly: {}, daily: {}, weekly: {}, monthly: {}, annual: {} },
  profile: { company: '', employment: 'regular' },
  allowances: { custom: [], bonus: 0, bonusEnabled: false, vacationTotal: 0, bonusMonths: [3, 6, 9, 12] },
  weekTemplate: {
    1: { type: 'day', overtime: 0 },
    2: { type: 'day', overtime: 0 },
    3: { type: 'day', overtime: 0 },
    4: { type: 'day', overtime: 0 },
    5: { type: 'day', overtime: 0 },
    6: { type: 'off', overtime: 0 },
    0: { type: 'off', overtime: 0 },
  },
  // Prefilled per the Korean Labor Standards Act (근로기준법) so users don't
  // have to guess. Holiday "base" fields are the whole factor above 100% and
  // bake in the paid-holiday allowance: worked weekday holiday = 100% (paid
  // holiday) + 150% (holiday work) → base 1.5; weekend adds the 1.5 weekend
  // factor in-formula. Overtime on a holiday = +100% → factor 2.
  holidayRates: { weekdayBase: 1.5, weekdayOvertime: 2.0, weekendBase: 1.5, weekendOvertime: 2.0 },
  // Night shift described by clock times; the app derives the night hours (overlap
  // with the legal 22:00–06:00 window) and applies the +50% premium (근로기준법 §56).
  nightShift: {
    start: '22:00', end: '06:00',
    windowStart: '22:00', windowEnd: '06:00', // legal night window, editable
    // Unpaid breaks with a start time: a break inside the night window costs
    // night hours, one outside it does not.
    breaks: [{ start: '22:00', minutes: 30 }],
    mode: 'law',                              // 'law' | 'custom'
    premiumPercent: 50, overtimeMultiplier: 1.5,
  },
  newYearPromptShown: String(new Date().getFullYear()),
}
