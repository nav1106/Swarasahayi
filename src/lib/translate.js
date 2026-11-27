import { findPhrase, normalizeManglish, applyGlossary } from './phrases.js'

export class TranslateError extends Error {
  constructor(code, message) {
    super(message || code)
    this.code = code // network | quota | empty | config
  }
}

const API_URL = import.meta.env?.VITE_TRANSLATE_API_URL || ''
const API_KEY = import.meta.env?.VITE_TRANSLATE_API_KEY || ''

// Adapter 1: any LibreTranslate-compatible server (self-hosted IndicTrans2 can sit behind one).
async function libreTranslate(text, from, to, fetchImpl) {
  const res = await fetchImpl(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: from, target: to, format: 'text', ...(API_KEY ? { api_key: API_KEY } : {}) }),
  })
  if (res.status === 429) throw new TranslateError('quota')
  if (!res.ok) throw new TranslateError('network', `HTTP ${res.status}`)
  const data = await res.json()
  if (!data.translatedText) throw new TranslateError('empty')
  return data.translatedText
}

// Adapter 2 (default, needs no key): MyMemory's free public endpoint. Rate limited.
async function myMemory(text, from, to, fetchImpl) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=${from}|${to}`
  const res = await fetchImpl(url)
  if (!res.ok) throw new TranslateError('network', `HTTP ${res.status}`)
  const data = await res.json()
  const out = data?.responseData?.translatedText
  if (data?.responseStatus === 429 || /MYMEMORY WARNING/i.test(out || '')) throw new TranslateError('quota')
  if (!out) throw new TranslateError('empty')
  return out
}

// Order: reviewed phrase bank (offline, exact) -> trade glossary + Manglish clean-up -> remote model.
export async function translate(text, from, to, { trade, fetchImpl } = {}) {
  const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null)
  if (from === to) return { text, via: 'same', verified: false }

  const phrase = findPhrase(text, from, to, trade)
  if (phrase) return { text: phrase.target, via: 'phrasebank', verified: true }

  if (!f) throw new TranslateError('network', 'fetch unavailable')
  let prepared = from === 'ml' ? normalizeManglish(text) : text
  const pivoting = (from === 'ml' && to !== 'en') || (to === 'ml' && from !== 'en')
  prepared = applyGlossary(prepared, from, pivoting ? 'en' : to, trade)
  const call = (t, a, b) => (API_URL ? libreTranslate(t, a, b, f) : myMemory(t, a, b, f))
  try {
    // Direct Malayalam <-> Hindi/Tamil pairs are thin in free translation memories, so go through English,
    // which is much better covered. Both hops use the same service.
    if (pivoting) {
      const mid = await call(prepared, from, 'en')
      // Drop the "(mathi)" style notes added for the English hop before the trade terms are swapped again.
      const out = await call(applyGlossary(mid.replace(/\s*\([A-Za-z ]+\)/g, ''), 'en', to, trade), 'en', to)
      return { text: out, via: 'model', verified: false, pivot: mid }
    }
    const out = await call(prepared, from, to)
    return { text: out, via: 'model', verified: false }
  } catch (e) {
    if (e instanceof TranslateError) throw e
    throw new TranslateError('network', e.message)
  }
}
