import React from 'react'
import { Icon } from './icons.jsx'

// Malayalam label large, English label small underneath.
export function Bi({ s, className = '', mlClass = '', enClass = '' }) {
  return (
    <span className={`block leading-snug ${className}`}>
      <span className={`block font-semibold ${mlClass}`}>{s.ml}</span>
      <span className={`block text-sm font-normal opacity-80 ${enClass}`}>{s.en}</span>
    </span>
  )
}

export function Kasavu({ className = '' }) {
  return <div className={`kasavu ${className}`} aria-hidden="true" />
}

// Buttons have a solid "ledge" underneath so they feel pressable. Targets are at least 64px tall.
export function BigButton({ s, onClick, tone = 'primary', disabled, className = '', icon, children, ...rest }) {
  const tones = {
    primary: 'btn btn-primary',
    soft: 'btn btn-soft',
    danger: 'btn bg-danger-bg text-danger border-2 border-danger',
    ghost: 'text-link underline',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-16 min-w-16 items-center gap-3 rounded-[22px] px-5 py-3 text-left ${tones[tone]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={28} className="shrink-0" />}
      <span className="min-w-0 flex-1">{s ? <Bi s={s} /> : children}</span>
    </button>
  )
}

export function IconButton({ icon, label, onClick, className = '', size = 26, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex min-h-14 min-w-14 items-center justify-center rounded-full ${className}`}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

export function Banner({ banner, onRetry }) {
  if (!banner) return null
  const error = banner.kind === 'error'
  return (
    <div
      role="alert"
      className={`enter flex gap-3 rounded-[20px] border-2 p-3 ${error ? 'border-danger bg-danger-bg text-ink' : 'border-gold bg-surface2 text-ink'}`}
    >
      <Icon name="alert" size={26} className={`mt-1 shrink-0 ${error ? 'text-danger' : 'text-link'}`} />
      <div className="flex-1">
        <Bi s={banner.s} />
        {banner.retry && onRetry && (
          <BigButton tone="soft" s={{ ml: 'വീണ്ടും ശ്രമിക്കൂ', en: 'Retry' }} onClick={onRetry} className="mt-3 w-full" />
        )}
      </div>
    </div>
  )
}

export function Header({ left, title, right }) {
  return (
    <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-20">{left}</div>
        <div className="text-center leading-tight">{title}</div>
        <div className="flex min-w-20 justify-end">{right}</div>
      </div>
      <div className="kasavu" aria-hidden="true" />
    </header>
  )
}

export function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 items-center gap-1 rounded-full pr-3 text-lg font-semibold text-link" aria-label="Back">
      <Icon name="back" size={26} />
      <span>{'തിരികെ'}</span>
    </button>
  )
}
