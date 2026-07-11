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
        {numField(t.settings.job, 'job')}
        {numField(t.settings.seniority, 'seniority')}
        {numField(t.settings.skill, 'bonus')}
        <button type="button" className="btn-primary" onClick={save}>{t.newYear.continue}</button>
      </div>
    </div>
  )
}
