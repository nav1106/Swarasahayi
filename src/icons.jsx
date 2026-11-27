import React from 'react'

// One consistent hand-friendly icon set: 24px grid, 2px round strokes.
const PATHS = {
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
  speaker: <><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  auto: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.4v.2" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z" />,
  thumbdown: <><path d="M17 14V4h3v10z" /><path d="M17 14l-4 6a2 2 0 0 1-2-2v-3H6.3a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.5 5H17" /></>,
  play: <path d="M8 5v14l11-7z" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>,
  chat: <path d="M4 5h16v11H10l-5 4v-4H4z" />,
  wifioff: <><path d="M1 1l22 22" /><path d="M16.7 11.1A11 11 0 0 1 19 12.6" /><path d="M5 12.6a11 11 0 0 1 5.2-2.4" /><path d="M10.7 5.1A16 16 0 0 1 22.6 9" /><path d="M1.4 9a16 16 0 0 1 4.7-2.9" /><path d="M8.5 16.1a6 6 0 0 1 7 0" /><path d="M12 20h.01" /></>,
  keyboard: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>,
  send: <path d="M4 12l16-8-6 16-3-7z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  // Trades
  fish: <><path d="M3 12c3-5 9-6 14-3l4-3v12l-4-3c-5 3-11 2-14-3z" /><circle cx="8" cy="11" r=".8" fill="currentColor" /></>,
  rickshaw: <><path d="M3 17V9l4-4h8l3 5h3v7" /><path d="M9 5v5h9" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  scissors: <><circle cx="6" cy="7" r="2.5" /><circle cx="6" cy="17" r="2.5" /><path d="M8 8.5L20 18M8 15.5L20 6" /></>,
  desk: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-4h4v4" /></>,
}

export function Icon({ name, size = 24, className = '', strokeWidth = 2, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}

export const TRADE_ICON = { fish: 'fish', auto: 'rickshaw', salon: 'scissors', office: 'desk' }
