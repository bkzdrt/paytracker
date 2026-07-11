import { LEGACY_TYPE_MAP } from '../domain/types'
import extras from './extras'
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

const baseLocales = { en, ru, ko, uz, zh, vi, th, id, tl, my, km, lo, ne }

// Shown in the language picker — each language in its own script
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'ko', name: '한국어' },
  { code: 'uz', name: "O'zbekcha" },
  { code: 'zh', name: '中文' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'tl', name: 'Filipino' },
  { code: 'my', name: 'မြန်မာ' },
  { code: 'km', name: 'ខ្មែរ' },
  { code: 'lo', name: 'ລາວ' },
  { code: 'ne', name: 'नेपाली' },
]

// BCP 47 tags for Intl date/number formatting
const INTL_TAGS = {
  en: 'en-US', ru: 'ru-RU', ko: 'ko-KR', uz: 'uz-UZ', zh: 'zh-CN', vi: 'vi-VN',
  th: 'th-TH', id: 'id-ID', tl: 'fil-PH', my: 'my-MM', km: 'km-KH', lo: 'lo-LA', ne: 'ne-NP',
}

const SUPPORTED = Object.keys(baseLocales)

export function detectLanguage() {
  const candidates = [...(navigator.languages || []), navigator.language]
  for (const tag of candidates) {
    if (!tag) continue
    const short = tag.toLowerCase().split('-')[0]
    if (SUPPORTED.includes(short)) return short
  }
  return 'en'
}

function deepMerge(base, override) {
  if (!override) return base
  const out = { ...base }
  for (const [key, val] of Object.entries(override)) {
    out[key] = val && typeof val === 'object' && !Array.isArray(val) && typeof base[key] === 'object'
      ? deepMerge(base[key], val)
      : val
  }
  return out
}

// Base locale files key dayTypes by legacy labels — rekey to semantic ids
function rekeyDayTypes(t) {
  const dayTypes = {}
  for (const [legacy, semantic] of Object.entries(LEGACY_TYPE_MAP)) {
    dayTypes[semantic] = t.dayTypes?.[legacy] ?? en.dayTypes[legacy]
  }
  return { ...t, dayTypes }
}

const cache = {}

export function getLocale(lang) {
  const code = SUPPORTED.includes(lang) ? lang : 'en'
  if (!cache[code]) {
    const merged = deepMerge(deepMerge(en, baseLocales[code]), extras[code] || extras.en)
    cache[code] = { t: rekeyDayTypes(merged), lang: code, intl: INTL_TAGS[code] || 'en-US' }
  }
  return cache[code]
}
