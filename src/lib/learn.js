import { similarity, normalizeText } from './text.js'
import { lessonPhrases } from './phrases.js'

export const PASS_SCORE = 0.85
export const MAX_TRIES = 3
export const LEVELS = [1, 2, 3]

// Best score across the recogniser's alternatives.
const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 }
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }

// Lower-case words with apostrophes dropped and spelled-out numbers ("four hundred fifty") turned into digits,
// because the recogniser may write either form.
export function words(text) {
  const raw = normalizeText(String(text).replace(/['’]/g, '')).split(' ').filter(Boolean)
  const out = []
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i]
    if (!(w in UNITS || w in TENS)) { out.push(w); continue }
    let total = 0
    let current = 0
    let j = i
    for (; j < raw.length; j++) {
      const t = raw[j]
      if (t in UNITS) current += UNITS[t]
      else if (t in TENS) current += TENS[t]
      else if (t === 'hundred') current = (current || 1) * 100
      else if (t === 'and' && raw[j + 1] && (raw[j + 1] in UNITS || raw[j + 1] in TENS)) continue
      else break
    }
    total += current
    out.push(String(total))
    i = j - 1
  }
  return out
}

// Word-by-word scoring. Each target word must be heard (a near-identical spelling is accepted for words of 5+
// letters, to forgive plurals and accents). The score is the lower of recall (target words heard) and precision
// (heard words that belong), so a wrong or extra word costs points. Only long sentences (7+ words) can miss one.
export function wordScore(heard, target) {
  const want = words(target)
  const got = words(heard)
  if (!want.length || !got.length) return 0
  const pool = [...got]
  let hit = 0
  for (const w of want) {
    const k = pool.findIndex((g) => g === w || (w.length >= 5 && g.length >= 5 && similarity(g, w) >= 0.8))
    if (k >= 0) { hit++; pool.splice(k, 1) }
  }
  return Math.min(hit / want.length, hit / got.length)
}

export function scoreAttempt(target, alternatives) {
  return alternatives.reduce((best, a) => Math.max(best, wordScore(a.transcript, target)), 0)
}

// progress: { [phraseId]: { passed: boolean, retry?: boolean } }
export function levelStats(trade, level, progress) {
  const phrases = lessonPhrases(trade, level)
  const passed = phrases.filter((p) => progress[p.id]?.passed).length
  return { total: phrases.length, passed }
}

// A level unlocks once 80% (rounded down) of the previous level is passed.
export function isLevelUnlocked(trade, level, progress) {
  if (level === 1) return true
  const prev = levelStats(trade, level - 1, progress)
  return prev.total > 0 && prev.passed >= Math.floor(prev.total * 0.8)
}
