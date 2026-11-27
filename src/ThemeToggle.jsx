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

// One small button. Each tap moves to the next mode: Auto (follows the phone) -> Light -> Dark -> Auto.
export default function ThemeToggle({ pref, onChange }) {
  const next = THEMES[(THEMES.indexOf(pref) + 1) % THEMES.length]
  const cur = LABELS[pref]
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`${cur.ml} ${cur.en}. ${LABELS[next].en}`}
      className="flex min-h-11 items-center gap-1.5 rounded-full border-2 border-line bg-surface px-3 text-sm font-semibold text-ink"
    >
      <Icon name={cur.icon} size={20} />
      <span>{cur.en}</span>
    </button>
  )
}
