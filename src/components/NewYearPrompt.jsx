import { useState } from 'react'
import { useApp } from '../app/store'
import { getRate } from '../domain/payroll'
import { haptics } from '../services/haptics'

// Shown once at the start of a new year: confirm rate + allowances
export default function NewYearPrompt({ year }) {
  const { t, settings, setSettings } = useApp()
  const payType = settings.payType || 'hourly'
  const prevRate = getRate(settings, year)
  const [rate, setRate] = useState(String(prevRate))
  const [allowances, setAllowances] = useState({ ...settings.allowances })

  const payLabels = {
    hourly: t.payHourly, daily: t.payDaily, weekly: t.payWeekly, monthly: t.payMonthly, annual: t.payAnnual,
  }

  function save() {
    haptics.success()
    const newRate = parseFloat(rate.replace(',', '.')) || prevRate
    setSettings(s => ({
      ...s,
      payRates: {
        ...s.payRates,
        [payType]: { ...s.payRates[payType], [String(year)]: newRate },
      },
      allowances,
      newYearPromptShown: String(year),
    }))
  }

  const numField = (label, key) => (
    <div className="form-group" key={key}>
      <label className="form-label">{label}</label>
      <input
        className="input num"
        type="number"
        inputMode="numeric"
        value={allowances[key]}
        onChange={e => setAllowances(a => ({ ...a, [key]: parseInt(e.target.value) || 0 }))}
      />
    </div>
  )

  const setCustomAmount = (id, val) =>
    setAllowances(a => ({
      ...a,
      custom: (a.custom || []).map(c => (c.id === id ? { ...c, amount: val } : c)),
    }))

  const customField = (item) => (
    <div className="form-group" key={item.id}>
      <label className="form-label">{item.name || t.settings.allowanceName}</label>
      <input
        className="input num"
        type="number"
        inputMode="numeric"
        value={item.amount}
        onChange={e => setCustomAmount(item.id, parseInt(e.target.value) || 0)}
      />
    </div>
  )

  return (
    <div className="onboarding">
      <div className="onboarding__form">
        <h2 className="onboarding__title onboarding__title--sm">{t.newYear.title}</h2>
        <div className="form-group">
          <label className="form-label">{payLabels[payType]} — {year}</label>
          <input
            className="input input--big num"
            type="text"
            inputMode="decimal"
            value={rate}
            onChange={e => { if (/^\d*[.,]?\d*$/.test(e.target.value)) setRate(e.target.value) }}
          />
        </div>
        {(allowances.custom || []).map(customField)}
        {numField(t.settings.skill, 'bonus')}
        <button type="button" className="btn-primary" onClick={save}>{t.newYear.continue}</button>
      </div>
    </div>
  )
}
