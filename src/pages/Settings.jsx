import { useState } from 'react'
import { useApp } from '../app/store'
import { DAY_TYPES } from '../domain/types'
import { todayStr } from '../domain/dates'
import { LANGUAGES } from '../i18n'
import { haptics } from '../services/haptics'
import { exportCSV, exportJSON, importJSON } from '../services/backup'
import { storedYears } from '../services/storage'

const CURRENCIES = ['KRW', 'RUB', 'USD', 'EUR', 'KZT', 'UZS']
const DECIMAL_RE = /^[0-9]*[.,]?[0-9]*$/
const TON_WALLET = 'UQCWSZkplJiZ-UHwOsUwwcNypYEFS3Gq2_ws2tiLwjEN0wCZ'
const FEEDBACK_URL = 'https://t.me/bekzodart'

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      resolve()
    } catch (e) { reject(e) }
  })
}

// Decimal input that lets you type "0." freely and commits parsed numbers
function DecimalInput({ value, onCommit, className = 'input input--sm num' }) {
  const [buf, setBuf] = useState(null)
  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={buf ?? String(value ?? 0)}
      onChange={e => {
        const v = e.target.value
        if (!DECIMAL_RE.test(v)) return
        setBuf(v)
        const parsed = parseFloat(v.replace(',', '.'))
        if (!isNaN(parsed)) onCommit(parsed)
      }}
      onBlur={() => {
        if (buf !== null) onCommit(parseFloat(buf.replace(',', '.')) || 0)
        setBuf(null)
      }}
    />
  )
}

