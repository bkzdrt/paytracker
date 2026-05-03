import { useState } from 'react'
import { exportCSV } from '../utils/export'
import { todayStr } from '../utils/dates'
import { DAY_TYPES } from '../utils/calculations'
import WebApp from '@twa-dev/sdk'

// TODO: заменить на реальный URL инвойса от бота
const STARS_INVOICE_URL = 'YOUR_INVOICE_URL'

// TON network wallet
const CRYPTO_WALLET = 'UQCWSZkplJiZ-UHwOsUwwcNypYEFS3Gq2_ws2tiLwjEN0wCZ'

const FEEDBACK_URL = 'https://t.me/bekzodart'

const CURRENCIES = ['KRW', 'RUB', 'USD', 'EUR', 'KZT', 'UZS']

export default function Settings({ settings, setSettings, days, months, t, lang, haptic, clearYear }) {
  const currentYear = parseInt(todayStr().slice(0, 4))
  const [newYear, setNewYear] = useState('')
  const [rateStrings, setRateStrings] = useState({})

  // Show current year + any years > currentYear; past years hidden (still used in calculations)
  const ratesDisplay = {
    [String(currentYear)]: settings.rates[String(currentYear)] ?? 0,
    ...Object.fromEntries(
      Object.entries(settings.rates).filter(([y]) => parseInt(y) > currentYear)
    ),
  }

  function getRateDisplay(year, rate) {
    return year in rateStrings ? rateStrings[year] : String(rate)
  }

  function handleRateChange(year, val) {
    if (!/^\d*\.?\d{0,6}$/.test(val)) return
    setRateStrings(s => ({ ...s, [year]: val }))
    const parsed = parseFloat(val)
    if (!isNaN(parsed)) updateRate(year, String(parsed))
  }

  function handleRateBlur(year, val) {
    const parsed = parseFloat(val) || 0
    updateRate(year, String(parsed))
    setRateStrings(s => ({ ...s, [year]: String(parsed) }))
  }

  const bonusMonths = settings.allowances.bonusMonths || [3, 6, 9, 12]
  const todayMonth = new Date().getMonth() + 1
  const monthLocale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const sortedBonusMonths = [...bonusMonths].sort((a, b) => a - b)
  const nextBonusMonth = sortedBonusMonths.find(m => m > todayMonth) || sortedBonusMonths[0]
  const nextBonusYear = nextBonusMonth && nextBonusMonth > todayMonth ? currentYear : currentYear + 1
  const nextBonusLabel = nextBonusMonth
    ? new Date(nextBonusYear, nextBonusMonth - 1, 1).toLocaleDateString(monthLocale, { month: 'long', year: 'numeric' })
    : '—'

  function updateRate(year, val) {
    setSettings(s => ({ ...s, rates: { ...s.rates, [year]: parseFloat(val) || 0 } }))
  }

  function addYear() {
    const y = parseInt(newYear)
    if (!y || settings.rates[String(y)]) return
    setSettings(s => ({ ...s, rates: { ...s.rates, [String(y)]: 0 } }))
    setNewYear('')
  }

  function updateAllowance(key, val) {
    setSettings(s => ({ ...s, allowances: { ...s.allowances, [key]: parseInt(val) || 0 } }))
  }

  function toggleBonusMonth(m) {
    setSettings(s => {
      const current = s.allowances.bonusMonths || [3, 6, 9, 12]
      const next = current.includes(m)
        ? current.filter(x => x !== m)
        : [...current, m].sort((a, b) => a - b)
      return { ...s, allowances: { ...s.allowances, bonusMonths: next } }
    })
  }

  function updateNightShift(key, val) {
    if (!/^\d*\.?\d{0,4}$/.test(val)) return
    const parsed = parseFloat(val)
    if (!isNaN(parsed)) {
      setSettings(s => ({ ...s, nightShift: { ...(s.nightShift || {}), [key]: parsed } }))
    }
  }

  function updateHolidayRate(key, val) {
    if (!/^\d*\.?\d{0,4}$/.test(val)) return
    const parsed = parseFloat(val)
    if (!isNaN(parsed)) {
      setSettings(s => ({ ...s, holidayRates: { ...s.holidayRates, [key]: parsed } }))
    }
  }

  function updateTemplate(dow, field, val) {
    setSettings(s => ({
      ...s,
      weekTemplate: {
        ...s.weekTemplate,
        [dow]: { ...s.weekTemplate[dow], [field]: field === 'overtime' ? parseFloat(val) || 0 : val }
      }
    }))
  }

  const weekdays = lang === 'ru'
    ? ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
    : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <div className="page page--settings">
      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.rates}</div>
        {Object.entries(ratesDisplay).sort(([a],[b]) => a-b).map(([year, rate]) => (
          <div key={year} className={`settings-row${String(year)===String(currentYear)?' settings-row--current':''}`}>
            <span className="settings-row__label">{year}</span>
            <input
              className="settings-input settings-input--rate"
              type="text"
              value={getRateDisplay(year, rate)}
              onChange={e => handleRateChange(year, e.target.value)}
              onBlur={e => handleRateBlur(year, e.target.value)}
              inputMode="decimal"
            />
          </div>
        ))}
        <div className="settings-row">
          <input
            className="settings-input settings-input--sm"
            type="number"
            placeholder="2027"
            value={newYear}
            onChange={e => setNewYear(e.target.value)}
            inputMode="numeric"
          />
          <button className="btn-secondary" onClick={addYear}>{t.settings.addYear}</button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.weekTemplate}</div>
        {[1,2,3,4,5,6,0].map(dow => (
          <div key={dow} className="template-row">
            <span className="template-row__day">{weekdays[dow]}</span>
            <select
              className="settings-select"
              value={settings.weekTemplate[String(dow)]?.type || '주간'}
              onChange={e => updateTemplate(String(dow), 'type', e.target.value)}
            >
              {DAY_TYPES.map(dt => (
                <option key={dt} value={dt}>{t.dayTypes[dt]}</option>
              ))}
            </select>
            <input
              className="settings-input settings-input--sm"
              type="number"
              value={settings.weekTemplate[String(dow)]?.overtime || 0}
              onChange={e => updateTemplate(String(dow), 'overtime', e.target.value)}
              inputMode="decimal"
            />
          </div>
        ))}
      </div>

      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.allowances}</div>
        {[
          { key: 'job', label: t.settings.job },
          { key: 'seniority', label: t.settings.seniority },
        ].map(({ key, label }) => (
          <div key={key} className="settings-row">
            <span className="settings-row__label">{label}</span>
            <input
              className="settings-input"
              type="number"
              value={settings.allowances[key]}
              onChange={e => updateAllowance(key, e.target.value)}
              inputMode="numeric"
            />
          </div>
        ))}
        <div className="settings-row">
          <span className="settings-row__label">{t.settings.vacationTotal}</span>
          <input
            className="settings-input"
            type="number"
            value={settings.allowances.vacationTotal ?? 0}
            onChange={e => updateAllowance('vacationTotal', e.target.value)}
            inputMode="numeric"
          />
        </div>
      </div>

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
            className="settings-input"
            type="number"
            value={settings.allowances.bonus}
            onChange={e => updateAllowance('bonus', e.target.value)}
            inputMode="numeric"
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

      <div className="settings-section">
        <div className="settings-section__title section-label">{t.settings.nightShift}</div>
        {[
          { key: 'bonusMultiplier', label: t.settings.nightBonusMultiplier, hint: t.settings.nightBonusHint },
          { key: 'bonusHours',      label: t.settings.nightBonusHours,      hint: null },
        ].map(({ key, label, hint }) => (
          <div key={key} className="settings-row">
            <div className="settings-row__label-stack">
              <span>{label}</span>
              {hint && <span className="settings-row__hint">{hint}</span>}
            </div>
            <input
              className="settings-input settings-input--rate"
              type="text"
              value={settings.nightShift?.[key] ?? (key === 'bonusMultiplier' ? 0.5 : 7.5)}
              onChange={e => updateNightShift(key, e.target.value)}
              inputMode="decimal"
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
            className="settings-input settings-input--rate"
            type="text"
            value={settings.nightShift?.overtimeMultiplier ?? 0}
            onChange={e => updateNightShift('overtimeMultiplier', e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>

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
              className="settings-input settings-input--rate"
              type="text"
              value={settings.holidayRates?.[key] ?? ''}
              onChange={e => updateHolidayRate(key, e.target.value)}
              inputMode="decimal"
            />
          </div>
        ))}
      </div>

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
          const copy = (text) => {
            if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
            } else {
              fallbackCopy(text)
            }
          }
          const fallbackCopy = (text) => {
            const el = document.createElement('textarea')
            el.value = text
            el.style.cssText = 'position:fixed;opacity:0'
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
          }
          copy(CRYPTO_WALLET)
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
