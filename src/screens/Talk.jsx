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
import { Bi, BigButton, Banner, Header, BackButton } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import Mascot from '../Mascot.jsx'
import ThemeToggle from '../ThemeToggle.jsx'

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

export default function Talk({ profile, options, theme, onBack }) {
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

  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [messages, pending, banner, showOffline, feedbackFor, toast])
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
  const mood = listening ? 'listening' : status === 'working' ? 'thinking' : status === 'speaking' ? 'speaking' : banner?.kind === 'error' ? 'oops' : 'idle'
  const caption = listening ? S.listening : status === 'working' ? S.working : status === 'speaking' ? S.speaking : S.tapToSpeak

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        left={<BackButton onClick={onBack} />}
        title={<div><div className="text-lg font-semibold">{TRADE_NAMES[profile.trade].ml}</div><div className="text-sm text-muted">{TRADE_NAMES[profile.trade].en} → {LANG_NAMES[profile.lang].en}</div></div>}
        right={<ThemeToggle pref={theme[0]} onChange={theme[1]} compact />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 [&>*]:shrink-0" aria-live="polite">
        <div className="flex items-center gap-3 rounded-[28px] bg-surface2 px-4 py-2">
          <Mascot mood={mood} size={68} />
          <div role="status" className="flex-1">
            <Bi s={caption} />
            {listening && interim && <p className="mt-1 text-xl">{interim}</p>}
          </div>
          <button type="button" onClick={() => setShowOffline((v) => !v)} aria-pressed={showOffline} className={`flex min-h-14 min-w-14 flex-col items-center justify-center rounded-2xl px-2 text-xs font-semibold ${showOffline ? 'bg-primary text-on-primary' : 'text-link'}`}>
            <Icon name="wifioff" size={24} />
            <span>{S.offline.en.split(' ')[0]}</span>
          </button>
        </div>

        {messages.length === 0 && !demoRunning && (
          <p className="px-6 py-6 text-center text-muted"><Bi s={S.workerMic} /></p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} onRepeat={() => say(m.tgt, m.to)} onSlow={() => say(m.tgt, m.to, 0.6)} onThumbs={() => setFeedbackFor(m)} />
        ))}

        {pending?.kind === 'confirm' && (
          <div className="enter rounded-[26px] border-2 border-primary bg-surface p-4">
            <Bi s={S.confirmQ} />
            <p className="my-3 text-2xl font-semibold">{pending.text}</p>
            <div className="grid grid-cols-2 gap-3">
              <BigButton icon="check" s={S.yes} onClick={() => proceed(pending.side, pending.text)} />
              <BigButton tone="soft" icon="close" s={S.no} onClick={() => setPending(null)} />
            </div>
          </div>
        )}
        {pending?.kind === 'empty' && (
          <div className="enter rounded-[26px] border-2 border-gold bg-surface p-4">
            <Bi s={S.sayAgain} />
            {pending.alternatives.slice(0, 2).map((a, i) => (
              <button key={i} type="button" onClick={() => proceed(pending.side, a.transcript)} className="btn btn-soft mt-3 block min-h-16 w-full rounded-[20px] px-4 py-2 text-left text-xl">
                <span className="block text-sm text-muted">{S.heard.ml} / {S.heard.en}</span>{a.transcript}
              </button>
            ))}
          </div>
        )}
        <Banner banner={banner} onRetry={retry} />
        {showOffline && <OfflinePhrases profile={profile} onSay={say} />}
        {feedbackFor && (
          <div className="enter rounded-[26px] border-2 border-primary bg-surface p-3">
            <div className="grid grid-cols-1 gap-2">
              <BigButton tone="soft" s={S.wrongWord} onClick={() => sendFeedback('wrong-word')} />
              <BigButton tone="soft" s={S.wrongNumber} onClick={() => sendFeedback('wrong-number')} />
              <BigButton tone="soft" s={S.notUnderstood} onClick={() => sendFeedback('not-understood')} />
              <BigButton tone="ghost" s={S.back} onClick={() => setFeedbackFor(null)} />
            </div>
          </div>
        )}
        {toast && <div className="enter rounded-2xl bg-success-bg p-3 text-center text-success" role="status"><Bi s={toast} className="text-center" /></div>}
        <div ref={endRef} />
      </div>

      <div className="z-10 shrink-0 bg-bg">
        <div className="kasavu" aria-hidden="true" />
        <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
          {status === 'working' && <p className="sr-only" role="status">{S.working.en}</p>}

          {demoRunning ? (
            <BigButton tone="danger" icon="stop" s={S.stop} onClick={() => { stopDemo.current = true; stopSpeaking(); setDemoRunning(false) }} />
          ) : (
            <div className="flex items-end justify-between gap-2">
              <DockSide icon="keyboard" s={S.typeInstead} active={showType} onClick={() => setShowType((v) => !v)} />
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleListen('worker')}
                  disabled={busy && !listening}
                  aria-pressed={listening}
                  aria-label={`${S.workerMic.ml} ${S.workerMic.en}`}
                  className={`btn btn-primary relative flex h-24 w-24 items-center justify-center rounded-full ${listening ? 'mic-ring' : ''}`}
                >
                  {listening ? <Bars /> : <Icon name="mic" size={44} />}
                </button>
                <Bi s={S.workerMic} className="text-center" />
              </div>
              <DockSide icon="person" s={S.customerMic} disabled={busy} onClick={() => handleListen('customer')} />
            </div>
          )}
          {showType && <TypeBox onSend={(side, text) => proceed(side, text)} disabled={busy} />}
        </div>
      </div>
    </div>
  )
}

