import blocklist from '../data/blocklist.json'

// Safety filter. Runs on what people say and on what the translator returns, before anything is spoken.
// It is a keyword filter: it catches common abuse, threats and sexual requests, not everything.
// Words are matched whole (so "assistant" and place names are safe); Indic words by their start, because
// Malayalam, Hindi and Tamil add endings to words.

const ZERO_WIDTH = /[​‌‍﻿]/g
const SPLIT = /[\s.,?;:।"'“”‘’()\[\]{}\-_/\\|*+=<>~`^#%&]+/
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' }
const isIndic = (s) => /[ऀ-෿]/.test(s)

function latinise(token) {
  return token.replace(/[01345@7$!]/g, (c) => LEET[c] || c)
}

function norm(text) {
  return String(text || '').normalize('NFC').replace(ZERO_WIDTH, '').toLowerCase()
}

// "f u c k" -> also test "fuck" by joining runs of single letters.
function tokensOf(text) {
  const raw = norm(text).split(SPLIT).filter(Boolean)
  const out = raw.slice()
  let run = []
  const flush = () => { if (run.length >= 3) out.push(run.join('')); run = [] }
  for (const t of raw) { if (t.length === 1 && !isIndic(t)) run.push(t); else flush() }
  flush()
  return out
}

// "fuck" -> /^f+u+c+k+(s|ed|ing|er|ers)?$/ so "fuuuck" and "fucks" match, but "as" never matches "ass".
const latinRegex = (w) => new RegExp(`^${[...w].map((c) => `${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}+`).join('')}(s|es|ed|ing|er|ers|in)?$`)

const LATIN_WORDS = [
  ...blocklist.abuse.en, ...blocklist.abuse.ml_latin, ...blocklist.abuse.hi_latin, ...blocklist.abuse.ta_latin,
].map((w) => ({ re: latinRegex(w), category: 'abuse' }))
  .concat(blocklist.sexual.words.map((w) => ({ re: latinRegex(w), category: 'sexual' })))
const INDIC_WORDS = [...blocklist.abuse.ml, ...blocklist.abuse.hi, ...blocklist.abuse.ta].map((w) => w.normalize('NFC'))
const PHRASES = [
  ...blocklist.threat.phrases.map((p) => ({ p, category: 'threat' })),
  ...blocklist.sexual.phrases.map((p) => ({ p, category: 'sexual' })),
]

// Returns { ok: true } or { ok: false, category, flagged: [tokens] }.
export function moderate(text) {
  const tokens = tokensOf(text)
  const flagged = []
  let category = null
  for (const t of tokens) {
    const lt = isIndic(t) ? t : latinise(t.replace(/^[!@$]+|!+$/g, ''))
    if (isIndic(lt)) {
      if (INDIC_WORDS.some((w) => lt.startsWith(w))) { flagged.push(t); category ||= 'abuse' }
    } else {
      const hit = LATIN_WORDS.find((w) => w.re.test(lt))
      if (hit) { flagged.push(t); category ||= hit.category }
    }
  }
  const joined = ` ${latinise(norm(text)).replace(SPLIT, ' ').replace(/!/g, ' ').replace(/\s+/g, ' ').trim()} `
  for (const { p, category: c } of PHRASES) {
    if (joined.includes(` ${p} `)) { category ||= c; flagged.push(p) }
  }
  return flagged.length ? { ok: false, category, flagged } : { ok: true }
}

// Show what was said without showing the words: "f***".
export function maskFlagged(text, flagged) {
  let out = String(text)
  for (const f of flagged) {
    const re = new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    out = out.replace(re, (m) => m[0] + '*'.repeat(Math.max(2, m.length - 1)))
  }
  return out
}
