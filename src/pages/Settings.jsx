import { useEffect, useState, useSyncExternalStore } from 'react'
import { useApp } from '../app/store'
import { DAY_TYPES, PAY_TYPES, EMPLOYMENT_TYPES } from '../domain/types'
import {
  getRate, getHourlyRate, shiftPaidHoursOf, shiftBreakdownOf, paidNightHoursOf, autoOvertimeOf,
} from '../domain/payroll'
import ShiftTimeline from '../components/ShiftTimeline'
import { todayStr } from '../domain/dates'
import { LANGUAGES } from '../i18n'
import { haptics } from '../services/haptics'
import { exportBackup, importJSON, backupText, restoreFromText } from '../services/backup'
import { subscribeInstall, canInstall, promptInstall, isStandalone, isIOS } from '../services/install'

const DECIMAL_RE = /^[0-9]*[.,]?[0-9]*$/
const uid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10))
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

// Half-hour time picker styled like the app's other selects (native <input type=time>
// renders inconsistently across the webviews this PWA runs in).
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  return `${h}:${i % 2 ? '30' : '00'}`
})

function TimeSelect({ value, onChange }) {
  // Keep an off-grid saved value (e.g. 20:45) selectable instead of silently resetting
  const options = TIME_OPTIONS.includes(value) ? TIME_OPTIONS : [value, ...TIME_OPTIONS]
  return (
    <select
      className="input input--select input--time num"
      value={value}
      onChange={e => { haptics.light(); onChange(e.target.value) }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

// Settings card with a "?" help toggle in the top-right corner
function SettingsCard({ title, help, extra, children }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="card">
      <div className="card__title-row">
        {title ? <h2 className="card__title card__title--inline">{title}</h2> : <span />}
        <div className="card__actions">
          {extra}
          {help && (
            <button
              type="button"
              className={`help-btn${open ? ' help-btn--open' : ''}`}
              aria-label="?"
              aria-expanded={open}
              onClick={() => { haptics.light(); setOpen(o => !o) }}
            >?</button>
          )}
        </div>
      </div>
      {open && <p className="card-help">{help}</p>}
      {children}
    </section>
  )
}

// "Add to home screen". Chrome-family browsers hand us a real install prompt;
// everywhere else (iOS Safari, in-app webviews) we can only explain the steps.
function InstallCard({ t }) {
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false)
  const [standalone, setStandalone] = useState(isStandalone)
  const [installed, setInstalled] = useState(false)

  // Opening the app from the new shortcut switches display-mode in place
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = () => setStandalone(isStandalone())
    mq.addEventListener('change', onChange)
    const onInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      mq.removeEventListener('change', onChange)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Already running from the home screen — nothing left to offer
  if (standalone) return null

  async function handleInstall() {
    haptics.light()
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      setInstalled(true)
      haptics.success()
    }
  }

  return (
    <SettingsCard title={t.install.title} help={t.help.install}>
      {installed ? (
        <p className="muted card__note">{t.install.done}</p>
      ) : installable ? (
        <>
          <button type="button" className="btn-primary" onClick={handleInstall}>
            {t.install.action}
          </button>
          <p className="muted card__note">{t.install.benefit}</p>
        </>
      ) : (
        <>
          <p className="muted card__note">{isIOS() ? t.install.hintIOS : t.install.hintOther}</p>
          <p className="muted card__note">{t.install.benefit}</p>
        </>
      )}
    </SettingsCard>
  )
}

