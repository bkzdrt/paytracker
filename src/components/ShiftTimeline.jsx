import { minToTime } from '../domain/payroll'
import { haptics } from '../services/haptics'

// Visual shift editor: the bar shows every minute of the shift classified as
// work / night / break, with the stretch past the standard day marked as
// overtime. The two sliders below move the shift's ends.
//
// Breaks are placed by their own rows rather than dragged on the bar — a
// ten-minute break is a handful of pixels wide on a phone, too small to grab.

const STEP = 15 // minutes per slider notch
const STANDARD_MINUTES = 8 * 60

const toMin = (t) => {
  const [h, m] = String(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const round2 = (n) => Math.round(n * 100) / 100

// Tag the paid stretch beyond the standard day. A run that straddles the
// eight-hour mark is split there, so the bar shows the real overtime length
// instead of rounding it to whole segments.
function withOvertime(segments) {
  let paid = 0
  const out = []
  for (const seg of segments) {
    if (seg.kind === 'break') { out.push({ ...seg, overtime: false }); continue }
    const before = paid
    const after = before + seg.hours * 60
    if (before < STANDARD_MINUTES && after > STANDARD_MINUTES) {
      out.push({ ...seg, hours: round2((STANDARD_MINUTES - before) / 60), overtime: false })
      out.push({ ...seg, hours: round2((after - STANDARD_MINUTES) / 60), overtime: true })
    } else {
      out.push({ ...seg, overtime: before >= STANDARD_MINUTES })
    }
    paid = after
  }
  return out
}

export default function ShiftTimeline({ t, start, end, breakdown, onChange }) {
  const segments = withOvertime(breakdown.segments)
  const hoursSuffix = t.dashboard.hoursSuffix

  const slide = (key) => (e) => {
    const next = minToTime(Number(e.target.value))
    if (next !== (key === 'start' ? start : end)) {
      haptics.light()
      onChange(key, next)
    }
  }

  return (
    <div className="shift-editor">
      <div className="shift-bar" aria-hidden="true">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={
              `shift-bar__seg shift-bar__seg--${seg.kind}` +
              (seg.overtime ? ' shift-bar__seg--ot' : '')
            }
            style={{ flexGrow: Math.max(seg.hours, 0.08) }}
          >
            {seg.hours >= 0.9 ? `${seg.hours}${hoursSuffix}` : ''}
          </div>
        ))}
      </div>

      <div className="shift-bar__legend">
        <span className="num">{start}</span>
        <span className="num">{end}</span>
      </div>

      <div className="shift-slider">
        <span className="shift-slider__label">{t.settings.shiftStart}</span>
        <input
          type="range" min={0} max={1440 - STEP} step={STEP}
          value={toMin(start)} onChange={slide('start')}
          aria-label={t.settings.shiftStart}
        />
        <span className="shift-slider__value num">{start}</span>
      </div>
      <div className="shift-slider">
        <span className="shift-slider__label">{t.settings.shiftEnd}</span>
        <input
          type="range" min={0} max={1440 - STEP} step={STEP}
          value={toMin(end)} onChange={slide('end')}
          aria-label={t.settings.shiftEnd}
        />
        <span className="shift-slider__value num">{end}</span>
      </div>

      <ul className="shift-key">
        <li><i className="shift-key__dot shift-key__dot--work" />{t.settings.keyWork}</li>
        <li><i className="shift-key__dot shift-key__dot--night" />{t.settings.keyNight}</li>
        <li><i className="shift-key__dot shift-key__dot--ot" />{t.settings.keyOvertime}</li>
        <li><i className="shift-key__dot shift-key__dot--break" />{t.settings.keyBreak}</li>
      </ul>
    </div>
  )
}
