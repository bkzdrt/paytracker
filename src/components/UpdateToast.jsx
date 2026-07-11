import { useRegisterSW } from 'virtual:pwa-register/react'
import { useApp } from '../app/store'

export default function UpdateToast() {
  const { t } = useApp()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

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
