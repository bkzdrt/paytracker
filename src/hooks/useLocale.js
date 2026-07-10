import { useMemo } from 'react'
import ru from '../locales/ru'
import en from '../locales/en'
import ko from '../locales/ko'
import uz from '../locales/uz'
import zh from '../locales/zh'
import vi from '../locales/vi'
import th from '../locales/th'
import id from '../locales/id'
import tl from '../locales/tl'
import my from '../locales/my'
import km from '../locales/km'
import lo from '../locales/lo'
import ne from '../locales/ne'

const locales = {
  ru, en, ko, uz,
  zh, vi, th, id, tl, my, km, lo, ne,
}

const supported = Object.keys(locales)

function resolveLocale(langCode) {
  if (!langCode) return 'en'
  const full = langCode.toLowerCase()
  const short = full.split('-')[0]
  if (supported.includes(full)) return full
  if (supported.includes(short)) return short
  return 'en'
}

export function useLocale(langCode) {
  return useMemo(() => {
    const lang = resolveLocale(langCode)
    const t = locales[lang] || en
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'ltr')
    }
    return { t, lang }
  }, [langCode])
}
