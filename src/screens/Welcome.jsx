import React, { useState } from 'react'
import { S, TRADE_NAMES, LANG_NAMES } from '../i18n.js'
import { TRADES, LANGS } from '../lib/phrases.js'
import { speak, stopSpeaking } from '../lib/speech.js'
import { Bi, BigButton } from '../ui.jsx'

// Step 0: consent. Step 1: trade. Step 2: customer language.
export default function Welcome({ profile, startStep = 0, onDone }) {
  const [step, setStep] = useState(profile ? startStep : 0)
  const [draft, setDraft] = useState(profile || { consent: false, trade: null, lang: 'en' })
  const [noVoice, setNoVoice] = useState(false)

  const playNotice = async () => {
    stopSpeaking()
    const r = await speak(S.consent.ml, 'ml')
    setNoVoice(!r.spoken)
  }
  const choose = (consent) => { setDraft({ ...draft, consent }); setStep(1) }
  const pickTrade = (trade) => { setDraft({ ...draft, trade }); setStep(2) }
  const pickLang = (lang) => onDone({ ...draft, lang })

  return (
    <div className="flex min-h-screen flex-col gap-5 p-5">
      <div className="pt-6 text-center">
        <h1 className="text-4xl font-bold text-teal-800">{S.appName.ml}</h1>
        <p className="text-lg text-teal-700">{S.appName.en}</p>
        <p className="mt-2 text-lg">{S.tagline.en}</p>
      </div>

      {step === 0 && (
        <section className="flex flex-col gap-4" aria-label="Consent">
          <div className="rounded-2xl bg-white p-4 shadow">
            <Bi s={S.consent} mlClass="text-xl" />
          </div>
          <BigButton tone="soft" s={S.listenNotice} onClick={playNotice} />
          {noVoice && <p className="text-sm">{S.noVoice.ml} / {S.noVoice.en}</p>}
          <BigButton s={S.allow} onClick={() => choose(true)} />
          <BigButton tone="soft" s={S.deny} onClick={() => choose(false)} />
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-4" aria-label="Choose trade">
          <Bi s={S.pickTrade} mlClass="text-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {TRADES.map((t) => (
              <BigButton key={t} tone={draft.trade === t ? 'primary' : 'soft'} s={TRADE_NAMES[t]} onClick={() => pickTrade(t)} className="min-h-28" />
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4" aria-label="Choose language">
          <Bi s={S.pickLang} mlClass="text-2xl" />
          <div className="grid grid-cols-1 gap-3">
            {LANGS.map((l) => (
              <BigButton key={l} tone={draft.lang === l ? 'primary' : 'soft'} s={LANG_NAMES[l]} onClick={() => pickLang(l)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
