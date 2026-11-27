// Number safety check. Prices and quantities must never change in translation.

const SCRIPT_DIGITS = [
  [0x0d66, 0x0d6f], // Malayalam
  [0x0966, 0x096f], // Devanagari
  [0x0be6, 0x0bef], // Tamil
]

export function normalizeDigits(s = '') {
  return [...s]
    .map((ch) => {
      const c = ch.codePointAt(0)
      for (const [lo, hi] of SCRIPT_DIGITS) if (c >= lo && c <= hi) return String(c - lo)
      return ch
    })
    .join('')
}

const SMALL = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
}
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }

// Common Malayalam number words (stems, after dropping a trailing ു / ്).
const ML_WORDS = {
  'ഒന്ന': 1, 'രണ്ട': 2, 'മൂന്ന': 3, 'നാല': 4, 'അഞ്ച': 5, 'ആറ': 6, 'ഏഴ': 7, 'എട്ട': 8, 'ഒമ്പത': 9,
  'പത്ത': 10, 'ഇരുപത': 20, 'മുപ്പത': 30, 'നാല്പത': 40, 'അമ്പത': 50, 'അറുപത': 60, 'എഴുപത': 70,
  'എൺപത': 80, 'തൊണ്ണൂറ': 90, 'നൂറ': 100, 'ഇരുനൂറ': 200, 'മുന്നൂറ': 300, 'നാനൂറ': 400,
  'അഞ്ഞൂറ': 500, 'ആയിരം': 1000,
}
const ML_HUNDRED_PREFIX = { 'നൂറ്റി': 100, 'ഇരുനൂറ്റി': 200, 'മുന്നൂറ്റി': 300, 'നാനൂറ്റി': 400, 'അഞ്ഞൂറ്റി': 500 }

function englishWordNumbers(text) {
  const tokens = text.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean)
  const found = []
  let total = 0, current = 0, active = false
  const flush = () => { if (active) found.push(total + current); total = 0; current = 0; active = false }
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i]
    if (w in SMALL) { current += SMALL[w]; active = true }
    else if (w in TENS) { current += TENS[w]; active = true }
    else if (w === 'hundred' && active) { current = (current || 1) * 100 }
    else if (w === 'thousand' && active) { total += (current || 1) * 1000; current = 0 }
    else if (w === 'and' && active && tokens[i + 1] && (tokens[i + 1] in SMALL || tokens[i + 1] in TENS)) { /* keep run */ }
    else flush()
  }
  flush()
  return found
}

function malayalamWordNumbers(text) {
  const tokens = text.normalize('NFC').replace(/[‌‍]/g, '').split(/[\s,.?!।]+/).filter(Boolean)
  const found = []
  let pending = 0
  for (const tok of tokens) {
    if (tok in ML_HUNDRED_PREFIX) { pending = ML_HUNDRED_PREFIX[tok]; continue }
    const stem = tok.replace(/[ു്]+$/u, '')
    const val = ML_WORDS[stem]
    if (val !== undefined) {
      if (pending) { found.push(pending + val); pending = 0 } else found.push(val)
    } else if (pending) { found.push(pending); pending = 0 }
  }
  if (pending) found.push(pending)
  return found
}

export function extractNumbers(text = '') {
  const t = normalizeDigits(text)
  const digits = (t.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || []).map((d) => Number(d.replace(/,/g, '')))
  return [...digits, ...englishWordNumbers(t), ...malayalamWordNumbers(t)].sort((a, b) => a - b)
}

// status: none | match | mismatch | unverified
// Rule: every number in the source must appear in the translation, and the translation
// must not contain an invented number of 10 or more. Small stray numbers ("one") are ignored.
export function checkNumbers(source, translated, targetLang = 'en') {
  const src = extractNumbers(source)
  const tgt = extractNumbers(translated)
  if (!src.length && !tgt.some((n) => n >= 10)) return { status: 'none', source: src, target: tgt }
  const missing = src.filter((n) => !tgt.includes(n))
  const extra = tgt.filter((n) => n >= 10 && !src.includes(n))
  if (!missing.length && !extra.length) return { status: 'match', source: src, target: tgt }
  if (!tgt.length && targetLang !== 'en') return { status: 'unverified', source: src, target: tgt }
  return { status: 'mismatch', source: src, target: tgt, missing, extra }
}
