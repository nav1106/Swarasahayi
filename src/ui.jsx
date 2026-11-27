import React from 'react'

// Malayalam label large, English label small underneath.
export function Bi({ s, className = '', mlClass = '', enClass = '' }) {
  return (
    <span className={`block leading-snug ${className}`}>
      <span className={`block font-semibold ${mlClass}`}>{s.ml}</span>
      <span className={`block text-sm opacity-75 ${enClass}`}>{s.en}</span>
    </span>
  )
}

export function BigButton({ s, onClick, tone = 'primary', disabled, className = '', children, ...rest }) {
  const tones = {
    primary: 'bg-teal-700 text-white active:bg-teal-800',
    soft: 'bg-white text-teal-900 border-2 border-teal-700 active:bg-teal-50',
    danger: 'bg-rose-700 text-white active:bg-rose-800',
    ghost: 'bg-transparent text-teal-800 underline',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-16 min-w-16 rounded-2xl px-5 py-3 text-left disabled:opacity-40 ${tones[tone]} ${className}`}
      {...rest}
    >
      {s ? <Bi s={s} /> : children}
    </button>
  )
}

export function Banner({ banner, onRetry }) {
  if (!banner) return null
  const tone = banner.kind === 'info' ? 'bg-sky-100 text-sky-950 border-sky-300' : 'bg-amber-100 text-amber-950 border-amber-400'
  return (
    <div role="alert" className={`rounded-xl border-2 p-3 ${tone}`}>
      <Bi s={banner.s} />
      {banner.retry && onRetry && (
        <BigButton tone="soft" s={{ ml: 'വീണ്ടും ശ്രമിക്കൂ', en: 'Retry' }} onClick={onRetry} className="mt-2 min-h-16" />
      )}
    </div>
  )
}

export function Header({ left, title, right }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-teal-700 px-4 py-3 text-white">
      <div className="min-w-16">{left}</div>
      <div className="text-center">{title}</div>
      <div className="min-w-16 text-right">{right}</div>
    </header>
  )
}