function Bars() {
  return (
    <span className="flex h-10 items-center gap-1.5" aria-hidden="true">
      {[0, 0.15, 0.3, 0.15, 0].map((d, i) => <span key={i} className="bar block h-full w-1.5 rounded-full bg-on-primary" style={{ animationDelay: `${d}s` }} />)}
    </span>
  )
}

function DockSide({ icon, s, onClick, disabled, active }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className={`btn flex min-h-20 w-24 flex-col items-center justify-center gap-1 rounded-[24px] px-1 py-2 text-center ${active ? 'bg-primary text-on-primary' : 'btn-soft'}`}>
      <Icon name={icon} size={28} />
      <Bi s={s} className="text-center text-sm" mlClass="text-base" enClass="text-xs" />
    </button>
  )
}

function Bubble({ m, onRepeat, onSlow, onThumbs }) {
  const mine = m.side === 'worker'
  const chip = (n, i) => {
    const tone = m.blocked ? 'bg-danger-bg text-danger' : m.nums.status === 'unverified' ? 'bg-surface2 text-ink' : 'bg-success-bg text-success'
    return (
      <span key={i} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-base font-bold ${tone}`}>
        <Icon name={m.blocked ? 'alert' : 'check'} size={16} strokeWidth={3} />{n}
      </span>
    )
  }
  return (
    <div className={`enter flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[90%] p-4 ${mine ? 'rounded-[28px] rounded-br-lg bg-primary text-on-primary' : 'rounded-[28px] rounded-bl-lg border-2 border-line bg-surface text-ink'} ${m.blocked ? 'ring-4 ring-danger' : ''}`}>
        <p className="text-base opacity-85">{m.src}</p>
        <p className="mt-1 text-2xl font-bold leading-snug">{m.blocked ? '—' : m.tgt}</p>
        {m.nums.source.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{m.nums.source.map(chip)}</div>}
        {m.via === 'phrasebank' && !m.blocked && <p className="mt-2 flex items-center gap-1 text-sm opacity-85"><Icon name="check" size={14} strokeWidth={3} /> {'phrase bank'}</p>}
        {!m.blocked && (
          <div className="mt-3 flex gap-2">
            <BubbleAction onClick={onRepeat} label={`${S.repeat.ml} ${S.repeat.en}`} mine={mine}><Icon name="speaker" size={24} /></BubbleAction>
            <BubbleAction onClick={onSlow} label={`${S.slower.ml} ${S.slower.en}`} mine={mine}><span className="text-base font-bold">0.6×</span></BubbleAction>
            <BubbleAction onClick={onThumbs} label="Report a problem" mine={mine}><Icon name="thumbdown" size={22} /></BubbleAction>
          </div>
        )}
      </div>
    </div>
  )
}

function BubbleAction({ children, onClick, label, mine }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`flex min-h-14 min-w-14 items-center justify-center rounded-full px-3 ${mine ? 'bg-on-primary/15' : 'bg-surface2'}`}>
      {children}
    </button>
  )
}

// Reviewed phrases that work with no network and no API: tap to see and hear the translation.
function OfflinePhrases({ profile, onSay }) {
  const phrases = phrasesForTrade(profile.trade)
  const [open, setOpen] = useState(null)
  return (
    <div className="enter max-h-80 overflow-y-auto rounded-[26px] border-2 border-line bg-surface p-2">
      <p className="px-3 py-1 text-sm text-muted">{S.offline.ml} / {S.offline.en}</p>
      {phrases.map((p) => (
        <div key={p.id}>
          <button type="button" className="min-h-16 w-full rounded-2xl px-3 py-2 text-left text-lg active:bg-surface2" onClick={() => { setOpen(open === p.id ? null : p.id); onSay(p[profile.lang], profile.lang) }}>
            <span className="block">{p.ml}</span>
            <span className="block text-sm text-muted">{p.en}</span>
          </button>
          {open === p.id && <p className="enter mx-2 mb-2 rounded-2xl bg-surface2 p-3 text-2xl font-bold">{p[profile.lang]}</p>}
        </div>
      ))}
    </div>
  )
}

// Fallback for browsers without speech recognition, and for testing without a microphone.
function TypeBox({ onSend, disabled }) {
  const [text, setText] = useState('')
  const [side, setSide] = useState('worker')
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(side, text.trim())
    setText('')
  }
  return (
    <form onSubmit={submit} className="enter flex flex-col gap-2 rounded-[26px] border-2 border-line bg-surface p-3">
      <div className="grid grid-cols-2 gap-2 text-base">
        <label className="flex min-h-12 items-center gap-2"><input type="radio" checked={side === 'worker'} onChange={() => setSide('worker')} /> <span>{S.workerMic.ml}<span className="block text-xs text-muted">{S.workerMic.en}</span></span></label>
        <label className="flex min-h-12 items-center gap-2"><input type="radio" checked={side === 'customer'} onChange={() => setSide('customer')} /> <span>{S.customerMic.ml}<span className="block text-xs text-muted">{S.customerMic.en}</span></span></label>
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="min-h-16 min-w-0 flex-1 rounded-2xl border-2 border-line bg-bg px-4 text-xl text-ink" aria-label="Message" />
        <button type="submit" disabled={disabled || !text.trim()} className="btn btn-primary flex min-h-16 min-w-16 items-center justify-center rounded-2xl" aria-label={`${S.send.ml} ${S.send.en}`}><Icon name="send" size={26} /></button>
      </div>
    </form>
  )
}
