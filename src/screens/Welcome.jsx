import React, { useState } from 'react'
import { S, TRADE_NAMES, LANG_NAMES } from '../i18n.js'
import { TRADES, LANGS } from '../lib/phrases.js'
import { speak, stopSpeaking } from '../lib/speech.js'
import { Bi, BigButton, Kasavu } from '../ui.jsx'
import { Icon, TRADE_ICON } from '../icons.jsx'
import Mascot from '../Mascot.jsx'
import ThemeToggle from '../ThemeToggle.jsx'

const SCRIPT_BADGE = { en: 'A', hi: 'अ', ta: 'அ' }

// Step 0: consent. Step 1: trade. Step 2: customer language.
export default function Welcome({ profile, startStep = 0, onDone, theme }) {
  const [step, setStep] = useState(profile ? startStep : 0)
  const [draft, setDraft] = useState(profile || { consent: false, trade: null, lang: 'en' })
  const [noVoice, setNoVoice] = useState(false)
  const [talking, setTalking] = useState(false)

  const playNotice = async () => {
    stopSpeaking()
    setTalking(true)
    const r = await speak(S.consent.ml, 'ml')
    setTalking(false)
    setNoVoice(!r.spoken)
  }
  const choose = (consent) => { setDraft({ ...draft, consent }); setStep(1) }
  const pickTrade = (trade) => { setDraft({ ...draft, trade }); setStep(2) }
  const pickLang = (lang) => onDone({ ...draft, lang })

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="weave weave-mask pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden="true" />
      <Kasavu />
      <div className="relative flex justify-end px-3 pt-3">
        <ThemeToggle pref={theme[0]} onChange={theme[1]} compact />
      </div>

      <div className="relative flex flex-col items-center px-6 pb-2 text-center">
        <Mascot mood={talking ? 'speaking' : step === 2 ? 'happy' : 'idle'} size={118} />
        <h1 className="font-hand mt-1 text-5xl leading-tight text-ink">{S.namaskaram.ml}</h1>
        <p className="text-sm text-muted">{S.namaskaram.en}</p>
        <p className="text-lg text-muted">{S.appName.ml} · {S.tagline.en}</p>
      </div>

      <div className="relative flex flex-1 flex-col gap-4 px-5 pb-8 pt-3">
        <div className="flex items-center justify-center gap-2" role="img" aria-label={`${S.step.en} ${step + 1} / 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-3 rounded-full transition-all ${i === step ? 'w-9 bg-primary' : i < step ? 'w-3 bg-gold' : 'w-3 bg-line'}`} />
          ))}
        </div>

        {step === 0 && (
          <section key="s0" className="enter flex flex-col gap-4" aria-label="Consent">
            <div className="rounded-[28px] border-2 border-line bg-surface p-5">
              <p className="text-2xl font-semibold leading-snug">{S.consent.ml}</p>
              <p className="mt-2 text-base text-muted">{S.consent.en}</p>
              <BigButton tone="soft" icon="speaker" s={S.listenNotice} onClick={playNotice} className="mt-4 w-full" />
              {noVoice && <p className="mt-2 text-sm text-muted">{S.noVoice.ml} / {S.noVoice.en}</p>}
            </div>
            <BigButton icon="check" s={S.allow} onClick={() => choose(true)} />
            <BigButton tone="soft" icon="lock" s={S.deny} onClick={() => choose(false)} />
          </section>
        )}

        {step === 1 && (
          <section key="s1" className="enter flex flex-col gap-4" aria-label="Choose trade">
            <Bi s={S.pickTrade} mlClass="text-2xl" className="text-center" />
            <div className="grid grid-cols-2 gap-3">
              {TRADES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => pickTrade(t)}
                  aria-pressed={draft.trade === t}
                  className={`btn flex min-h-36 flex-col items-center justify-center gap-3 rounded-[28px] border-2 p-3 text-center ${draft.trade === t ? 'border-primary bg-surface2' : 'btn-soft'}`}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary"><Icon name={TRADE_ICON[t]} size={30} /></span>
                  <Bi s={TRADE_NAMES[t]} />
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section key="s2" className="enter flex flex-col gap-4" aria-label="Choose language">
            <Bi s={S.pickLang} mlClass="text-2xl" className="text-center" />
            <div className="flex flex-col gap-3">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => pickLang(l)}
                  aria-pressed={draft.lang === l}
                  className={`btn flex min-h-20 items-center gap-4 rounded-[26px] border-2 px-4 text-left ${draft.lang === l ? 'border-primary bg-surface2' : 'btn-soft'}`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl font-bold text-on-primary">{SCRIPT_BADGE[l]}</span>
                  <Bi s={LANG_NAMES[l]} mlClass="text-xl" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
