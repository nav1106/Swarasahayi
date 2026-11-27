import React from 'react'

// An original character: a small brass oil lamp whose flame is the face.
// moods: idle | listening | thinking | speaking | happy | oops
const INK = '#3A2412'

const EYES = {
  idle: [[50, 72, 3.2, 4.4], [70, 72, 3.2, 4.4]],
  listening: [[50, 72, 3.8, 5.2], [70, 72, 3.8, 5.2]],
  speaking: [[50, 72, 3.2, 4.4], [70, 72, 3.2, 4.4]],
  thinking: [[52, 69, 3.2, 4.4], [72, 69, 3.2, 4.4]],
  oops: [[50, 73, 3.2, 4.2], [70, 73, 3.2, 4.2]],
}

function Face({ mood }) {
  const eyes = EYES[mood]
  return (
    <g>
      {mood === 'happy' ? (
        <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
          <path d="M44 74 Q50 66 56 74" />
          <path d="M64 74 Q70 66 76 74" />
        </g>
      ) : (
        <g className="blink" fill={INK}>
          {eyes.map(([cx, cy, rx, ry], i) => <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />)}
        </g>
      )}
      {mood === 'oops' && (
        <g stroke={INK} strokeWidth="2.6" strokeLinecap="round">
          <path d="M44 64 L56 67" />
          <path d="M76 64 L64 67" />
        </g>
      )}
      <circle cx="43" cy="82" r="4.6" fill="#F28B82" opacity=".55" />
      <circle cx="77" cy="82" r="4.6" fill="#F28B82" opacity=".55" />
      {mood === 'happy' && <path d="M51 80 Q60 94 69 80z" fill={INK} />}
      {mood === 'speaking' && <ellipse className="talk" cx="60" cy="84" rx="5.5" ry="4.5" fill={INK} />}
      {mood === 'thinking' && <path d="M55 85 H65" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />}
      {mood === 'oops' && <path d="M54 87 Q60 80 66 87" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />}
      {(mood === 'idle' || mood === 'listening') && (
        <path d={mood === 'listening' ? 'M55 84 Q60 88 65 84' : 'M54 82 Q60 89 66 82'} fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      )}
    </g>
  )
}

export default function Mascot({ mood = 'idle', size = 96, className = '' }) {
  return (
    <svg className={`mascot ${className}`} data-mood={mood} width={size} height={(size * 140) / 120} viewBox="0 0 120 140" aria-hidden="true" focusable="false">
      <g>
        <path className="arc arc-l a1" d="M26 62 Q16 74 26 86" />
        <path className="arc arc-l a2" d="M15 55 Q1 74 15 93" />
        <path className="arc arc-r a1" d="M94 62 Q104 74 94 86" />
        <path className="arc arc-r a2" d="M105 55 Q119 74 105 93" />
      </g>
      <g className="flame">
        <path d="M60 12 C72 33 87 50 87 70 C87 87 75 99 60 99 C45 99 33 87 33 70 C33 50 48 33 60 12Z" fill="var(--c-flame)" />
        <path d="M60 45 C68 57 75 66 75 76 C75 87 69 93 60 93 C51 93 45 87 45 76 C45 66 52 57 60 45Z" fill="var(--c-flame-core)" />
        <Face mood={mood} />
      </g>
      <path d="M20 96 C20 114 38 124 60 124 C82 124 100 114 100 96z" fill="var(--c-brass)" />
      <ellipse cx="60" cy="96" rx="40" ry="7" fill="var(--c-brass-dark)" />
      <path d="M46 124 h28 l5 10 h-38z" fill="var(--c-brass-dark)" />
      {mood === 'happy' && (
        <g fill="var(--c-gold)">
          {[[20, 30], [101, 24], [106, 62]].map(([x, y], i) => (
            <path key={i} className="spark" style={{ animationDelay: `${i * 0.15}s` }} transform={`translate(${x} ${y})`} d="M0-7 L2-2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2-2z" />
          ))}
        </g>
      )}
    </svg>
  )
}
