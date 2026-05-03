import { useState } from 'react'
import { exportCSV } from '../utils/export'
import { todayStr } from '../utils/dates'
import { DAY_TYPES } from '../utils/calculations'
import WebApp from '@twa-dev/sdk'

// TON network wallet
const CRYPTO_WALLET = 'UQCWSZkplJiZ-UHwOsUwwcNypYEFS3Gq2_ws2tiLwjEN0wCZ'

const FEEDBACK_URL = 'https://t.me/bekzodart'

const CURRENCIES = ['KRW', 'RUB', 'USD', 'EUR', 'KZT', 'UZS']

const DECIMAL_RE = /^[0-9]*[.,]?[0-9]*$/

function normDot(val) {
  return val.replace(',', '.')
}

export default function Settings({ settings, setSettings, days, months, t, lang, haptic, clearYear }) {
  const currentYear = parseInt(todayStr().slice(0, 4))
  const [newYear, setNewYear] = useState('')

  // Local string buffers — keyed by arbitrary field id — allow typing "0." without normalisation
  const [buf, setBuf] = useState({})

  function getBuf(key, fallback) {
    return key in buf ? buf[key] : String(fallback ?? 0)
  }

  function setBufVal(key, val) {
    setBuf(s => ({ ...s, [key]: val }))
  }

  function clearBuf(key) {
    setBuf(s => { const n = { ...s }; delete n[key]; return n })
  }

  // ── Rates ────────────────────────────────────
  const ratesDisplay = {
    [String(currentYear)]: settings.rates[String(currentYear)] ?? 0,
    ...Object.fromEntries(
      Object.entries(settings.rates).filter(([y]) => parseInt(y) > currentYear)
    ),
  }

  function handleRateChange(year, val) {
    if (!DECIMAL_RE.test(val)) return
    setBufVal(`rate_${year}`, val)
    const parsed = parseFloat(normDot(val))
    if (!isNaN(parsed)) {
      setSettings(s => ({ ...s, rates: { ...s.rates, [year]: parsed } }))
    }
  }

  function handleRateBlur(year) {
    const val = buf[`rate_${year}`]
    if (val !== undefined) {
      const parsed = parseFloat(normDot(val)) || 0
      setSettings(s => ({ ...s, rates: { ...s.rates, [year]: parsed } }))
      clearBuf(`rate_${year}`)
    }
  }

  // ── Allowances ───────────────────────────────
  function handleAllowanceChange(key, val) {
    if (!DECIMAL_RE.test(val)) return
    setBufVal(`allow_${key}`, val)
    const parsed = parseFloat(normDot(val))
    if (!isNaN(parsed)) {
      setSettings(s => ({ ...s, allowances: { ...s.allowances, [key]: parsed } }))
    }
  }

  function handleAllowanceBlur(key) {
    const val = buf[`allow_${key}`]
    if (val !== undefined) {
      const parsed = parseFloat(normDot(val)) || 0
      setSettings(s => ({ ...s, allowances: { ...s.allowances, [key]: parsed } }))
      clearBuf(`allow_${key}`)
    }
  }

  // ── Week template ────────────────────────────
  function updateTemplateType(dow, val) {
    setSettings(s => ({
      ...s,
      weekTemplate: { ...s.weekTemplate, [dow]: { ...s.weekTemplate[dow], type: val } }
    }))
  }

  function handleTemplateOTChange(dow, val) {
    if (!DECIMAL_RE.test(val)) return
    setBufVal(`tmpl_${dow}`, val)
    const parsed = parseFloat(normDot(val))
    if (!isNaN(parsed)) {
      setSettings(s => ({
        ...s,
        weekTemplate: { ...s.weekTemplate, [dow]: { ...s.weekTemplate[dow], overtime: parsed } }
      }))
    }
  }

  function handleTemplateOTBlur(dow) {
    const val = buf[`tmpl_${dow}`]
    if (val !== undefined) {
      const parsed = parseFloat(normDot(val)) || 0
      setSettings(s => ({
        ...s,
        weekTemplate: { ...s.weekTemplate, [dow]: { ...s.weekTemplate[dow], overtime: parsed } }
      }))
      clearBuf(`tmpl_${dow}`)
    }
  }

  // ── Night shift ──────────────────────────────
  function handleNightChange(key, val) {
    if (!DECIMAL_RE.test(val)) return
    setBufVal(`night_${key}`, val)
    const parsed = parseFloat(normDot(val))
    if (!isNaN(parsed)) {
      setSettings(s => ({ ...s, nightShift: { ...(s.nightShift || {}), [key]: parsed } }))
    }
  }

  function handleNightBlur(key) {
    const val = buf[`night_${key}`]
    if (val !== undefined) {
      const parsed = parseFloat(normDot(val)) || 0
      setSettings(s => ({ ...s, nightShift: { ...(s.nightShift || {}), [key]: parsed } }))
      clearBuf(`night_${key}`)
    }
  }

  // ── Holiday rates ────────────────────────────
  function handleHolidayChange(key, val) {
    if (!DECIMAL_RE.test(val)) return
    setBufVal(`hol_${key}`, val)
    const parsed = parseFloat(normDot(val))
    if (!isNaN(parsed)) {
      setSettings(s => ({ ...s, holidayRates: { ...s.holidayRates, [key]: parsed } }))
    }
  }

  function handleHolidayBlur(key) {
    const val = buf[`hol_${key}`]
    if (val !== undefined) {
      const parsed = parseFloat(normDot(val)) || 0
      setSettings(s => ({ ...s, holidayRates: { ...s.holidayRates, [key]: parsed } }))
      clearBuf(`hol_${key}`)
    }
  }

  // ── Bonus months ─────────────────────────────
  const bonusMonths = settings.allowances.bonusMonths || [3, 6, 9, 12]
  const todayMonth = new Date().getMonth() + 1
  const monthLocale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const sortedBonusMonths = [...bonusMonths].sort((a, b) => a - b)
  const nextBonusMonth = sortedBonusMonths.find(m => m > todayMonth) || sortedBonusMonths[0]
  const nextBonusYear = nextBonusMonth && nextBonusMonth > todayMonth ? currentYear : currentYear + 1
  const nextBonusLabel = nextBonusMonth
    ? new Date(nextBonusYear, nextBonusMonth - 1, 1).toLocaleDateString(monthLocale, { month: 'long', year: 'numeric' })
    : '—'

  function toggleBonusMonth(m) {
    setSettings(s => {
      const current = s.allowances.bonusMonths || [3, 6, 9, 12]
      const next = current.includes(m)
        ? current.filter(x => x !== m)
        : [...current, m].sort((a, b) => a - b)
      return { ...s, allowances: { ...s.allowances, bonusMonths: next } }
    })
  }

  function addYear() {
    const y = parseInt(newYear)
    if (!y || settings.rates[String(y)]) return
    setSettings(s => ({ ...s, rates: { ...s.rates, [String(y)]: 0 } }))
    setNewYear('')
  }

  const weekdays = lang === 'ru'
    ? ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
    : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const decimalProps = {
    type: 'text',
    inputMode: 'decimal',
    pattern: '[0-9]*[.,]?[0-9]*',
  }

  return (
    <div className="page page--settings">

      {/* ── Rates ── */}
      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.rates}</div>
        {Object.entries(ratesDisplay).sort(([a],[b]) => a-b).map(([year, rate]) => (
          <div key={year} className={`settings-row${String(year)===String(currentYear)?' settings-row--current':''}`}>
            <span className="settings-row__label">{year}</span>
            <input
              {...decimalProps}
              className="settings-input settings-input--rate"
              value={getBuf(`rate_${year}`, rate)}
              onChange={e => handleRateChange(year, e.target.value)}
              onBlur={() => handleRateBlur(year)}
            />
          </div>
        ))}
        <div className="settings-row">
          <input
            className="settings-input settings-input--sm"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            placeholder="2027"
            value={newYear}
            onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setNewYear(e.target.value) }}
          />
          <button className="btn-secondary" onClick={addYear}>{t.settings.addYear}</button>
        </div>
      </div>

      {/* ── Week template ── */}
      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.weekTemplate}</div>
        {[1,2,3,4,5,6,0].map(dow => (
          <div key={dow} className="template-row">
            <span className="template-row__day">{weekdays[dow]}</span>
            <select
              className="settings-select"
              value={settings.weekTemplate[String(dow)]?.type || '주간'}
              onChange={e => updateTemplateType(String(dow), e.target.value)}
            >
              {DAY_TYPES.map(dt => (
                <option key={dt} value={dt}>{t.dayTypes[dt]}</option>
              ))}
            </select>
            <input
              {...decimalProps}
              className="settings-input settings-input--sm"
              value={getBuf(`tmpl_${dow}`, settings.weekTemplate[String(dow)]?.overtime ?? 0)}
              onChange={e => handleTemplateOTChange(String(dow), e.target.value)}
              onBlur={() => handleTemplateOTBlur(String(dow))}
            />
          </div>
        ))}
      </div>

      {/* ── Allowances ── */}
      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.allowances}</div>
        {[
          { key: 'job',      label: t.settings.job },
          { key: 'seniority', label: t.settings.seniority },
        ].map(({ key, label }) => (
          <div key={key} className="settings-row">
            <span className="settings-row__label">{label}</span>
            <input
              {...decimalProps}
              className="settings-input"
              value={getBuf(`allow_${key}`, settings.allowances[key])}
              onChange={e => handleAllowanceChange(key, e.target.value)}
              onBlur={() => handleAllowanceBlur(key)}
            />
          </div>
        ))}
        <div className="settings-row">
          <span className="settings-row__label">{t.settings.vacationTotal}</span>
          <input
            {...decimalProps}
            className="settings-input"
            value={getBuf('allow_vacationTotal', settings.allowances.vacationTotal ?? 0)}
            onChange={e => handleAllowanceChange('vacationTotal', e.target.value)}
            onBlur={() => handleAllowanceBlur('vacationTotal')}
          />
        </div>
      </div>

      {/* ── Quarterly bonus ── */}
      <div className="settings-section">
        <div className="settings-section__title-row">
          <span className="section-label">{t.settings.skill}</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.allowances.bonusEnabled}
              onChange={e => setSettings(s => ({ ...s, allowances: { ...s.allowances, bonusEnabled: e.target.checked } }))}
            />
            <span className="toggle__slider" />
          </label>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">{t.settings.bonusAmount}</span>
          <input
            {...decimalProps}
            className="settings-input"
            value={getBuf('allow_bonus', settings.allowances.bonus)}
            onChange={e => handleAllowanceChange('bonus', e.target.value)}
            onBlur={() => handleAllowanceBlur('bonus')}
          />
        </div>
        <div className="section-label settings-subsection-title">{t.settings.bonusMonths}</div>
        <div className="months-grid">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
            const label = new Date(2000, m - 1, 1).toLocaleDateString(monthLocale, { month: 'short' })
            return (
              <button
                key={m}
                className={`chip chip--sm${bonusMonths.includes(m) ? ' chip--active' : ''}`}
                onClick={() => toggleBonusMonth(m)}
              >
                {label}
              </button>
            )
          })}
        </div>
        {sortedBonusMonths.length > 0 && (
          <div className="settings-row settings-row--info">
            <span className="settings-row__label">{t.settings.nextBonus}</span>
            <span className="settings-value--muted">{nextBonusLabel}</span>
          </div>
        )}
      </div>

      {/* ── Night shift ── */}
      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.nightShift}</div>
        {[
          { key: 'bonusMultiplier', label: t.settings.nightBonusMultiplier, hint: t.settings.nightBonusHint, def: 0 },
          { key: 'bonusHours',      label: t.settings.nightBonusHours,      hint: null,                       def: 0 },
        ].map(({ key, label, hint, def }) => (
          <div key={key} className="settings-row">
            <div className="settings-row__label-stack">
              <span>{label}</span>
              {hint && <span className="settings-row__hint">{hint}</span>}
            </div>
            <input
              {...decimalProps}
              className="settings-input settings-input--rate"
              value={getBuf(`night_${key}`, settings.nightShift?.[key] ?? def)}
              onChange={e => handleNightChange(key, e.target.value)}
              onBlur={() => handleNightBlur(key)}
            />
          </div>
        ))}
        <div className="settings-row settings-row--info">
          <span className="settings-value--muted">
            {`Надбавка = ставка × ${settings.nightShift?.bonusMultiplier ?? 0} × ${settings.nightShift?.bonusHours ?? 0}`}
          </span>
        </div>
        <div className="settings-row">
          <div className="settings-row__label-stack">
            <span>{t.settings.nightOvertimeMultiplier}</span>
            <span className="settings-row__hint">{t.settings.nightOvertimeHint}</span>
          </div>
          <input
            {...decimalProps}
            className="settings-input settings-input--rate"
            value={getBuf('night_overtimeMultiplier', settings.nightShift?.overtimeMultiplier ?? 0)}
            onChange={e => handleNightChange('overtimeMultiplier', e.target.value)}
            onBlur={() => handleNightBlur('overtimeMultiplier')}
          />
        </div>
      </div>

      {/* ── Holiday rates ── */}
      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.holidayRates}</div>
        {[
          { key: 'weekdayBase',     label: t.settings.holidayWeekdayBase },
          { key: 'weekdayOvertime', label: t.settings.holidayWeekdayOT },
          { key: 'weekendBase',     label: t.settings.holidayWeekendBase },
          { key: 'weekendOvertime', label: t.settings.holidayWeekendOT },
        ].map(({ key, label }) => (
          <div key={key} className="settings-row">
            <span className="settings-row__label">{label}</span>
            <input
              {...decimalProps}
              className="settings-input settings-input--rate"
              value={getBuf(`hol_${key}`, settings.holidayRates?.[key] ?? 0)}
              onChange={e => handleHolidayChange(key, e.target.value)}
              onBlur={() => handleHolidayBlur(key)}
            />
          </div>
        ))}
      </div>

      {/* ── Currency ── */}
      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.currency}</div>
        <div className="currency-row">
          {CURRENCIES.map(c => (
            <button
              key={c}
              className={`chip${settings.currency===c?' chip--active':''}`}
              onClick={() => setSettings(s => ({ ...s, currency: c, laborLaw: c === 'KRW' ? 'KR' : 'default' }))}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="settings-row settings-row--info">
          <span className="settings-value--muted">
            {settings.currency === 'KRW' ? t.settings.laborLawKR : t.settings.laborLawDefault}
          </span>
        </div>
      </div>

      {/* ── Data ── */}
      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.data}</div>
        <button className="btn-secondary" onClick={() => {
          exportCSV(days, months, String(currentYear), lang)
          haptic.success()
        }}>{t.settings.exportCsv}</button>
        <button className="btn-danger-text" onClick={() => {
          const msg = t.settings.confirmClear.replace('{year}', currentYear)
          if (window.confirm(msg)) clearYear(currentYear)
        }}>{t.settings.clearAll}</button>
      </div>

      <div className="support-divider" />

      {/* ── Support ── */}
      <div className="settings-section">
        <div className="settings-section__title section-label">{t.support.title}</div>

        <div className="stars-grid">
          {[50, 100, 200, 500].map(amount => (
            <button
              key={amount}
              className="btn-stars"
              onClick={() => {
                try {
                  WebApp.openTelegramLink(`https://t.me/PayTrackDonatebot?start=donate_${amount}`)
                } catch {
                  window.open(`https://t.me/PayTrackDonatebot?start=donate_${amount}`, '_blank')
                }
              }}
            >
              ★ {amount}
            </button>
          ))}
        </div>

        <div className="support-wallet-row" onClick={() => {
          const fallbackCopy = (text) => {
            const el = document.createElement('textarea')
            el.value = text
            el.style.cssText = 'position:fixed;opacity:0'
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
          }
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(CRYPTO_WALLET).catch(() => fallbackCopy(CRYPTO_WALLET))
          } else {
            fallbackCopy(CRYPTO_WALLET)
          }
          haptic.success()
          try { WebApp.showAlert(t.support.cryptoCopied) } catch {}
        }}>
          <span className="support-wallet-label">{t.support.crypto}</span>
          <span className="support-wallet-address">{CRYPTO_WALLET}</span>
        </div>

        <div className="support-feedback">
          <button
            className="btn-secondary"
            style={{ width: '100%' }}
            onClick={() => {
              try { WebApp.openTelegramLink(FEEDBACK_URL) } catch { window.open(FEEDBACK_URL, '_blank') }
            }}
          >
            {t.support.feedback}
          </button>
          <span className="support-feedback-hint">{t.support.feedbackHint}</span>
        </div>
      </div>
    </div>
  )
}
