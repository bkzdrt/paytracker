import { useEffect, useState } from 'react'
import WebApp from '@twa-dev/sdk'

function detectIsDark() {
  try {
    // Inside Telegram: trust the Mini App color scheme
    if (WebApp?.initData) return WebApp.colorScheme === 'dark'
  } catch {}
  // Outside Telegram (PWA/browser): fall back to system preference
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  } catch {}
  return true
}

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
    // Way 1 — standard
    const lang1 = WebApp?.initDataUnsafe?.user?.language_code
    if (lang1) {
      const prefix1 = lang1.split('-')[0]
      if (SUPPORTED.includes(lang1)) return lang1
      if (SUPPORTED.includes(prefix1)) return prefix1
    }

    // Way 2 — parse initData string manually
    const initData = WebApp?.initData
    if (initData) {
      const params = new URLSearchParams(initData)
      const user = JSON.parse(decodeURIComponent(params.get('user') || '{}'))
      if (user.language_code) {
        const l = user.language_code.split('-')[0]
        if (SUPPORTED.includes(l)) return l
      }
    }

    // Way 3 — browser language
    const browserLang = navigator.language || navigator.userLanguage
    if (browserLang) {
      const prefix = browserLang.split('-')[0]
      if (SUPPORTED.includes(prefix)) return prefix
    }

    return 'ru'
  } catch {
    return 'ru'
  }
}

export function useTelegram() {
  const [isDark, setIsDark] = useState(detectIsDark)

  useEffect(() => {
    try { WebApp.ready?.() } catch {}
    try { WebApp.expand?.() } catch {}
    try { WebApp.requestFullscreen?.() } catch {}
    try { WebApp.enableClosingConfirmation?.() } catch {}

    // React to theme changes while the app is open (Telegram in-app switch,
    // or the OS-level scheme when running as a standalone PWA)
    const onTelegramTheme = () => setIsDark(detectIsDark())
    try { WebApp.onEvent?.('themeChanged', onTelegramTheme) } catch {}

    let mql
    try {
      mql = window.matchMedia?.('(prefers-color-scheme: dark)')
      mql?.addEventListener?.('change', onTelegramTheme)
    } catch {}

    return () => {
      try { WebApp.offEvent?.('themeChanged', onTelegramTheme) } catch {}
      try { mql?.removeEventListener?.('change', onTelegramTheme) } catch {}
    }
  }, [])

  const langCode = getTelegramLang()

  const haptic = {
    light: () => { try { WebApp.HapticFeedback?.impactOccurred('light') } catch {} },
    medium: () => { try { WebApp.HapticFeedback?.impactOccurred('medium') } catch {} },
    success: () => { try { WebApp.HapticFeedback?.notificationOccurred('success') } catch {} },
    selection: () => { try { WebApp.HapticFeedback?.selectionChanged() } catch {} },
  }

  return { isDark, langCode, haptic, WebApp }
}
