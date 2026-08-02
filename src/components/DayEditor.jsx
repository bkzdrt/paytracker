import { useState } from 'react'
import { useApp } from '../app/store'
import { useSheet } from './useSheet'
import { DAY_TYPES, canHaveOvertime } from '../domain/types'
import { calcDayGross, getHourlyRate, autoOvertimeOf } from '../domain/payroll'
import { todayStr, isWeekend } from '../domain/dates'
import { haptics } from '../services/haptics'

// Suggested defaults for an empty day: week template for today/future,
// plain day shift for the past.
function defaultDay(dateStr, settings) {
  if (dateStr >= todayStr()) {
    const tmpl = settings?.weekTemplate?.[String(new Date(dateStr).getDay())]
    if (tmpl) {
      const overtime = tmpl.overtime || (tmpl.type === 'night' ? autoOvertimeOf(settings?.nightShift) : 0)
      return { type: tmpl.type, overtime }
    }
  }
  return { type: 'day', overtime: 0 }
}

export default function DayEditor({ dateStr, onClose }) {
  const { t, intl, settings, days, setDay, deleteDay, formatMoney } = useApp()
  const existing = days[dateStr]
  const suggested = existing ? null : defaultDay(dateStr, settings)

  const [type, setType] = useState(existing?.type || suggested?.type || 'day')
  const [overtime, setOvertime] = useState(existing?.overtime ?? suggested?.overtime ?? 0)
  const [note, setNote] = useState(existing?.note || '')
  const [isHoliday, setIsHoliday] = useState(existing?.isHoliday ?? false)
  const [bonusDeduction, setBonusDeduction] = useState(existing?.bonusDeduction ?? 0)
  const [showBonusInput, setShowBonusInput] = useState((existing?.bonusDeduction ?? 0) > 0)
  const [casualAmount, setCasualAmount] = useState(
    existing?.type === 'casual' ? String(existing.gross || '') : ''
  )

  const rate = getHourlyRate(settings, parseInt(dateStr.slice(0, 4)))
  const autoOt = autoOvertimeOf(settings?.nightShift)
  const isCasual = type === 'casual'
  const weekend = isWeekend(dateStr)
  const gross = isCasual
    ? (parseFloat(casualAmount.replace(',', '.')) || 0)
    : calcDayGross(
        { type, dateStr, overtime, isHoliday, bonusDeduction: type === 'absence' ? bonusDeduction : 0 },
        rate, settings
      )

  const date = new Date(dateStr)
  const rawLabel = date.toLocaleDateString(intl, { weekday: 'long', day: 'numeric', month: 'long' })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  const { close, overlayProps, sheetProps } = useSheet(onClose)

  function save() {
    haptics.medium()
    setDay(dateStr, {
      type,
      overtime: canHaveOvertime(type) ? overtime : 0,
      gross,
      note: note.trim() || undefined,
      isHoliday: isHoliday || undefined,
      bonusDeduction: type === 'absence' && bonusDeduction > 0 ? bonusDeduction : undefined,
    })
    close()
  }

  function clear() {
    if (window.confirm(t.dayEditor.confirmClear)) {
      deleteDay(dateStr)
      close()
    }
  }

  const showOvertime = canHaveOvertime(type)

  return (
    <div {...overlayProps}>
      <div {...sheetProps} role="dialog" aria-modal="true" aria-label={dateLabel}>
        <div className="sheet__head">
          <div className="sheet__date">{dateLabel}</div>
          <button type="button" className="icon-btn" aria-label={t.dayEditor.close} onClick={close}>✕</button>
        </div>

        <div className="chips-row">
          {DAY_TYPES.map(dt => (
            <button
              key={dt}
              type="button"
              className={`chip chip--${dt}${type === dt ? ' chip--active' : ''}`}
              onClick={() => {
                haptics.light()
                setType(dt)
                // A night shift longer than the standard day carries its own
                // overtime — offer it, but never overwrite hours already entered.
                if (dt === 'night' && !overtime) setOvertime(autoOvertimeOf(settings?.nightShift))
              }}
            >
              <span className={`dot dot--${dt}`} />
              {t.dayTypes[dt]}
            </button>
          ))}
        </div>

        {weekend && !isCasual && type === 'day' && !isHoliday && (
          <div className="hint-badge">{t.dayEditor.weekendRate}</div>
        )}

        {isCasual && (
          <label className="field-row">
            <span className="field-row__label">{t.dayEditor.casualAmount}</span>
            <input
              className="input input--amount"
              type="text"
              inputMode="decimal"
              value={casualAmount}
              onChange={e => { if (/^\d*[.,]?\d*$/.test(e.target.value)) setCasualAmount(e.target.value) }}
              placeholder="0"
              autoFocus
            />
          </label>
        )}

        {!isCasual && type !== 'absence' && (
          <div className="field-row">
            <span className="field-row__label">{t.dayEditor.isHoliday}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={isHoliday}
                onChange={e => { haptics.light(); setIsHoliday(e.target.checked) }}
              />
              <span className="switch__slider" />
            </label>
          </div>
        )}

        {isHoliday && type === 'off' && (
          <div className="hint-badge">{t.dayEditor.paidHoliday}</div>
        )}

        {showOvertime && (
          <div className="ot-section">
            <span className="field-row__label">
              {t.dayEditor.overtime}
              {/* The schedule's own overtime is an offer, not a statement: it
                  used to render as plain text next to a field still reading 0h,
                  so it looked like hours that were already counted. */}
              {type === 'night' && autoOt > 0 && overtime !== autoOt && (
                <button
                  type="button"
                  className="ot-suggest"
                  onClick={() => { haptics.light(); setOvertime(autoOt) }}
                >
                  {t.dayEditor.otFromShift.replace('{h}', autoOt)}
                </button>
              )}
            </span>
            <div className="ot-controls">
              <button type="button" className="ot-btn" aria-label="−0.5h"
                onClick={() => { haptics.light(); setOvertime(v => Math.max(0, +(v - 0.5).toFixed(1))) }}>−</button>
              <span className="ot-value">{overtime}h</span>
              <button type="button" className="ot-btn" aria-label="+0.5h"
                onClick={() => { haptics.light(); setOvertime(v => +(v + 0.5).toFixed(1)) }}>+</button>
              <div className="ot-presets">
                {[1, 2, 3].map(v => (
                  <button key={v} type="button" className={`ot-preset${overtime === v ? ' ot-preset--active' : ''}`}
                    onClick={() => { haptics.light(); setOvertime(v) }}>{v}h</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {type === 'absence' && !showBonusInput && (
          <button type="button" className="btn-ghost-danger" onClick={() => { haptics.light(); setShowBonusInput(true) }}>
            − {t.dayEditor.deductBonus}
          </button>
        )}
        {type === 'absence' && showBonusInput && (
          <div className="field-row">
            <span className="field-row__label">{t.dayEditor.deductBonus}</span>
            <input
              className="input input--amount"
              type="number"
              inputMode="numeric"
              value={bonusDeduction || ''}
              onChange={e => setBonusDeduction(parseInt(e.target.value) || 0)}
              placeholder="0"
              autoFocus
            />
            <button type="button" className="icon-btn" aria-label="✕"
              onClick={() => { setBonusDeduction(0); setShowBonusInput(false) }}>✕</button>
          </div>
        )}

        <div className="gross-preview">
          <span className="field-row__label">{t.dayEditor.gross}</span>
          <span className={`gross-preview__amount num${gross < 0 ? ' neg' : ''}`}>{formatMoney(gross)}</span>
        </div>

        <input
          className="input input--note"
          placeholder={t.dayEditor.note}
          value={note}
          maxLength={120}
          onChange={e => setNote(e.target.value)}
        />

        <button type="button" className="btn-primary" onClick={save}>{t.dayEditor.save}</button>
        {existing && (
          <button type="button" className="btn-ghost-danger" onClick={clear}>{t.dayEditor.clearDay}</button>
        )}
      </div>
    </div>
  )
}
