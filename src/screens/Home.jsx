import React from 'react'
import { S, TRADE_NAMES, LANG_NAMES } from '../i18n.js'
import { Bi, BigButton } from '../ui.jsx'

export default function Home({ profile, onTalk, onLearn, onDemo, onOffline, onChange }) {
  return (
    <div className="flex min-h-screen flex-col gap-5 p-5">
      <div className="pt-4 text-center">
        <h1 className="text-4xl font-bold text-teal-800">{S.appName.ml}</h1>
        <p className="text-teal-700">{S.tagline.en}</p>
      </div>

      <div className="rounded-2xl bg-white p-3 text-center shadow">
        <span className="font-semibold">{TRADE_NAMES[profile.trade].ml}</span>
        <span className="mx-2 opacity-50">→</span>
        <span className="font-semibold">{LANG_NAMES[profile.lang].ml}</span>
        <button type="button" onClick={onChange} className="ml-3 min-h-11 px-2 text-base text-teal-700 underline">
          {S.change.ml} / {S.change.en}
        </button>
      </div>

      <BigButton s={S.talk} onClick={onTalk} className="min-h-32 text-3xl" />
      <BigButton s={S.learn} onClick={onLearn} tone="soft" className="min-h-32 text-3xl" />

      <div className="grid grid-cols-2 gap-3">
        <BigButton s={S.demo} tone="soft" onClick={onDemo} />
        <BigButton s={S.offline} tone="soft" onClick={onOffline} />
      </div>

      <p className="mt-auto pb-3 text-center text-sm opacity-70">
        <Bi s={S.consent} />
      </p>
    </div>
  )
}