export default function Settings() {
  const {
    t, lang, intl, theme, setLang, setTheme,
    settings, setSettings, days, months, clearYear, reloadAll,
  } = useApp()
  const currentYear = parseInt(todayStr().slice(0, 4))
  const [newYear, setNewYear] = useState('')
  const [copied, setCopied] = useState(false)

  const patch = (fn) => setSettings(s => fn(s))
  const patchAllowances = (key, val) => patch(s => ({ ...s, allowances: { ...s.allowances, [key]: val } }))

  // Rates: current year + future years
  const ratesDisplay = {
    [String(currentYear)]: settings.rates[String(currentYear)] ?? 0,
    ...Object.fromEntries(Object.entries(settings.rates).filter(([y]) => parseInt(y) > currentYear)),
  }

  function addYear() {
    const y = parseInt(newYear)
    if (!y || y < currentYear || settings.rates[String(y)] !== undefined) return
    patch(s => ({ ...s, rates: { ...s.rates, [String(y)]: s.rates[String(currentYear)] || 0 } }))
    setNewYear('')
  }

  // Quarterly bonus
  const bonusMonths = settings.allowances.bonusMonths || [3, 6, 9, 12]
  const todayMonth = new Date().getMonth() + 1
  const sorted = [...bonusMonths].sort((a, b) => a - b)
  const nextBonusMonth = sorted.find(m => m > todayMonth) || sorted[0]
  const nextBonusLabel = nextBonusMonth
    ? new Date(nextBonusMonth > todayMonth ? currentYear : currentYear + 1, nextBonusMonth - 1, 1)
        .toLocaleDateString(intl, { month: 'long', year: 'numeric' })
    : '—'

  function toggleBonusMonth(m) {
    haptics.light()
    patchAllowances('bonusMonths',
      bonusMonths.includes(m) ? bonusMonths.filter(x => x !== m) : [...bonusMonths, m].sort((a, b) => a - b))
  }

  async function handleImport() {
    if (!window.confirm(t.backupImportConfirm)) return
    try {
      const ok = await importJSON()
      if (ok) {
        reloadAll()
        haptics.success()
        window.alert(t.backupImportDone)
      }
    } catch {
      window.alert(t.backupImportError)
    }
  }

  function handleClearYear() {
    const msg = t.settings.confirmClear.replace('{year}', currentYear)
    if (window.confirm(msg)) clearYear(currentYear)
  }

  const dataYears = storedYears()

  return (
    <div className="page page--settings">

      {/* Language & theme */}
      <section className="card">
        <h2 className="card__title">{t.language}</h2>
        <select className="input input--select" value={lang} onChange={e => setLang(e.target.value)}>
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <div className="settings-row settings-row--gap">
          <span className="settings-row__label">{t.theme}</span>
          <div className="seg">
            {[['auto', t.themeAuto], ['light', t.themeLight], ['dark', t.themeDark]].map(([val, label]) => (
              <button key={val} type="button"
                className={`seg__btn${theme === val ? ' seg__btn--active' : ''}`}
                onClick={() => { haptics.light(); setTheme(val) }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Hourly rates */}
      <section className="card">
        <h2 className="card__title">{t.settings.rates}</h2>
        {Object.entries(ratesDisplay).sort(([a], [b]) => a - b).map(([year, rate]) => (
          <div key={year} className={`settings-row${String(year) === String(currentYear) ? ' settings-row--current' : ''}`}>
            <span className="settings-row__label num">{year}</span>
            <DecimalInput value={rate} className="input input--rate num"
              onCommit={v => patch(s => ({ ...s, rates: { ...s.rates, [year]: v } }))} />
          </div>
        ))}
        <div className="settings-row">
          <input
            className="input input--sm num"
            type="text" inputMode="numeric" placeholder={String(currentYear + 1)}
            value={newYear}
            onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setNewYear(e.target.value) }}
          />
          <button type="button" className="btn-secondary" onClick={addYear}>{t.settings.addYear}</button>
        </div>
      </section>

      {/* Week template */}
      <section className="card">
        <h2 className="card__title">{t.settings.weekTemplate}</h2>
        {[1, 2, 3, 4, 5, 6, 0].map(dow => (
          <div key={dow} className="settings-row settings-row--template">
            <span className="settings-row__label">{t.weekdays.short[dow]}</span>
            <select
              className="input input--select input--grow"
              value={settings.weekTemplate[String(dow)]?.type || 'day'}
              onChange={e => patch(s => ({
                ...s,
                weekTemplate: { ...s.weekTemplate, [dow]: { ...s.weekTemplate[String(dow)], type: e.target.value } },
              }))}
            >
              {DAY_TYPES.filter(dt => dt !== 'casual').map(dt => (
                <option key={dt} value={dt}>{t.dayTypes[dt]}</option>
              ))}
            </select>
            <DecimalInput
              value={settings.weekTemplate[String(dow)]?.overtime ?? 0}
              onCommit={v => patch(s => ({
                ...s,
                weekTemplate: { ...s.weekTemplate, [dow]: { ...s.weekTemplate[String(dow)], overtime: v } },
              }))}
            />
          </div>
        ))}
      </section>

      {/* Allowances */}
      <section className="card">
        <h2 className="card__title">{t.settings.allowances}</h2>
        {[['job', t.settings.job], ['seniority', t.settings.seniority], ['vacationTotal', t.settings.vacationTotal]].map(([key, label]) => (
          <div key={key} className="settings-row">
            <span className="settings-row__label">{label}</span>
            <DecimalInput value={settings.allowances[key] ?? 0} className="input input--rate num"
              onCommit={v => patchAllowances(key, v)} />
          </div>
        ))}
      </section>

      {/* Quarterly bonus */}
      <section className="card">
        <div className="card__title-row">
          <h2 className="card__title card__title--inline">{t.settings.skill}</h2>
          <label className="switch">
            <input type="checkbox" checked={settings.allowances.bonusEnabled}
              onChange={e => patchAllowances('bonusEnabled', e.target.checked)} />
            <span className="switch__slider" />
          </label>
        </div>
        {settings.allowances.bonusEnabled && (
          <>
            <div className="settings-row">
              <span className="settings-row__label">{t.settings.bonusAmount}</span>
              <DecimalInput value={settings.allowances.bonus} className="input input--rate num"
                onCommit={v => patchAllowances('bonus', v)} />
            </div>
            <div className="form-label">{t.settings.bonusMonths}</div>
            <div className="chips-row">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <button key={m} type="button"
                  className={`chip chip--sm${bonusMonths.includes(m) ? ' chip--active' : ''}`}
                  onClick={() => toggleBonusMonth(m)}>
                  {new Date(2000, m - 1, 1).toLocaleDateString(intl, { month: 'short' })}
                </button>
              ))}
            </div>
            {sorted.length > 0 && (
              <div className="settings-row settings-row--info">
                <span className="settings-row__label">{t.settings.nextBonus}</span>
                <span className="muted">{nextBonusLabel}</span>
              </div>
            )}
          </>
        )}
      </section>

      {/* Night shift */}
      <section className="card">
        <h2 className="card__title">{t.settings.nightShift}</h2>
        {[
          { key: 'bonusMultiplier', label: t.settings.nightBonusMultiplier, hint: t.settings.nightBonusHint },
          { key: 'bonusHours', label: t.settings.nightBonusHours },
          { key: 'overtimeMultiplier', label: t.settings.nightOvertimeMultiplier, hint: t.settings.nightOvertimeHint },
        ].map(({ key, label, hint }) => (
          <div key={key} className="settings-row">
            <span className="settings-row__label settings-row__label--stack">
              {label}
              {hint && <small className="muted">{hint}</small>}
            </span>
            <DecimalInput value={settings.nightShift?.[key] ?? 0} className="input input--rate num"
              onCommit={v => patch(s => ({ ...s, nightShift: { ...(s.nightShift || {}), [key]: v } }))} />
          </div>
        ))}
      </section>

      {/* Public holidays */}
      <section className="card">
        <h2 className="card__title">{t.settings.holidayRates}</h2>
        {[
          ['weekdayBase', t.settings.holidayWeekdayBase],
          ['weekdayOvertime', t.settings.holidayWeekdayOT],
          ['weekendBase', t.settings.holidayWeekendBase],
          ['weekendOvertime', t.settings.holidayWeekendOT],
        ].map(([key, label]) => (
          <div key={key} className="settings-row">
            <span className="settings-row__label">{label}</span>
            <DecimalInput value={settings.holidayRates?.[key] ?? 0} className="input input--rate num"
              onCommit={v => patch(s => ({ ...s, holidayRates: { ...s.holidayRates, [key]: v } }))} />
          </div>
        ))}
      </section>

      {/* Currency */}
      <section className="card">
        <h2 className="card__title">{t.settings.currency}</h2>
        <div className="chips-row">
          {CURRENCIES.map(c => (
            <button key={c} type="button" className={`chip${settings.currency === c ? ' chip--active' : ''}`}
              onClick={() => { haptics.light(); patch(s => ({ ...s, currency: c, laborLaw: c === 'KRW' ? 'KR' : 'default' })) }}>
              {c}
            </button>
          ))}
        </div>
        <p className="muted card__note">
          {settings.currency === 'KRW' ? t.settings.laborLawKR : t.settings.laborLawDefault}
        </p>
      </section>

      {/* Data */}
      <section className="card">
        <h2 className="card__title">{t.settings.data}</h2>
        <div className="btn-stack">
          <button type="button" className="btn-secondary" onClick={() => { exportJSON(); haptics.success() }}>
            ⬇ {t.backupExport}
          </button>
          <button type="button" className="btn-secondary" onClick={handleImport}>
            ⬆ {t.backupImport}
          </button>
          <button type="button" className="btn-secondary"
            onClick={() => { exportCSV(days, months, currentYear); haptics.success() }}>
            {t.settings.exportCsv} ({currentYear})
          </button>
          {dataYears.length > 0 && (
            <button type="button" className="btn-ghost-danger" onClick={handleClearYear}>
              {t.settings.clearAll} ({currentYear})
            </button>
          )}
        </div>
      </section>

      {/* Support */}
      <section className="card card--support">
        <h2 className="card__title">{t.support.title}</h2>
        <div className="stars-grid">
          {[50, 100, 200, 500].map(amount => (
            <a key={amount} className="btn-stars"
              href={`https://t.me/PayTrackDonatebot?start=donate_${amount}`}
              target="_blank" rel="noreferrer">
              ★ {amount}
            </a>
          ))}
        </div>
        <button type="button" className="wallet-row" onClick={() => {
          copyText(TON_WALLET).then(() => {
            haptics.success()
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
          }).catch(() => {})
        }}>
          <span className="wallet-row__label">{copied ? t.support.cryptoCopied : t.support.crypto}</span>
          <span className="wallet-row__address num">{TON_WALLET}</span>
        </button>
        <a className="btn-secondary btn-secondary--center" href={FEEDBACK_URL} target="_blank" rel="noreferrer">
          {t.support.feedback}
        </a>
        <p className="muted card__note">{t.support.feedbackHint}</p>
      </section>
    </div>
  )
}
