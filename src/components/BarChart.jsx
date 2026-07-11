import { useState } from 'react'

// Minimal dependency-free bar chart.
// items: [{ label, value, highlight?, muted? }]
// onBarTap(index)  — navigate on tap (year chart)
// without onBarTap — tap toggles a value readout (daily chart)
export default function BarChart({ items, onBarTap, formatValue, height = 96, labelEvery = 1 }) {
  const [sel, setSel] = useState(null)
  const max = Math.max(...items.map(i => Math.abs(i.value || 0)), 1)
  const selected = sel != null ? items[sel] : null

  return (
    <div className="bars">
      <div className="bars__readout">
        {selected
          ? <><span className="bars__readout-label">{selected.label}</span>{' '}
              <span className="bars__readout-value">{formatValue ? formatValue(selected.value) : selected.value}</span></>
          : ' '}
      </div>
      <div className="bars__track" style={{ height }}>
        {items.map((it, i) => {
          const v = it.value || 0
          const pct = Math.abs(v) / max * 100
          let cls = 'bars__bar'
          if (v < 0) cls += ' bars__bar--neg'
          else if (it.highlight) cls += ' bars__bar--hl'
          else if (it.muted || v === 0) cls += ' bars__bar--muted'
          return (
            <button
              key={i}
              type="button"
              className={`bars__col${sel === i ? ' bars__col--sel' : ''}`}
              aria-label={`${it.label}: ${v}`}
              onClick={() => {
                if (onBarTap) onBarTap(i)
                else setSel(s => (s === i ? null : i))
              }}
            >
              <span className={cls} style={{ height: `${v === 0 ? 3 : Math.max(pct, 4)}%` }} />
            </button>
          )
        })}
      </div>
      <div className="bars__labels">
        {items.map((it, i) => (
          <span key={i} className={`bars__label${it.highlight ? ' bars__label--hl' : ''}`}>
            {i % labelEvery === 0 ? it.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
