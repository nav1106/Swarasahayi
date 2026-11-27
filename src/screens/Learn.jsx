import React, { useEffect, useState } from 'react'
import { S, TRADE_NAMES } from '../i18n.js'
import { lessonPhrases } from '../lib/phrases.js'
import { LEVELS, MAX_TRIES, PASS_SCORE, isLevelUnlocked, levelStats, scoreAttempt } from '../lib/learn.js'
import { listen, speak, speechSupported, stopSpeaking } from '../lib/speech.js'
import { load, save } from '../lib/storage.js'
import { Bi, BigButton, Banner, Header } from '../ui.jsx'

export default function Learn({ profile, onBack }) {
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

  // ---- Level list ----
  if (!level) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header
          left={<button type="button" onClick={onBack} className="min-h-16 min-w-16 text-left text-lg">← {S.back.ml}</button>}
          title={<div className="font-semibold">{S.learn.ml} · {TRADE_NAMES[profile.trade].ml}</div>}
        />
        <div className="flex flex-col gap-4 p-5">
          {LEVELS.map((lv) => {
            const stats = levelStats(profile.trade, lv, progress)
            const open = isLevelUnlocked(profile.trade, lv, progress)
            return (
              <div key={lv} className={`rounded-2xl bg-white p-4 shadow ${open ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <Bi s={S.levels[lv - 1]} mlClass="text-2xl" />
                  <span className="text-xl font-semibold">{stats.passed}/{stats.total} {'★'.repeat(stats.passed)}</span>
                </div>
                <div className="my-3 h-3 overflow-hidden rounded-full bg-teal-100" role="progressbar" aria-valuenow={stats.passed} aria-valuemax={stats.total}>
                  <div className="h-full bg-teal-700" style={{ width: `${stats.total ? (stats.passed / stats.total) * 100 : 0}%` }} />
                </div>
                {open ? <BigButton s={S.learn} onClick={() => start(lv)} /> : <p><Bi s={S.lockedHint} /></p>}
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
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        left={<button type="button" onClick={() => setLevel(null)} className="min-h-16 min-w-16 text-left text-lg">← {S.back.ml}</button>}
        title={<div className="font-semibold">{S.levels[level - 1].ml} · {index + 1}/{phrases.length}</div>}
        right={<span className="text-lg">{'★'.repeat(stats.passed)}</span>}
      />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-3xl font-bold">{phrase.en}</p>
          <p className="mt-3 text-2xl">{phrase.ml}</p>
          <p className="mt-2 text-xl text-teal-700">{phrase.pron}</p>
        </div>

        <BigButton tone="soft" s={S.hear} onClick={() => hear()} />

        {speechSupported() ? (
          <BigButton s={listening ? S.listening : S.sayIt} disabled={listening || outOfTries || result?.passed} onClick={attempt} className={listening ? 'listening' : ''} />
        ) : (
          <BigButton s={S.iSaidIt} onClick={() => { record(phrase.id, { passed: true }); setResult({ passed: true, score: 1, heard: '' }) }} />
        )}

        {result && (
          <div className={`rounded-2xl border-2 p-4 ${result.passed ? 'border-emerald-600 bg-emerald-50' : 'border-amber-500 bg-amber-50'}`} role="status">
            <Bi s={result.passed ? S.great : S.tryAgain} mlClass="text-2xl" />
            {result.heard && <p className="mt-2 text-lg">{S.heard.ml}: {result.heard} ({Math.round(result.score * 100)}%)</p>}
            {!result.passed && <p className="mt-1 text-sm opacity-70">{tries}/{MAX_TRIES}</p>}
          </div>
        )}
        <Banner banner={banner} />

        {(result?.passed || outOfTries || done) && <BigButton s={S.next} onClick={next} className="mt-auto" />}
      </div>
    </div>
  )
}