export default function Settings() {
  const {
    t, lang, intl, theme, setLang, setTheme,
    settings, setSettings, reloadAll, formatMoney,
  } = useApp()
  const currentYear = parseInt(todayStr().slice(0, 4))
  const [copied, setCopied] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const patch = (fn) => setSettings(s => fn(s))
  const patchAllowances = (key, val) => patch(s => ({ ...s, allowances: { ...s.allowances, [key]: val } }))
  const patchNight = (key, val) => patch(s => ({ ...s, nightShift: { ...(s.nightShift || {}), [key]: val } }))

  // Night-shift values shown live, plus what they come to in money
  const nightPremium = settings.nightShift?.premiumPercent ?? 50
  const nightStart = settings.nightShift?.start ?? '22:00'
  const nightEnd = settings.nightShift?.end ?? '06:00'
  const winStart = settings.nightShift?.windowStart ?? '22:00'
  const winEnd = settings.nightShift?.windowEnd ?? '06:00'
  const nightMode = settings.nightShift?.mode ?? 'law'
  const breaks = settings.nightShift?.breaks ?? []
  const breakdown = shiftBreakdownOf(settings.nightShift || {})
  const shiftHours = shiftPaidHoursOf(settings.nightShift || {})
  const autoOt = autoOvertimeOf(settings.nightShift || {})
  const nightHours = paidNightHoursOf(settings.nightShift || {})
  const nightOtFactor = settings.nightShift?.overtimeMultiplier ?? 1.5
  const hourlyRate = getHourlyRate(settings, currentYear)

  // "By law" pins the statutory values; "custom" unlocks them for employers
  // that count differently. Switching back to law restores the legal numbers.
  const setNightMode = (mode) => patch(s => ({
    ...s,
    nightShift: {
      ...(s.nightShift || {}),
      mode,
      ...(mode === 'law'
        ? { windowStart: '22:00', windowEnd: '06:00', premiumPercent: 50, overtimeMultiplier: 1.5 }
        : {}),
    },
  }))

  const patchBreaks = (fn) =>
    patch(s => ({ ...s, nightShift: { ...(s.nightShift || {}), breaks: fn(s.nightShift?.breaks ?? []) } }))
  const patchBreak = (i, upd) => patchBreaks(list => list.map((b, k) => (k === i ? { ...b, ...upd } : b)))
  const removeBreak = (i) => patchBreaks(list => list.filter((_, k) => k !== i))
  const addBreak = () => {
    haptics.light()
    patchBreaks(list => [...list, { start: nightStart, minutes: 30 }])
  }

  // Individual (custom) allowances added by the user
  const customAllowances = settings.allowances.custom || []
  const patchCustom = (fn) =>
    patch(s => ({ ...s, allowances: { ...s.allowances, custom: fn(s.allowances.custom || []) } }))
  const addAllowance = () => {
    haptics.light()
    patchCustom(list => [...list, { id: uid(), name: '', amount: 0 }])
  }
  const updateAllowance = (id, key, val) =>
    patchCustom(list => list.map(a => (a.id === id ? { ...a, [key]: val } : a)))
  const removeAllowance = (id) => {
    haptics.light()
    patchCustom(list => list.filter(a => a.id !== id))
  }

  const payType = settings.payType || 'hourly'
  const payLabels = {
    hourly: t.payHourly, daily: t.payDaily, weekly: t.payWeekly, monthly: t.payMonthly, annual: t.payAnnual,
  }

  function employmentLabel(et) {
    if (lang === 'ko') return et.ko
    return `${et.ko} — ${t.employmentTypes[et.id]}`
  }

  // Rate rows for the active scheme: current year + any later years
  const rateYears = [...new Set([
    String(currentYear),
    ...Object.keys(settings.payRates?.[payType] || {}).filter(y => parseInt(y) > currentYear),
  ])].sort()

  function addYear() {
    const y = parseInt(newYear)
    if (!y || y < currentYear || settings.payRates?.[payType]?.[String(y)] !== undefined) return
    haptics.light()
    patch(s => ({
      ...s,
      payRates: {
        ...s.payRates,
        [s.payType]: { ...s.payRates[s.payType], [String(y)]: 0 },
      },
    }))
    setNewYear('')
  }

  function removeYear(year) {
    haptics.light()
    patch(s => {
      const table = { ...s.payRates[s.payType] }
      delete table[year]
      return { ...s, payRates: { ...s.payRates, [s.payType]: table } }
    })
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

  function handleCopyData() {
    copyText(backupText()).then(() => {
      haptics.success()
      window.alert(t.dataCopied)
    }).catch(() => window.alert(t.backupImportError))
  }

  function handlePasteRestore() {
    if (!pasteText.trim()) return
    if (!window.confirm(t.backupImportConfirm)) return
    try {
      restoreFromText(pasteText)
      reloadAll()
      haptics.success()
      setPasteOpen(false)
      setPasteText('')
      window.alert(t.backupImportDone)
    } catch {
      window.alert(t.backupImportError)
    }
  }

  return (
    <div className="page page--settings">

      {/* Language & theme */}
      <SettingsCard title={t.language} help={t.help.language}>
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
      </SettingsCard>

      {/* Add to home screen — hidden once the app runs standalone */}
      <InstallCard t={t} />

      {/* Profile: company + employment type */}
      <SettingsCard title={t.profile} help={t.help.profile}>
        <label className="form-label" htmlFor="st-company">{t.company}</label>
        <input
          id="st-company"
          className="input"
          type="text"
          maxLength={60}
          value={settings.profile?.company || ''}
          onChange={e => patch(s => ({ ...s, profile: { ...s.profile, company: e.target.value } }))}
        />
        <label className="form-label settings-row--gap" style={{ display: 'block' }}>{t.employment}</label>
        <select
          className="input input--select"
          value={settings.profile?.employment || 'regular'}
          onChange={e => patch(s => ({ ...s, profile: { ...s.profile, employment: e.target.value } }))}
        >
          {EMPLOYMENT_TYPES.map(et => (
            <option key={et.id} value={et.id}>{employmentLabel(et)}</option>
          ))}
        </select>
      </SettingsCard>

      {/* Pay: scheme + per-year rates. Rates are stored per scheme, so
          switching schemes never loses previously entered values. */}
      <SettingsCard title={t.pay} help={t.help.pay}>
        <div className="chips-row">
          {PAY_TYPES.map(pt => (
            <button key={pt} type="button" className={`chip${payType === pt ? ' chip--active' : ''}`}
              onClick={() => { haptics.light(); patch(s => ({ ...s, payType: pt })) }}>
              {payLabels[pt]}
            </button>
          ))}
        </div>
        {rateYears.map((year, i) => {
          const deletable = parseInt(year) > currentYear
          return (
            <div key={`${payType}-${year}`}
              className={`settings-row settings-row--rate${year === String(currentYear) ? ' settings-row--current' : ''}${i === 0 ? ' settings-row--gap' : ''}`}>
              <span className="settings-row__label">{payLabels[payType]} · <span className="num">{year}</span></span>
              <DecimalInput
                value={settings.payRates?.[payType]?.[year] ?? (year === String(currentYear) ? getRate(settings, currentYear) : 0)}
                className="input input--rate num"
                onCommit={v => patch(s => ({
                  ...s,
                  payRates: {
                    ...s.payRates,
                    [s.payType]: { ...s.payRates[s.payType], [year]: v },
                  },
                }))}
              />
              {deletable
                ? <button type="button" className="icon-btn" aria-label="✕" onClick={() => removeYear(year)}>✕</button>
                : <span className="icon-btn icon-btn--ghost" aria-hidden="true" />}
            </div>
          )
        })}
        <div className="settings-row">
          <input
            className="input input--sm num"
            type="text" inputMode="numeric" placeholder={String(currentYear + 1)}
            value={newYear}
            onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setNewYear(e.target.value) }}
          />
          <button type="button" className="btn-secondary" onClick={addYear}>{t.settings.addYear}</button>
        </div>
      </SettingsCard>

      {/* Week template */}
      <SettingsCard title={t.settings.weekTemplate} help={t.help.weekTemplate}>
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
      </SettingsCard>

      {/* Allowances */}
      <SettingsCard title={t.settings.allowances} help={t.help.allowances}>
        <div className="settings-row">
          <span className="settings-row__label">{t.settings.vacationTotal}</span>
          <DecimalInput value={settings.allowances.vacationTotal ?? 0} className="input input--rate num"
            onCommit={v => patchAllowances('vacationTotal', v)} />
        </div>
        {customAllowances.map((a, i) => (
          <div key={a.id} className={`settings-row settings-row--rate${i === 0 ? ' settings-row--gap' : ''}`}>
            <input
              className="input input--grow"
              type="text"
              value={a.name}
              placeholder={t.settings.allowanceName}
              onChange={e => updateAllowance(a.id, 'name', e.target.value)}
            />
            <DecimalInput value={a.amount ?? 0} className="input input--rate num"
              onCommit={v => updateAllowance(a.id, 'amount', v)} />
            <button type="button" className="icon-btn" aria-label="✕"
              onClick={() => removeAllowance(a.id)}>✕</button>
          </div>
        ))}
        <button type="button" className="btn-secondary btn-secondary--center settings-row--gap"
          onClick={addAllowance}>{t.settings.addAllowance}</button>
      </SettingsCard>

      {/* Quarterly bonus */}
      <SettingsCard
        title={t.settings.skill}
        help={t.help.bonus}
        extra={(
          <label className="switch">
            <input type="checkbox" checked={settings.allowances.bonusEnabled}
              onChange={e => patchAllowances('bonusEnabled', e.target.checked)} />
            <span className="switch__slider" />
          </label>
        )}
      >
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
      </SettingsCard>

      {/* Night shift — law preset or a fully manual schedule */}
      <SettingsCard title={t.settings.nightShift} help={t.help.nightShift}>
        <div className="mode-switch" role="group" aria-label={t.settings.nightShift}>
          {['law', 'custom'].map(m => (
            <button
              key={m}
              type="button"
              className={`mode-switch__btn${nightMode === m ? ' mode-switch__btn--active' : ''}`}
              onClick={() => { haptics.light(); setNightMode(m) }}
            >
              {m === 'law' ? t.settings.modeLaw : t.settings.modeCustom}
            </button>
          ))}
        </div>

        <ShiftTimeline
          t={t}
          start={nightStart}
          end={nightEnd}
          breakdown={breakdown}
          onChange={patchNight}
        />

        {/* Breaks carry a start time: one inside the night window costs night
            hours, one outside it does not */}
        <div className="settings-row settings-row--info">
          <span className="settings-row__label settings-row__label--stack">
            {t.settings.breaks}
            <small className="muted">{t.settings.breakHint}</small>
          </span>
        </div>
        {breaks.map((b, i) => (
          <div className="break-row" key={i}>
            <TimeSelect value={b.start} onChange={v => patchBreak(i, { start: v })} />
            <DecimalInput
              value={b.minutes}
              className="input input--sm num"
              onCommit={v => patchBreak(i, { minutes: Math.max(0, v) })}
            />
            <span className="muted break-row__unit">{t.settings.minutesShort}</span>
            <button type="button" className="icon-btn" aria-label="✕"
              onClick={() => { haptics.light(); removeBreak(i) }}>✕</button>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={addBreak}>
          + {t.settings.addBreak}
        </button>

        {nightMode === 'custom' && (
          <div className="settings-row">
            <span className="settings-row__label settings-row__label--stack">
              {t.settings.nightWindow}
              <small className="muted">{t.settings.nightWindowHint}</small>
            </span>
            <div className="time-range">
              <TimeSelect value={winStart} onChange={v => patchNight('windowStart', v)} />
              <span className="time-range__dash">—</span>
              <TimeSelect value={winEnd} onChange={v => patchNight('windowEnd', v)} />
            </div>
          </div>
        )}

        <div className="settings-row settings-row--info">
          <span className="settings-row__label">{t.settings.shiftLength}</span>
          <span className="muted num">{shiftHours} {t.dashboard.hoursSuffix}</span>
        </div>
        {autoOt > 0 && (
          <div className="settings-row settings-row--info">
            <span className="settings-row__label settings-row__label--stack">
              {t.settings.autoOvertime}
              <small className="muted">{t.settings.autoOvertimeHint}</small>
            </span>
            <span className="num night-hours">{autoOt} {t.dashboard.hoursSuffix}</span>
          </div>
        )}
        <div className="settings-row settings-row--info">
          <span className="settings-row__label">
            {t.settings.nightHoursCounted} <span className="num">({winStart}–{winEnd})</span>
          </span>
          <span className="num night-hours">{nightHours} {t.dashboard.hoursSuffix}</span>
        </div>
        {nightHours === 0 && <p className="card-help">{t.settings.nightNoneHint}</p>}

        {nightMode === 'law' ? (
          <div className="settings-row settings-row--info">
            <span className="settings-row__label settings-row__label--stack">
              {t.settings.nightPremium}
              <small className="muted">{t.settings.lawLocked}</small>
            </span>
            <span className="muted num">{nightPremium}%</span>
          </div>
        ) : (
          <div className="settings-row">
            <span className="settings-row__label settings-row__label--stack">
              {t.settings.nightPremium}
              <small className="muted">{t.settings.nightPremiumHint}</small>
            </span>
            <DecimalInput value={nightPremium} className="input input--rate num"
              onCommit={v => patchNight('premiumPercent', v)} />
          </div>
        )}
        {hourlyRate > 0 && nightHours > 0 && (
          <div className="money-preview">
            +{formatMoney(Math.round(hourlyRate * (nightPremium / 100) * nightHours))} {t.settings.perShift}
            <small className="muted"> · {formatMoney(Math.round(hourlyRate * (nightPremium / 100)))} {t.settings.perHour}</small>
          </div>
        )}

        {nightMode === 'custom' && (
          <div className="settings-row">
            <span className="settings-row__label settings-row__label--stack">
              {t.settings.nightOtRate}
              <small className="muted">{t.settings.nightOtHint}</small>
            </span>
            <DecimalInput value={nightOtFactor} className="input input--rate num"
              onCommit={v => patchNight('overtimeMultiplier', v)} />
          </div>
        )}
        {hourlyRate > 0 && (
          <div className="money-preview">
            {formatMoney(Math.round(hourlyRate * nightOtFactor))} {t.settings.perOtHour}
          </div>
        )}
      </SettingsCard>

      {/* Public holidays */}
      <SettingsCard title={t.settings.holidayRates} help={t.help.holidayRates}>
        {[
          ['weekdayBase', t.settings.holidayWeekdayBase],
          ['weekdayOvertime', t.settings.holidayWeekdayOT],
          ['weekendBase', t.settings.holidayWeekendBase],
          ['weekendOvertime', t.settings.holidayWeekendOT],
        ].map(([key, label]) => {
          const val = settings.holidayRates?.[key] ?? 0
          const isOt = key.endsWith('Overtime')
          return (
            <div key={key}>
              <div className="settings-row">
                <span className="settings-row__label">{label}</span>
                <DecimalInput value={val} className="input input--rate num"
                  onCommit={v => patch(s => ({ ...s, holidayRates: { ...s.holidayRates, [key]: v } }))} />
              </div>
              {hourlyRate > 0 && (
                <div className="money-preview">
                  {isOt
                    ? `${formatMoney(Math.round(hourlyRate * val))} ${t.settings.perOtHour}`
                    : `+${formatMoney(Math.round(hourlyRate * 8 * val))} ${t.settings.perDay}`}
                </div>
              )}
            </div>
          )
        })}
      </SettingsCard>

      {/* Data: export / import — file-based plus copy/paste as text for
          webviews that block downloads (e.g. Telegram) */}
      <SettingsCard title={t.settings.data} help={t.help.data}>
        <div className="data-actions">
          <button type="button" className="btn-secondary data-actions__btn"
            onClick={async () => { if (await exportBackup() !== 'cancelled') haptics.success() }}>
            ⬇ {t.exportData}
          </button>
          <button type="button" className="btn-secondary data-actions__btn" onClick={handleImport}>
            ⬆ {t.importData}
          </button>
        </div>
        <div className="data-actions data-actions--secondary">
          <button type="button" className="btn-secondary data-actions__btn" onClick={handleCopyData}>
            {t.exportCopy}
          </button>
          <button type="button"
            className={`btn-secondary data-actions__btn${pasteOpen ? ' data-actions__btn--active' : ''}`}
            onClick={() => { haptics.light(); setPasteOpen(o => !o) }}>
            {t.importPaste}
          </button>
        </div>
        {pasteOpen && (
          <div className="paste-box">
            <textarea
              className="input paste-box__area"
              rows={4}
              placeholder={t.pasteHint}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
            />
            <button type="button" className="btn-primary" disabled={!pasteText.trim()} onClick={handlePasteRestore}>
              {t.restore}
            </button>
          </div>
        )}
      </SettingsCard>

      {/* Support */}
      <SettingsCard title={t.support.title} help={t.help.support}>
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
      </SettingsCard>
    </div>
  )
}
