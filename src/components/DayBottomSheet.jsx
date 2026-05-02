import { useState, useRef, useCallback } from 'react'
import { calcDayGross, DAY_TYPES } from '../utils/calculations'

export default function DayBottomSheet({ dateStr, dayData, settings, onSave, onDelete, onClose, t, lang, formatMoney, haptic, getDefaultForDate }) {
  const year = parseInt(dateStr.slice(0, 4))
  const rate = settings.rates[String(year)] || 13589

  const defaults = !dayData && getDefaultForDate ? getDefaultForDate(dateStr) : null
  const [type, setType] = useState(dayData?.type || defaults?.type || null)
  const [overtime, setOvertime] = useState(dayData?.overtime ?? defaults?.overtime ?? 0)
  const [note, setNote] = useState(dayData?.note || '')
  const [bonusDeduction, setBonusDeduction] = useState(dayData?.bonusDeduction ?? 0)
  const [showBonusInput, setShowBonusInput] = useState((dayData?.bonusDeduction ?? 0) > 0)
  const [isHoliday, setIsHoliday] = useState(dayData?.isHoliday ?? false)
  const [casualAmount, setCasualAmount] = useState(
    dayData?.type === 'разовая' ? String(dayData.gross || '') : ''
  )

  const isCasual = type === 'разовая'
  const gross = isCasual
    ? (parseFloat(casualAmount) || 0)
    : (type ? calcDayGross(type, overtime, rate, dateStr, type === '결근' ? bonusDeduction : 0, isHoliday, settings.holidayRates, settings.nightShift) : 0)

  const date = new Date(dateStr)
  const dow = date.getDay()
  const isWeekend = dow === 0 || dow === 6
  const monthStr = date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', day: 'numeric' })
  const weekdayLong = (lang === 'ru'
    ? ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])[dow]

  const touchRef = useRef(null)
  const sheetRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    touchRef.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (touchRef.current === null) return
    const dy = e.changedTouches[0].clientY - touchRef.current
    if (dy > 80) onClose()
    touchRef.current = null
  }, [onClose])

  function handleSave() {
    if (!type) return
    haptic.medium()
    onSave(dateStr, {
      type, overtime, gross, note,
      bonusDeduction: type === '결근' && bonusDeduction > 0 ? bonusDeduction : undefined,
      isHoliday: isHoliday || undefined,
    })
    onClose()
  }

  function handleClear() {
    if (window.confirm(t.dayEditor.confirmClear)) {
      onDelete(dateStr)
      onClose()
    }
  }

  const showOvertime = type && type !== '쉬는 날' && type !== '연차' && type !== '결근' && type !== 'разовая'

  return (
    <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="bottom-sheet"
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bottom-sheet__handle" />
        <div className="bottom-sheet__header">
          <div className="bottom-sheet__date">
            <span className="bottom-sheet__weekday">{weekdayLong}</span>
            <span className="bottom-sheet__day">{monthStr}</span>
          </div>
        </div>

        <div className="bottom-sheet__body">
          <div className="chips-row">
            {DAY_TYPES.map(dt => (
              <button
                key={dt}
                className={`chip${type===dt?' chip--active':''}`}
                onClick={() => { haptic.light(); setType(dt) }}
              >
                {t.dayTypes[dt]}
              </button>
            ))}
          </div>

          {isWeekend && !isCasual && (
            <div className="weekend-rate-badge">{t.dayEditor.weekendRate}</div>
          )}

          {isCasual && (
            <div className="casual-amount-row">
              <span className="section-label">{t.dayEditor.casualAmount}</span>
              <input
                className="settings-input"
                type="text"
                inputMode="decimal"
                value={casualAmount}
                onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setCasualAmount(e.target.value) }}
                placeholder="0"
                autoFocus
              />
            </div>
          )}

          {!isCasual && type && type !== '결근' && (
            <div className="toggle-row">
              <span className="toggle-row__label">{t.dayEditor.isHoliday}</span>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={isHoliday}
                  onChange={e => { haptic.light(); setIsHoliday(e.target.checked) }}
                />
                <span className="toggle__slider" />
              </label>
            </div>
          )}

          {isHoliday && type === '쉬는 날' && (
            <div className="paid-holiday-notice">{t.dayEditor.paidHoliday}</div>
          )}

          {showOvertime && (
            <div className="overtime-section">
              <div className="overtime-section__label section-label">{t.dayEditor.overtime}</div>
              <div className="overtime-controls">
                <button className="ot-btn" onClick={() => { haptic.light(); setOvertime(0) }}>-</button>
                <span className="ot-value">{overtime}h</span>
                {[0.5, 1, 1.5, 3].map(v => (
                  <button key={v} className="ot-btn" onClick={() => { haptic.light(); setOvertime(prev => prev + v) }}>+{v}</button>
                ))}
              </div>
            </div>
          )}

          {!isCasual && type === '결근' && !showBonusInput && (
            <button
              className="deduct-bonus-btn"
              onClick={() => { haptic.light(); setShowBonusInput(true) }}
            >
              − {t.dayEditor.deductBonus}
            </button>
          )}
          {!isCasual && type === '결근' && showBonusInput && (
            <div className="deduct-bonus-row">
              <span className="deduct-bonus-row__label">{t.dayEditor.deductBonus}</span>
              <input
                className="settings-input"
                type="number"
                value={bonusDeduction || ''}
                onChange={e => setBonusDeduction(parseInt(e.target.value) || 0)}
                inputMode="numeric"
                placeholder="0"
                autoFocus
              />
              <button
                className="deduct-bonus-clear"
                onClick={() => { haptic.light(); setBonusDeduction(0); setShowBonusInput(false) }}
              >✕</button>
            </div>
          )}

          {type && !isCasual && (
            <div className="gross-display">
              <span className="section-label">{t.dayEditor.gross}</span>
              <span className={`gross-display__amount${gross < 0 ? ' gross-display__amount--negative' : ''}`}>{formatMoney(gross)}</span>
            </div>
          )}

          <input
            className="note-input"
            placeholder={t.dayEditor.note}
            value={note}
            onChange={e => setNote(e.target.value)}
          />

          <button className="btn-primary" onClick={handleSave} disabled={!type}>{t.dayEditor.save}</button>
          {dayData && (
            <button className="btn-danger-text" onClick={handleClear}>{t.dayEditor.clearDay}</button>
          )}
        </div>
      </div>
    </div>
  )
}
