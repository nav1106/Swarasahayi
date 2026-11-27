import React, { useEffect, useRef, useState } from 'react'
import { S, TRADE_NAMES, LANG_NAMES } from '../i18n.js'
import { translate, TranslateError } from '../lib/translate.js'
import { checkNumbers, extractNumbers } from '../lib/numbers.js'
import { decideAction } from '../lib/confidence.js'
import { listen, speak, stopSpeaking, speechSupported } from '../lib/speech.js'
import { startMeter } from '../lib/audioLevel.js'
import { phrasesForTrade } from '../lib/phrases.js'
import { DEMOS } from '../lib/demos.js'
import { appendFeedback } from '../lib/storage.js'
import { Bi, BigButton, Banner, Header } from '../ui.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const REPEAT_PROMPT = {
  en: 'Please repeat slowly.',
  hi: 'कृपया धीरे दोबारा बोलिए।',
  ta: 'தயவுசெய்து மெதுவாக மீண்டும் சொல்லுங்கள்.',
}

// Stop the level meter without ever hanging on a pending microphone prompt.
async function stopMeter(promise) {
  const m = await Promise.race([promise, sleep(300).then(() => 'timeout')])
  if (m === 'timeout') { promise.then((x) => x?.stop()); return null }
  return m ? m.stop() : null
}

