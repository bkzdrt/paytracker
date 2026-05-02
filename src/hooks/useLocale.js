import { useMemo } from 'react'
import ru from '../locales/ru'
import en from '../locales/en'

export function useLocale(langCode) {
  return useMemo(() => {
    const lang = langCode?.startsWith('ru') ? 'ru' : 'en'
    return { t: lang === 'ru' ? ru : en, lang }
  }, [langCode])
}
