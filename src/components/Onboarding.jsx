import { useState } from 'react'
import { useApp } from '../app/store'
import { DEFAULT_SETTINGS } from '../app/defaults'
import { PAY_TYPES, EMPLOYMENT_TYPES } from '../domain/types'
import { LANGUAGES } from '../i18n'
import { haptics } from '../services/haptics'

export default function Onboarding() {
  const { t, lang, setLang, initSettings } = useApp()
  const [company, setCompany] = useState('')
  const [employment, setEmployment] = useState('regular')
  const [payType, setPayType] = useState('hourly')
  const [rate, setRate] = useState('')
  const currentYear = new Date().getFullYear()

  const rateNum = parseFloat(rate.replace(/[\s,]/g, m => (m === ',' ? '.' : '')))
  const valid = !isNaN(rateNum) && rateNum > 0

  const payLabels = {
    hourly: t.payHourly, daily: t.payDaily, weekly: t.payWeekly, monthly: t.payMonthly, annual: t.payAnnual,
  }

  function employmentLabel(et) {
    if (lang === 'ko') return et.ko
    return `${et.ko} — ${t.employmentTypes[et.id]}`
  }

  function start() {
    if (!valid) return
    haptics.success()
    initSettings({
      ...DEFAULT_SETTINGS,
      payType,
      payRates: { ...DEFAULT_SETTINGS.payRates, [payType]: { [String(currentYear)]: rateNum } },
      profile: { company: company.trim(), employment },
      newYearPromptShown: String(currentYear),
    })
  }

  return (
    <div className="onboarding">
      <div className="onboarding__brand">
        <div className="onboarding__logo num">₩</div>
        <h1 className="onboarding__title">{t.onboarding.title}</h1>
        <p className="onboarding__subtitle">{t.onboarding.subtitle}</p>
      </div>

      <div className="onboarding__form">
        <label className="form-label">{t.language}</label>
        <select className="input input--select" value={lang} onChange={e => setLang(e.target.value)}>
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>

        <label className="form-label" htmlFor="ob-company">{t.company}</label>
        <input
          id="ob-company"
          className="input"
          type="text"
          maxLength={60}
          value={company}
          onChange={e => setCompany(e.target.value)}
        />

        <label className="form-label">{t.employment}</label>
        <select className="input input--select" value={employment} onChange={e => setEmployment(e.target.value)}>
          {EMPLOYMENT_TYPES.map(et => (
            <option key={et.id} value={et.id}>{employmentLabel(et)}</option>
          ))}
        </select>

        <label className="form-label">{t.pay}</label>
        <div className="chips-row">
          {PAY_TYPES.map(pt => (
            <button key={pt} type="button" className={`chip${payType === pt ? ' chip--active' : ''}`}
              onClick={() => { haptics.light(); setPayType(pt) }}>
              {payLabels[pt]}
            </button>
          ))}
        </div>

        <label className="form-label" htmlFor="ob-rate">{payLabels[payType]} (₩)</label>
        <input
          id="ob-rate"
          className="input input--big num"
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={rate}
          onChange={e => { if (/^[\d\s]*[.,]?\d*$/.test(e.target.value)) setRate(e.target.value) }}
        />

        <button type="button" className="btn-primary" disabled={!valid} onClick={start}>
          {t.onboarding.start}
        </button>
      </div>
    </div>
  )
}
