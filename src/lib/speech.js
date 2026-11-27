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
export function listen(lang, { onInterim, onRecognizer, silenceMs = 3500, maxMs = 45000, firstWordMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new SpeechError('unsupported'))
    const rec = new Recognition()
    rec.lang = LANG_CODES[lang] || lang
    rec.interimResults = true
    // Keep listening through pauses; we stop it ourselves after `silenceMs` of quiet (or the Stop button).
    rec.continuous = true
    rec.maxAlternatives = 3
    onRecognizer?.(rec)
    let last = Date.now()
    let result = []
    let settled = false
    const done = (fn, v) => { if (settled) return; settled = true; clearInterval(timer); clearTimeout(cap); fn(v) }
    const started = Date.now()
    const timer = setInterval(() => {
      const quiet = Date.now() - last
      if (result.length ? quiet > silenceMs : Date.now() - started > firstWordMs) rec.stop()
    }, 250)
    const cap = setTimeout(() => rec.stop(), maxMs)
    rec.onresult = (e) => {
      last = Date.now()
      // Rebuild the whole sentence from every segment so far (safe against repeated events on Android).
      const segs = Array.from(e.results)
      const lastSeg = segs[segs.length - 1]
      const head = segs.slice(0, -1).map((r) => r[0].transcript.trim()).filter(Boolean).join(' ')
      const finals = segs.filter((r) => r.isFinal && r[0].confidence > 0)
      const conf = finals.length ? finals.reduce((n, r) => n + r[0].confidence, 0) / finals.length : lastSeg[0].confidence
      result = Array.from(lastSeg).map((a, i) => ({ transcript: [head, a.transcript.trim()].filter(Boolean).join(' '), confidence: i === 0 ? conf : a.confidence }))
      if (!lastSeg.isFinal || segs.length > 1) onInterim?.(result[0]?.transcript || '')
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
  window.speechSynthesis.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    // Android Chrome often hides installed voices from getVoices(); asking by language code alone still works there.
    if (voice) u.voice = voice
    u.lang = voice ? voice.lang : code
    u.rate = rate
    let started = false
    let timer = null
    if (!voice) {
      timer = setTimeout(() => { if (!started) { window.speechSynthesis.cancel(); resolve({ spoken: false, reason: 'no-voice' }) } }, 2500)
    }
    u.onstart = () => { started = true; if (timer) clearTimeout(timer) }
    u.onend = () => { if (timer) clearTimeout(timer); resolve(started || voice ? { spoken: true } : { spoken: false, reason: 'no-voice' }) }
    u.onerror = () => { if (timer) clearTimeout(timer); resolve({ spoken: false, reason: voice ? 'error' : 'no-voice' }) }
    window.speechSynthesis.speak(u)
  })
}

export const stopSpeaking = () => { if (speakSupported()) window.speechSynthesis.cancel() }
