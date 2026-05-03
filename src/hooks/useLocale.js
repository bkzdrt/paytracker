import { useMemo } from 'react'
import ru from '../locales/ru'
import en from '../locales/en'
import ko from '../locales/ko'
import uz from '../locales/uz'
import kk from '../locales/kk'
import uk from '../locales/uk'
import ar from '../locales/ar'
import fa from '../locales/fa'
import tr from '../locales/tr'
import de from '../locales/de'
import fr from '../locales/fr'
import es from '../locales/es'
import it from '../locales/it'
import pt from '../locales/pt'
import pl from '../locales/pl'
import nl from '../locales/nl'
import sv from '../locales/sv'
import no from '../locales/no'
import fi from '../locales/fi'
import da from '../locales/da'
import cs from '../locales/cs'
import sk from '../locales/sk'
import ro from '../locales/ro'
import hu from '../locales/hu'
import bg from '../locales/bg'
import sr from '../locales/sr'
import hr from '../locales/hr'
import zh from '../locales/zh'
import ja from '../locales/ja'
import vi from '../locales/vi'
import th from '../locales/th'
import id from '../locales/id'
import ms from '../locales/ms'
import tl from '../locales/tl'
import my from '../locales/my'
import km from '../locales/km'
import lo from '../locales/lo'
import si from '../locales/si'
import mn from '../locales/mn'
import ne from '../locales/ne'
import bn from '../locales/bn'
import hi from '../locales/hi'
import ta from '../locales/ta'
import te from '../locales/te'
import ml from '../locales/ml'
import ka from '../locales/ka'
import hy from '../locales/hy'
import az from '../locales/az'
import tk from '../locales/tk'
import tg from '../locales/tg'
import ky from '../locales/ky'

const locales = {
  ru, en, ko, uz, kk, uk, ar, fa, tr,
  de, fr, es, it, pt, pl, nl,
  sv, no, fi, da,
  cs, sk, ro, hu, bg, sr, hr,
  zh, ja, vi, th, id, ms, tl, my, km, lo,
  si, mn, ne, bn, hi, ta, te, ml,
  ka, hy, az, tk, tg, ky,
}

const RTL_LANGS = ['ar', 'fa']

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
      document.documentElement.setAttribute('dir', RTL_LANGS.includes(lang) ? 'rtl' : 'ltr')
    }
    return { t, lang }
  }, [langCode])
}
