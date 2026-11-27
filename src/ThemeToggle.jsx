import React, { useEffect, useState } from 'react'
import { THEMES, applyTheme, getPref, savePref } from './theme.js'
import { Icon } from './icons.jsx'

const LABELS = {
  auto: { ml: 'ഓട്ടോ', en: 'Auto', icon: 'auto' },
  light: { ml: 'പകൽ', en: 'Light', icon: 'sun' },
  dark: { ml: 'രാത്രി', en: 'Dark', icon: 'moon' },
}

export function useTheme() {
  const [pref, setPref] = useState(getPref)
  useEffect(() => {
    applyTheme(pref)
    if (pref !== 'auto') return undefined
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('auto')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])
  return [pref, (p) => { savePref(p); setPref(p) }]
}

// Three-way switch: Auto (follows the phone), Light, Dark.
export default function ThemeToggle({ pref, onChange, compact = false }) {
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex gap-1 rounded-full border-2 border-line bg-surface p-1">
      {THEMES.map((t) => {
        const on = pref === t
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${LABELS[t].ml} ${LABELS[t].en}`}
            onClick={() => onChange(t)}
            className={`flex min-h-12 items-center justify-center gap-1.5 rounded-full px-3 text-base font-semibold transition-colors ${on ? 'bg-primary text-on-primary' : 'text-muted'}`}
          >
            <Icon name={LABELS[t].icon} size={20} />
            {!compact && <span>{LABELS[t].ml}</span>}
          </button>
        )
      })}
    </div>
  )
}
