import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'

export function useTelegram() {
  useEffect(() => {
    try { WebApp.ready?.() } catch {}
    try { WebApp.expand?.() } catch {}
    try { WebApp.requestFullscreen?.() } catch {}
    try { WebApp.enableClosingConfirmation?.() } catch {}
  }, [])

  const isDark = WebApp.colorScheme === 'dark'
  const rawLang = WebApp.initDataUnsafe?.user?.language_code
  const langCode = rawLang ?? 'en'

  console.log('[PayTracker] Telegram lang:', rawLang, '→ resolved:', langCode)

  const haptic = {
    light: () => { try { WebApp.HapticFeedback?.impactOccurred('light') } catch {} },
    medium: () => { try { WebApp.HapticFeedback?.impactOccurred('medium') } catch {} },
    success: () => { try { WebApp.HapticFeedback?.notificationOccurred('success') } catch {} },
    selection: () => { try { WebApp.HapticFeedback?.selectionChanged() } catch {} },
  }

  return { isDark, langCode, haptic, WebApp }
}
