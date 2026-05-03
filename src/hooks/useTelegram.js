import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'

const SUPPORTED = [
  'ru','en','ko','uz','kk','uk','ar','fa','tr',
  'de','fr','es','it','pt','pl','nl','sv','no',
  'fi','da','cs','sk','ro','hu','bg','sr','hr',
  'zh','ja','vi','th','id','ms','tl','my','km',
  'lo','si','mn','ne','bn','hi','ta','te','ml',
  'ka','hy','az','tk','tg','ky',
]

function getTelegramLang() {
  try {
    const lang = WebApp?.initDataUnsafe?.user?.language_code
    console.log('Telegram language:', lang)
    if (!lang) return 'ru'
    if (SUPPORTED.includes(lang)) return lang
    const prefix = lang.split('-')[0]
    if (SUPPORTED.includes(prefix)) return prefix
    return 'ru'
  } catch {
    return 'ru'
  }
}

export function useTelegram() {
  useEffect(() => {
    try { WebApp.ready?.() } catch {}
    try { WebApp.expand?.() } catch {}
    try { WebApp.requestFullscreen?.() } catch {}
    try { WebApp.enableClosingConfirmation?.() } catch {}
  }, [])

  const isDark = WebApp.colorScheme === 'dark'
  const langCode = getTelegramLang()

  const haptic = {
    light: () => { try { WebApp.HapticFeedback?.impactOccurred('light') } catch {} },
    medium: () => { try { WebApp.HapticFeedback?.impactOccurred('medium') } catch {} },
    success: () => { try { WebApp.HapticFeedback?.notificationOccurred('success') } catch {} },
    selection: () => { try { WebApp.HapticFeedback?.selectionChanged() } catch {} },
  }

  return { isDark, langCode, haptic, WebApp }
}
