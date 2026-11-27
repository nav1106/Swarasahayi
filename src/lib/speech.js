export const LANG_CODES = { ml: 'ml-IN', en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' }

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const speechSupported = () => Boolean(Recognition)
export const speakSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export class SpeechError extends Error {
  constructor(code) {
    super(code)
    this.code = code // unsupported | mic-denied | network | lang | aborted
  }
}

// Listen once. Resolves with up to 3 alternatives; an empty list means nothing was heard.
// Recording stops after `silenceMs` without new speech.
export function listen(lang, { onInterim, silenceMs = 1500, maxMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new SpeechError('unsupported'))
    const rec = new Recognition()
    rec.lang = LANG_CODES[lang] || lang
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 3
    let last = Date.now()
    let result = []
    let settled = false
    const done = (fn, v) => { if (settled) return; settled = true; clearInterval(timer); clearTimeout(cap); fn(v) }
    const timer = setInterval(() => { if (Date.now() - last > silenceMs && result.length) rec.stop() }, 250)
    const cap = setTimeout(() => rec.stop(), maxMs)
    rec.onresult = (e) => {
      last = Date.now()
      const r = e.results[e.results.length - 1]
      const alts = Array.from(r).map((a) => ({ transcript: a.transcript.trim(), confidence: a.confidence }))
      result = alts
      if (!r.isFinal) onInterim?.(alts[0]?.transcript || '')
    }
    rec.onerror = (e) => {
      if (e.error === 'no-speech') return done(resolve, { alternatives: [] })
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') return done(reject, new SpeechError('mic-denied'))
      if (e.error === 'network') return done(reject, new SpeechError('network'))
      if (e.error === 'language-not-supported') return done(reject, new SpeechError('lang'))
      if (e.error === 'aborted') return done(reject, new SpeechError('aborted'))
      done(resolve, { alternatives: [] })
    }
    rec.onend = () => done(resolve, { alternatives: result.filter((a) => a.transcript) })
    try { rec.start() } catch { done(reject, new SpeechError('aborted')) }
  })
}

function loadVoices() {
  return new Promise((resolve) => {
    const have = window.speechSynthesis.getVoices()
    if (have.length) return resolve(have)
    const t = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000)
    window.speechSynthesis.onvoiceschanged = () => { clearTimeout(t); resolve(window.speechSynthesis.getVoices()) }
  })
}

// Speak text. Resolves { spoken: false, reason: 'no-voice' } if the device has no voice for the language.
export async function speak(text, lang, { rate = 0.95 } = {}) {
  if (!speakSupported()) return { spoken: false, reason: 'unsupported' }
  const code = LANG_CODES[lang] || lang
  const voices = await loadVoices()
  const voice = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === code.toLowerCase())
    || voices.find((v) => v.lang.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()))
  if (!voice) return { spoken: false, reason: 'no-voice' }
  window.speechSynthesis.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = rate
    u.onend = () => resolve({ spoken: true })
    u.onerror = () => resolve({ spoken: false, reason: 'error' })
    window.speechSynthesis.speak(u)
  })
}

export const stopSpeaking = () => { if (speakSupported()) window.speechSynthesis.cancel() }
