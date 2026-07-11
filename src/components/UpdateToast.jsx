import { useRegisterSW } from 'virtual:pwa-register/react'
import { useApp } from '../app/store'

const CHECK_INTERVAL = 60 * 60 * 1000 // 1 hour

export default function UpdateToast() {
  const { t } = useApp()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // The SW serves everything from cache, so an installed PWA that is only
    // resumed from the background would never notice a new deploy on its own.
    // Ask the browser to re-check sw.js on every resume and hourly while open.
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, CHECK_INTERVAL)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="update-toast" role="status">
      <span>{t.updateReady}</span>
      <button type="button" className="update-toast__btn" onClick={() => updateServiceWorker(true)}>
        {t.updateReload}
      </button>
      <button type="button" className="update-toast__dismiss" aria-label="✕" onClick={() => setNeedRefresh(false)}>
        ✕
      </button>
    </div>
  )
}