export default function Talk({ profile, options, onBack }) {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle') // idle | listening | working | speaking
  const [interim, setInterim] = useState('')
  const [level, setLevel] = useState(0)
  const [banner, setBanner] = useState(null)
  const [pending, setPending] = useState(null)
  const [showOffline, setShowOffline] = useState(Boolean(options.offline))
  const [showType, setShowType] = useState(!speechSupported())
  const [feedbackFor, setFeedbackFor] = useState(null)
  const [toast, setToast] = useState(null)
  const [demoRunning, setDemoRunning] = useState(false)
  const idRef = useRef(0)
  const lastRef = useRef(null)
  const stopDemo = useRef(false)
  const endRef = useRef(null)

  const langOf = (side) => (side === 'worker' ? 'ml' : profile.lang)
  const targetOf = (side) => (side === 'worker' ? profile.lang : 'ml')

  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth' }) }, [messages, pending])
  useEffect(() => {
    if (options.demo) runDemo()
    return () => { stopDemo.current = true; stopSpeaking() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const say = async (text, lang, rate) => {
    const r = await speak(text, lang, { rate })
    if (!r.spoken && r.reason === 'no-voice') setBanner({ kind: 'info', s: S.noVoice })
  }

  // Translate one utterance, check its numbers, then speak it unless the numbers are wrong.
  const proceed = async (side, text, fromLang = langOf(side)) => {
    const toLang = targetOf(side)
    lastRef.current = { side, text, fromLang }
    setStatus('working')
    setBanner(null)
    setPending(null)
    try {
      const res = await translate(text, fromLang, toLang, { trade: profile.trade })
      const nums = res.verified
        ? { status: extractNumbers(text).length ? 'match' : 'none', source: extractNumbers(text) }
        : checkNumbers(text, res.text, toLang)
      const blocked = nums.status === 'mismatch'
      setMessages((m) => [...m, { id: ++idRef.current, side, from: fromLang, to: toLang, src: text, tgt: res.text, via: res.via, nums, blocked }])
      if (blocked) {
        setBanner({ kind: 'error', s: S.numberUnclear })
        setStatus('idle')
        return
      }
      if (nums.status === 'unverified') setBanner({ kind: 'info', s: S.numberCheck })
      setStatus('speaking')
      await say(res.text, toLang)
    } catch (e) {
      const code = e instanceof TranslateError ? e.code : 'other'
      if (code === 'network' || code === 'quota') {
        setBanner({ kind: 'error', s: code === 'quota' ? S.quota : S.offlineNotice, retry: true })
        setShowOffline(true)
      } else {
        setBanner({ kind: 'error', s: S.voiceService, retry: true })
      }
    } finally {
      setStatus('idle')
    }
  }

  const handleResult = (side, alternatives) => {
    const top = alternatives[0]
    const action = decideAction(top?.transcript, top?.confidence)
    if (action.kind === 'ok') return proceed(side, top.transcript)
    if (action.kind === 'confirm') return setPending({ side, kind: 'confirm', alternatives, text: top.transcript })
    setPending({ side, kind: 'empty', alternatives })
    if (side === 'worker') say(S.sayAgain.ml, 'ml')
    else say(REPEAT_PROMPT[profile.lang], profile.lang)
  }

  const handleListen = async (side) => {
    if (status !== 'idle') return
    stopSpeaking()
    setBanner(null)
    setPending(null)
    setInterim('')
    setStatus('listening')
    const meter = startMeter(setLevel).catch(() => null)
    try {
      const { alternatives } = await listen(langOf(side), { onInterim: setInterim })
      const stats = await stopMeter(meter)
      setLevel(0)
      setInterim('')
      if (stats?.verdict === 'noisy') setBanner({ kind: 'info', s: S.noisy })
      if (stats?.verdict === 'quiet' && !alternatives.length) setBanner({ kind: 'info', s: S.quiet })
      setStatus('idle')
      handleResult(side, alternatives)
    } catch (e) {
      stopMeter(meter)
      setLevel(0)
      setInterim('')
      setStatus('idle')
      const map = { 'mic-denied': S.micDenied, unsupported: S.micUnsupported, network: S.voiceService, lang: S.langUnsupported }
      if (e.code === 'unsupported') setShowType(true)
      if (e.code !== 'aborted') setBanner({ kind: 'error', s: map[e.code] || S.voiceService, retry: e.code === 'network' })
    }
  }

  const retry = () => { if (lastRef.current) proceed(lastRef.current.side, lastRef.current.text, lastRef.current.fromLang) }

  async function runDemo() {
    stopDemo.current = false
    setDemoRunning(true)
    setMessages([])
    for (const step of DEMOS[profile.trade]) {
      if (stopDemo.current) break
      await proceed(step.side, step.text, step.side === 'worker' ? 'ml' : 'en')
      await sleep(900)
    }
    setDemoRunning(false)
  }

  const sendFeedback = (reason) => {
    const m = feedbackFor
    const saved = Boolean(profile.consent)
    if (saved) appendFeedback({ reason, trade: profile.trade, from: m.from, to: m.to, src: m.src, tgt: m.tgt, via: m.via })
    setFeedbackFor(null)
    setToast(saved ? S.savedLocally : S.notSaved)
    setTimeout(() => setToast(null), 1800)
  }

  const listening = status === 'listening'
  const busy = status !== 'idle'

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        left={<button type="button" onClick={onBack} className="min-h-16 min-w-16 text-left text-lg" aria-label="Back">← {S.back.ml}</button>}
        title={<div><div className="font-semibold">{TRADE_NAMES[profile.trade].ml}</div><div className="text-sm opacity-80">{LANG_NAMES[profile.lang].en}</div></div>}
        right={<button type="button" onClick={() => setShowOffline((v) => !v)} className="min-h-16 min-w-16 text-right text-base underline">{S.offline.ml}</button>}
      />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && !demoRunning && (
          <p className="py-8 text-center opacity-70"><Bi s={S.workerMic} /></p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} onRepeat={() => say(m.tgt, m.to)} onSlow={() => say(m.tgt, m.to, 0.6)} onThumbs={() => setFeedbackFor(m)} />
        ))}

        {pending?.kind === 'confirm' && (
          <div className="rounded-2xl border-2 border-teal-700 bg-white p-4">
            <Bi s={S.confirmQ} />
            <p className="my-3 text-2xl">{pending.text}</p>
            <div className="grid grid-cols-2 gap-3">
              <BigButton s={S.yes} onClick={() => proceed(pending.side, pending.text)} />
              <BigButton tone="soft" s={S.no} onClick={() => setPending(null)} />
            </div>
          </div>
        )}
        {pending?.kind === 'empty' && (
          <div className="rounded-2xl border-2 border-amber-500 bg-white p-4">
            <Bi s={S.sayAgain} />
            {pending.alternatives.slice(0, 2).map((a, i) => (
              <BigButton key={i} tone="soft" className="mt-3 block w-full text-xl" onClick={() => proceed(pending.side, a.transcript)}>
                <span className="block text-sm opacity-70">{S.heard.ml} / {S.heard.en}</span>{a.transcript}
              </BigButton>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t-2 border-teal-200 bg-teal-50 p-4">
        <Banner banner={banner} onRetry={retry} />
        {showOffline && <OfflinePhrases profile={profile} onSay={say} />}
        {feedbackFor && (
          <div className="rounded-2xl border-2 border-teal-700 bg-white p-3">
            <div className="grid grid-cols-1 gap-2">
              <BigButton tone="soft" s={S.wrongWord} onClick={() => sendFeedback('wrong-word')} />
              <BigButton tone="soft" s={S.wrongNumber} onClick={() => sendFeedback('wrong-number')} />
              <BigButton tone="soft" s={S.notUnderstood} onClick={() => sendFeedback('not-understood')} />
              <BigButton tone="ghost" s={S.back} onClick={() => setFeedbackFor(null)} />
            </div>
          </div>
        )}
        {toast && <div className="rounded-xl bg-teal-800 p-3 text-center text-white"><Bi s={toast} /></div>}
        {listening && (
          <div className="text-center" role="status">
            <Bi s={S.listening} />
            <div className="mx-auto mt-2 h-3 w-48 overflow-hidden rounded-full bg-teal-200" aria-hidden="true">
              <div className="h-full bg-teal-700 transition-all" style={{ width: `${Math.min(100, level * 400)}%` }} />
            </div>
            {interim && <p className="mt-2 text-xl">{interim}</p>}
          </div>
        )}
        {status === 'working' && <p className="text-center" role="status"><Bi s={S.working} /></p>}

        {demoRunning ? (
          <BigButton tone="danger" s={S.stop} onClick={() => { stopDemo.current = true; stopSpeaking(); setDemoRunning(false) }} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <MicButton s={S.workerMic} active={listening} disabled={busy && !listening} onClick={() => handleListen('worker')} />
            <MicButton s={S.customerMic} soft active={false} disabled={busy} onClick={() => handleListen('customer')} />
          </div>
        )}
        <TypeBox open={showType} onToggle={() => setShowType((v) => !v)} onSend={(side, text) => proceed(side, text)} disabled={busy} />
      </div>
    </div>
  )
}

function MicButton({ s, onClick, disabled, active, soft }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`min-h-24 rounded-2xl px-3 py-3 text-center disabled:opacity-40 ${soft ? 'border-2 border-teal-700 bg-white text-teal-900' : 'bg-teal-700 text-white'} ${active ? 'listening' : ''}`}
    >
      <span className="block text-3xl" aria-hidden="true">🎤</span>
      <Bi s={s} className="text-center" />
    </button>
  )
}

function Bubble({ m, onRepeat, onSlow, onThumbs }) {
  const mine = m.side === 'worker'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl p-3 shadow ${mine ? 'bg-teal-700 text-white' : 'bg-white text-teal-950'} ${m.blocked ? 'ring-4 ring-rose-500' : ''}`}>
        <p className="text-base opacity-80">{m.src}</p>
        <p className="mt-1 text-2xl font-semibold">{m.blocked ? '—' : m.tgt}</p>
        {m.nums.source.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {m.nums.source.map((n, i) => (
              <span key={i} className={`rounded-full px-3 py-1 text-base font-semibold ${m.blocked ? 'bg-rose-100 text-rose-900' : m.nums.status === 'unverified' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                {m.blocked ? '⚠' : m.nums.status === 'unverified' ? '?' : '✓'} {n}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="opacity-70">{m.via === 'phrasebank' ? '✔ phrase bank' : m.via === 'model' ? 'model' : ''}</span>
        </div>
        {!m.blocked && (
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={onRepeat} className="min-h-16 min-w-16 rounded-xl bg-black/10 px-3" aria-label="Repeat">🔊 <span className="text-sm">{S.repeat.ml}</span></button>
            <button type="button" onClick={onSlow} className="min-h-16 min-w-16 rounded-xl bg-black/10 px-3" aria-label="Slower">🐢 <span className="text-sm">{S.slower.ml}</span></button>
            <button type="button" onClick={onThumbs} className="min-h-16 min-w-16 rounded-xl bg-black/10 px-3" aria-label="Report a problem">👎</button>
          </div>
        )}
      </div>
    </div>
  )
}

// Reviewed phrases that work with no network and no API: tap to see and hear the translation.
function OfflinePhrases({ profile, onSay }) {
  const phrases = phrasesForTrade(profile.trade)
  const [open, setOpen] = useState(null)
  return (
    <div className="max-h-72 overflow-y-auto rounded-2xl border-2 border-teal-700 bg-white p-2">
      <p className="px-2 pb-1 text-sm opacity-70">{S.offline.ml} / {S.offline.en}</p>
      {phrases.map((p) => (
        <div key={p.id}>
          <button type="button" className="min-h-16 w-full rounded-xl px-3 py-2 text-left text-lg active:bg-teal-50" onClick={() => { setOpen(open === p.id ? null : p.id); onSay(p[profile.lang], profile.lang) }}>
            {p.ml}
          </button>
          {open === p.id && <p className="mx-3 mb-2 rounded-xl bg-teal-100 p-3 text-2xl font-semibold">{p[profile.lang]}</p>}
        </div>
      ))}
    </div>
  )
}

// Fallback for browsers without speech recognition, and for testing without a microphone.
function TypeBox({ open, onToggle, onSend, disabled }) {
  const [text, setText] = useState('')
  const [side, setSide] = useState('worker')
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(side, text.trim())
    setText('')
  }
  return (
    <div>
      <button type="button" onClick={onToggle} className="min-h-12 w-full text-center text-base text-teal-800 underline">{S.typeInstead.ml} / {S.typeInstead.en}</button>
      {open && (
        <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 text-base">
            <label className="flex min-h-12 items-center gap-2"><input type="radio" checked={side === 'worker'} onChange={() => setSide('worker')} /> {S.workerMic.ml}</label>
            <label className="flex min-h-12 items-center gap-2"><input type="radio" checked={side === 'customer'} onChange={() => setSide('customer')} /> {S.customerMic.ml}</label>
          </div>
          <input value={text} onChange={(e) => setText(e.target.value)} className="min-h-16 rounded-xl border-2 border-teal-700 px-3 text-xl" aria-label="Message" />
          <BigButton s={S.send} disabled={disabled || !text.trim()} onClick={submit} />
        </form>
      )}
    </div>
  )
}
