import { useState } from 'react'
import { useApp } from '../app/store'
import { DEFAULT_SETTINGS } from '../app/defaults'
import { LANGUAGES } from '../i18n'
import { haptics } from '../services/haptics'

const CURRENCIES = ['KRW', 'RUB', 'USD', 'EUR', 'KZT', 'UZS']

export default function Onboarding() {
  const { t, lang, setLang, initSettings } = useApp()
  const [rate, setRate] = useState('')
  const [currency, setCurrency] = useState(lang === 'ru' ? 'RUB' : 'KRW')
  const currentYear = new Date().getFullYear()

  const rateNum = parseFloat(rate.replace(',', '.'))
  const valid = !isNaN(rateNum) && rateNum > 0

  function start() {
    if (!valid) return
    haptics.success()
    initSettings({
      ...DEFAULT_SETTINGS,
      currency,
      laborLaw: currency === 'KRW' ? 'KR' : 'default',
      rates: { [String(currentYear)]: rateNum },
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

        <label className="form-label">{t.settings.currency}</label>
        <div className="chips-row">
          {CURRENCIES.map(c => (
            <button key={c} type="button" className={`chip${currency === c ? ' chip--active' : ''}`}
              onClick={() => { haptics.light(); setCurrency(c) }}>{c}</button>
          ))}
        </div>

        <label className="form-label" htmlFor="ob-rate">{t.onboarding.rateLabel}</label>
        <input
          id="ob-rate"
          className="input input--big num"
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={rate}
          onChange={e => { if (/^\d*[.,]?\d*$/.test(e.target.value)) setRate(e.target.value) }}
        />

        <button type="button" className="btn-primary" disabled={!valid} onClick={start}>
          {t.onboarding.start}
        </button>
      </div>
    </div>
  )
}
