import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'

const tg = WebApp || {}

export function useTelegram() {
  useEffect(() => {
    try { tg.ready?.() } catch {}
    try { tg.expand?.() } catch {}
    try { tg.requestFullscreen?.() } catch {}
  }, [])

  const isDark = tg.colorScheme === 'dark'
  const langCode = tg.initDataUnsafe?.user?.language_code ?? 'ru'

  const haptic = {
    light: () => { try { tg.HapticFeedback?.impactOccurred('light') } catch {} },
    medium: () => { try { tg.HapticFeedback?.impactOccurred('medium') } catch {} },
    success: () => { try { tg.HapticFeedback?.notificationOccurred('success') } catch {} },
    selection: () => { try { tg.HapticFeedback?.selectionChanged() } catch {} },
  }

  return { isDark, langCode, haptic, WebApp: tg }
}
