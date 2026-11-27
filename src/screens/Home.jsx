import React from 'react'
import { S, TRADE_NAMES, LANG_NAMES } from '../i18n.js'
import { Icon, TRADE_ICON } from '../icons.jsx'
import { Bi, Kasavu } from '../ui.jsx'
import Mascot from '../Mascot.jsx'
import ThemeToggle from '../ThemeToggle.jsx'
import { load } from '../lib/storage.js'
import { LEVELS, levelStats } from '../lib/learn.js'

function ProgressRing({ value, total }) {
  const r = 26
  const c = 2 * Math.PI * r
  const pct = total ? value / total : 0
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={`${value}/${total}`}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--c-line)" strokeWidth="7" />
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--c-primary)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 34 34)" />
      <text x="34" y="39" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--c-ink)">{value}/{total}</text>
    </svg>
  )
}

export default function Home({ profile, theme, onTalk, onLearn, onDemo, onOffline, onChange }) {
  const progress = load('progress', {})[profile.trade] || {}
  const totals = LEVELS.reduce((a, lv) => {
    const s = levelStats(profile.trade, lv, progress)
    return { passed: a.passed + s.passed, total: a.total + s.total }
  }, { passed: 0, total: 0 })

  return (
    <div className="flex min-h-screen flex-col">
      <Kasavu />
      <div className="flex justify-end px-4 pt-3">
        <ThemeToggle pref={theme[0]} onChange={theme[1]} compact />
      </div>

      <div className="flex items-center gap-3 px-5 pt-5">
        <Mascot mood="idle" size={84} />
        <div>
          <h1 className="font-hand text-4xl leading-tight">{S.namaskaram.ml}</h1>
          <p className="text-muted">{S.tagline.en}</p>
        </div>
      </div>

      <div className="px-5 pt-4">
        <button type="button" onClick={onChange} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-line bg-surface px-4 text-base font-semibold" aria-label={`${S.change.ml} ${S.change.en}`}>
          <Icon name={TRADE_ICON[profile.trade]} size={22} className="text-link" />
          <span>{TRADE_NAMES[profile.trade].ml}</span>
          <span className="opacity-50" aria-hidden="true">→</span>
          <span>{LANG_NAMES[profile.lang].ml}</span>
          <span className="ml-1 text-sm font-normal text-link underline">{S.change.ml}</span>
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-6 pt-4">
        <button type="button" onClick={onTalk} className="btn btn-primary enter relative flex min-h-40 items-center gap-4 overflow-hidden rounded-[32px] p-6 text-left">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-on-primary text-primary"><Icon name="mic" size={40} /></span>
          <Bi s={S.talk} mlClass="text-3xl" enClass="text-base" />
        </button>

        <button type="button" onClick={onLearn} className="btn btn-soft enter flex min-h-32 items-center gap-4 rounded-[28px] p-5 text-left" style={{ animationDelay: '.06s' }}>
          <ProgressRing value={totals.passed} total={totals.total} />
          <span className="flex-1"><Bi s={S.learn} mlClass="text-3xl" enClass="text-base" /></span>
          <Icon name="book" size={30} className="text-link" />
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onDemo} className="btn btn-soft enter flex min-h-28 flex-col items-start justify-between rounded-[26px] p-4 text-left" style={{ animationDelay: '.12s' }}>
            <Icon name="play" size={28} className="text-link" />
            <Bi s={S.demo} />
          </button>
          <button type="button" onClick={onOffline} className="btn btn-soft enter flex min-h-28 flex-col items-start justify-between rounded-[26px] p-4 text-left" style={{ animationDelay: '.16s' }}>
            <Icon name="wifioff" size={28} className="text-link" />
            <Bi s={S.offline} />
          </button>
        </div>
      </div>

      <div className="mt-auto px-6 pb-6 text-center text-sm text-muted">
        <Icon name="lock" size={16} className="mr-1 inline align-[-3px]" />
        {S.consent.ml}
        <span className="block opacity-80">{S.consent.en}</span>
      </div>
    </div>
  )
}
