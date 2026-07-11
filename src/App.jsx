import { useState } from 'react'
import { useApp } from './app/store'
import Dashboard from './pages/Dashboard'
import CalendarPage from './pages/CalendarPage'
import Guide from './pages/Guide'
import Settings from './pages/Settings'
import BottomNav from './components/BottomNav'
import Onboarding from './components/Onboarding'
import NewYearPrompt from './components/NewYearPrompt'

export default function App() {
  const { settings } = useApp()
  const [tab, setTab] = useState('home')
  const [goToMonth, setGoToMonth] = useState(null)

  const currentYear = new Date().getFullYear()

  if (!settings) {
    return <Onboarding />
  }

  if (String(settings.newYearPromptShown) !== String(currentYear)) {
    return <NewYearPrompt year={currentYear} />
  }

  return (
    <div className="app">
      <main className="main">
        {tab === 'home' && (
          <Dashboard onGoToMonth={(m) => { setGoToMonth(m); setTab('month') }} />
        )}
        {tab === 'month' && <CalendarPage key={goToMonth || 'cal'} initialMonth={goToMonth} />}
        {tab === 'guide' && <Guide />}
        {tab === 'settings' && <Settings />}
      </main>
      <BottomNav tab={tab} onChange={(next) => { setGoToMonth(null); setTab(next) }} />
    </div>
  )
}
