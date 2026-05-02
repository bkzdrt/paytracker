import { useState } from 'react'

export default function NewYearPrompt({ year, settings, onSave, t }) {
  const prevRate = settings.rates[String(year - 1)] || settings.rates[String(year)] || 13589
  const [rate, setRate] = useState(String(prevRate))
  const [allowances, setAllowances] = useState({ ...settings.allowances })

  function handleSave() {
    const newRate = parseInt(rate) || prevRate
    onSave(newRate, allowances)
  }

  return (
    <div className="overlay">
      <div className="new-year-prompt">
        <h2 className="new-year-prompt__title">{t.newYear.title}</h2>
        <div className="form-group">
          <label className="form-label">{t.newYear.rateLabel.replace('{year}', year)}</label>
          <input
            className="form-input"
            type="number"
            value={rate}
            onChange={e => setRate(e.target.value)}
            inputMode="numeric"
          />
        </div>
        <div className="form-group">
          <label className="form-label">{t.settings.job}</label>
          <input className="form-input" type="number" value={allowances.job}
            onChange={e => setAllowances(a => ({ ...a, job: parseInt(e.target.value)||0 }))} inputMode="numeric" />
        </div>
        <div className="form-group">
          <label className="form-label">{t.settings.seniority}</label>
          <input className="form-input" type="number" value={allowances.seniority}
            onChange={e => setAllowances(a => ({ ...a, seniority: parseInt(e.target.value)||0 }))} inputMode="numeric" />
        </div>
        <div className="form-group">
          <label className="form-label">{t.settings.skill}</label>
          <input className="form-input" type="number" value={allowances.bonus}
            onChange={e => setAllowances(a => ({ ...a, bonus: parseInt(e.target.value)||0 }))} inputMode="numeric" />
        </div>
        <button className="btn-primary" onClick={handleSave}>{t.newYear.continue}</button>
      </div>
    </div>
  )
}
