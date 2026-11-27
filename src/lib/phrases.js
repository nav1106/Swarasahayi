import phrasebank from '../data/phrasebank.json'
import glossaryData from '../data/glossary.json'
import manglish from '../data/manglish.json'
import { normalizeText, similarity } from './text.js'
import { extractNumbers } from './numbers.js'

export const TRADES = ['fish', 'auto', 'salon', 'office']
export const LANGS = ['en', 'hi', 'ta']
export const MATCH_THRESHOLD = 0.85

export function phrasesForTrade(trade) {
  return phrasebank.filter((p) => p.trade === trade)
}

export function lessonPhrases(trade, level) {
  return phrasebank.filter((p) => p.trade === trade && p.level === level)
}

// The phrase bank doubles as an offline translator and a retrieval step: if what was said
// is (almost) a known phrase, return its reviewed translation instead of calling a model.
// Numbers must match exactly, so "300" can never be answered with the "400" phrase.
export function findPhrase(text, from, to, trade, bank = phrasebank) {
  const q = normalizeText(text)
  if (!q) return null
  const qNums = extractNumbers(text).join(',')
  let best = null
  for (const entry of bank) {
    if (entry.trade !== trade && entry.trade !== 'common') continue
    if (!entry[from] || !entry[to]) continue
    if (extractNumbers(entry[from]).join(',') !== qNums) continue
    const score = similarity(q, entry[from])
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) best = { entry, score, target: entry[to] }
  }
  return best
}

const ML_LETTER = '\\u0D00-\\u0D7F'
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Replace Malayalam-script English words ("ഫ്രഷ്") with English so the translator sees them.
export function normalizeManglish(text, dict = manglish) {
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length)
  let out = text
  for (const k of keys) {
    const re = new RegExp(`(?<![${ML_LETTER}])${escapeRe(k)}(?![${ML_LETTER}])`, 'g')
    out = out.replace(re, dict[k])
  }
  return out
}

const primary = (s) => s.split(' (')[0]

// Swap known trade terms for the right word in the target language, before translation.
export function applyGlossary(text, from, to, trade, glossary = glossaryData) {
  if (from !== 'ml' && from !== 'en') return text
  let out = text
  const entries = glossary
    .filter((g) => g.trade === trade && g[from] && g[to])
    .sort((a, b) => primary(b[from]).length - primary(a[from]).length)
  for (const g of entries) {
    const src = escapeRe(primary(g[from]))
    const re = from === 'ml'
      ? new RegExp(`(?<![${ML_LETTER}])${src}(?![${ML_LETTER}])`, 'g')
      : new RegExp(`\\b${src}\\b`, 'gi')
    out = out.replace(re, g[to])
  }
  return out
}
