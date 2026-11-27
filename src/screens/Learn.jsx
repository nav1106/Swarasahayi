import React, { useEffect, useState } from 'react'
import { S, TRADE_NAMES } from '../i18n.js'
import { lessonPhrases } from '../lib/phrases.js'
import { LEVELS, MAX_TRIES, PASS_SCORE, isLevelUnlocked, levelStats, scoreAttempt } from '../lib/learn.js'
import { listen, speak, speechSupported, stopSpeaking } from '../lib/speech.js'
import { load, save } from '../lib/storage.js'
import { Bi, BigButton, Banner, Header, BackButton } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import Mascot from '../Mascot.jsx'
import ThemeToggle from '../ThemeToggle.jsx'

export default function Learn({ profile, theme, onBack }) {
  const [progress, setProgress] = useState(() => load('progress', {})[profile.trade] || {})
  const [level, setLevel] = useState(null)
  const [index, setIndex] = useState(0)
  const [tries, setTries] = useState(0)
  const [result, setResult] = useState(null) // { passed, heard, score }
  const [listening, setListening] = useState(false)
  const [banner, setBanner] = useState(null)

  useEffect(() => () => stopSpeaking(), [])

  const record = (id, patch) => {
    const next = { ...progress, [id]: { ...progress[id], ...patch } }
    setProgress(next)
    const all = load('progress', {})
    save('progress', { ...all, [profile.trade]: next })
  }

  const phrases = level ? lessonPhrases(profile.trade, level) : []
  const phrase = phrases[index]

  const hear = async (rate = 0.9) => {
    const r = await speak(phrase.en, 'en', { rate })
    if (!r.spoken && r.reason === 'no-voice') setBanner({ kind: 'info', s: S.noVoice })
  }

  const attempt = async () => {
    setBanner(null)
    setResult(null)
    setListening(true)
    try {
      const { alternatives } = await listen('en')
      const score = alternatives.length ? scoreAttempt(phrase.en, alternatives) : 0
      const passed = score >= PASS_SCORE
      const used = tries + 1
      setTries(used)
      setResult({ passed, score, heard: alternatives[0]?.transcript || '' })
      if (passed) record(phrase.id, { passed: true, retry: false })
      else {
        if (used >= MAX_TRIES) record(phrase.id, { retry: true })
        await hear(0.6)
      }
    } catch (e) {
      setBanner({ kind: 'error', s: e.code === 'mic-denied' ? S.micDenied : e.code === 'unsupported' ? S.micUnsupported : S.voiceService })
    } finally {
      setListening(false)
    }
  }

  const next = () => {
    setResult(null)
    setTries(0)
    setBanner(null)
    if (index + 1 >= phrases.length) { setLevel(null); setIndex(0) } else setIndex(index + 1)
  }

  const start = (lv) => { setLevel(lv); setIndex(0); setTries(0); setResult(null) }

  // ---- Level path ----
  if (!level) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header
          left={<BackButton onClick={onBack} />}
          title={<div className="text-lg font-semibold">{S.learn.ml}<span className="block text-sm font-normal text-muted">{S.learn.en} · {TRADE_NAMES[profile.trade].en}</span></div>}
          right={<ThemeToggle pref={theme[0]} onChange={theme[1]} compact />}
        />
        <div className="flex flex-col gap-0 px-5 py-5">
          <div className="mb-4 flex items-center gap-3">
            <Mascot mood="idle" size={72} />
            <Bi s={S.yourProgress} mlClass="text-xl" />
          </div>
          {LEVELS.map((lv, i) => {
            const stats = levelStats(profile.trade, lv, progress)
            const open = isLevelUnlocked(profile.trade, lv, progress)
            const complete = stats.total > 0 && stats.passed === stats.total
            return (
              <div key={lv} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 text-xl font-bold ${complete ? 'border-gold bg-primary text-on-primary' : open ? 'border-primary bg-surface text-ink' : 'border-line bg-surface2 text-muted'}`}>
                    {complete ? <Icon name="check" size={28} strokeWidth={3} /> : open ? lv : <Icon name="lock" size={22} />}
                  </span>
                  {i < LEVELS.length - 1 && <span className="my-1 w-1 flex-1 rounded-full bg-line" style={{ minHeight: 28 }} aria-hidden="true" />}
                </div>
                <div className={`enter mb-4 flex-1 rounded-[26px] border-2 p-4 ${open ? 'border-line bg-surface' : 'border-line bg-surface2 opacity-80'}`} style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="flex items-center justify-between gap-2">
                    <Bi s={S.levels[lv - 1]} mlClass="text-2xl" />
                    <span className="flex gap-0.5 text-gold" aria-label={`${stats.passed}/${stats.total}`}>
                      {Array.from({ length: stats.total }).map((_, k) => (
                        <Icon key={k} name="star" size={20} className={k < stats.passed ? 'fill-current' : 'opacity-35'} />
                      ))}
                    </span>
                  </div>
                  {open
                    ? <BigButton icon="play" s={S.learn} onClick={() => start(lv)} className="mt-3 w-full" />
                    : <p className="mt-2 text-base text-muted">{S.lockedHint.ml}<span className="block text-sm">{S.lockedHint.en}</span></p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ---- Practice one phrase ----
  const stats = levelStats(profile.trade, level, progress)
  const done = progress[phrase.id]?.passed
  const outOfTries = !result?.passed && tries >= MAX_TRIES
  const mood = listening ? 'listening' : result?.passed ? 'happy' : result ? 'oops' : 'idle'
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        left={<BackButton onClick={() => setLevel(null)} />}
        title={<div className="text-lg font-semibold">{S.levels[level - 1].ml}<span className="block text-sm font-normal text-muted">{S.levels[level - 1].en}</span></div>}
        right={<ThemeToggle pref={theme[0]} onChange={theme[1]} compact />}
      />
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <div className="flex items-center justify-center gap-2" role="progressbar" aria-valuenow={index + 1} aria-valuemax={phrases.length}>
          {phrases.map((p, i) => (
            <span key={p.id} className={`h-3 rounded-full transition-all ${i === index ? 'w-9 bg-primary' : progress[p.id]?.passed ? 'w-3 bg-gold' : 'w-3 bg-line'}`} />
          ))}
        </div>

        <div className="flex items-end gap-3">
          <Mascot mood={mood} size={84} />
          <div className="mb-3 flex-1 rounded-[24px] rounded-bl-md bg-surface2 px-4 py-2" role="status">
            {listening ? <Bi s={S.listening} /> : result ? <Bi s={result.passed ? S.great : S.tryAgain} mlClass="text-xl" /> : <Bi s={S.sayIt} />}
          </div>
        </div>

        <div key={phrase.id} className="enter rounded-[30px] border-2 border-line bg-surface p-5">
          <p className="text-3xl font-bold leading-snug">{phrase.en}</p>
          <p className="mt-3 text-2xl">{phrase.ml}</p>
          <p className="mt-3 inline-block rounded-2xl bg-surface2 px-3 py-1 text-xl text-link">{phrase.pron}</p>
        </div>

        <BigButton tone="soft" icon="speaker" s={S.hear} onClick={() => hear()} />

        {speechSupported() ? (
          <BigButton icon="mic" s={listening ? S.listening : S.sayIt} disabled={listening || outOfTries || result?.passed} onClick={attempt} className="w-full" />
        ) : (
          <BigButton icon="check" s={S.iSaidIt} onClick={() => { record(phrase.id, { passed: true }); setResult({ passed: true, score: 1, heard: '' }) }} />
        )}

        {result && (
          <div className={`enter rounded-[24px] border-2 p-4 ${result.passed ? 'border-success bg-success-bg' : 'border-gold bg-surface2'}`}>
            {result.heard && <p className="text-lg">{S.heard.ml} <span className="text-sm text-muted">({S.heard.en})</span>: <span className="font-semibold">{result.heard}</span> · {Math.round(result.score * 100)}%</p>}
            {!result.passed && <p className="mt-1 text-sm text-muted">{tries}/{MAX_TRIES}</p>}
          </div>
        )}
        <Banner banner={banner} />

        {(result?.passed || outOfTries || done) && <BigButton icon="play" s={S.next} onClick={next} className="mt-auto w-full" />}
      </div>
    </div>
  )
}
