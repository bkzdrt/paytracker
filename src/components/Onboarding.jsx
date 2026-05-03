import { useState } from 'react'

const CURRENCIES = ['KRW', 'RUB', 'USD', 'EUR', 'KZT', 'UZS']

export default function Onboarding({ defaultCurrency, onStart, t }) {
  const [rate, setRate] = useState('0')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)

  function handleStart() {
    if (!rate || isNaN(rate)) return
    onStart(parseInt(rate), currency)
  }

  return (
    <div className="onboarding">
      <div className="onboarding__content">
        <h1 className="onboarding__title">{t.onboarding.title}</h1>
        <p className="onboarding__subtitle">{t.onboarding.subtitle}</p>
        <div className="form-group">
          <label className="form-label">{t.onboarding.rateLabel}</label>
          <div className="onboarding__rate-row">
            <input
              className="form-input"
              type="number"
              value={rate}
              onChange={e => setRate(e.target.value)}
              inputMode="numeric"
              placeholder="0"
            />
            <button className="currency-badge" onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}>
              {currency}
            </button>
          </div>
          {showCurrencyPicker && (
            <div className="currency-picker">
              {CURRENCIES.map(c => (
                <button key={c} className={`currency-option${c===currency?' active':''}`}
                  onClick={() => { setCurrency(c); setShowCurrencyPicker(false) }}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="btn-primary" onClick={handleStart} disabled={!rate}>{t.onboarding.start}</button>
      </div>
    </div>
  )
}
