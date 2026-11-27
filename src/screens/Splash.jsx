import React from 'react'
import { S, TRADE_NAMES } from '../i18n.js'
import { Bi, BigButton, Kasavu } from '../ui.jsx'
import Mascot from '../Mascot.jsx'
import ThemeToggle from '../ThemeToggle.jsx'

// First screen on every launch. New users go on to set a profession; returning users can continue or switch.
export default function Splash({ profile, onStart, onChange, theme }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="weave weave-mask pointer-events-none absolute inset-x-0 top-0 h-80" aria-hidden="true" />
      <Kasavu />
      <div className="relative flex justify-end px-3 pt-3">
        <ThemeToggle pref={theme[0]} onChange={theme[1]} compact />
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <Mascot mood="happy" size={150} />
        <h1 className="font-hand mt-2 text-6xl leading-tight text-ink">{S.namaskaram.ml}</h1>
        <p className="text-base text-muted">{S.namaskaram.en}</p>
        <p className="mt-4 text-2xl font-semibold">{S.appName.ml}</p>
        <p className="text-lg text-muted">{S.appName.en} · {S.tagline.en}</p>
      </div>
      <div className="relative flex flex-col gap-3 px-5 pb-8">
        {profile ? (
          <>
            <BigButton icon="play" s={{ ml: `${S.continueAs.ml} · ${TRADE_NAMES[profile.trade].ml}`, en: `${S.continueAs.en} as ${TRADE_NAMES[profile.trade].en}` }} onClick={onStart} />
            <BigButton tone="soft" icon="person" s={S.changeWork} onClick={onChange} />
          </>
        ) : (
          <BigButton icon="play" s={S.start} onClick={onStart} />
        )}
      </div>
    </div>
  )
}
