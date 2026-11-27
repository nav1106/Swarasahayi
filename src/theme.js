// Theme: follows the phone by default ("auto"); the user can force light or dark.
const KEY = 'swarasahayi.theme'
const META = { light: '#FFF4DC', dark: '#1B130D' }

export const THEMES = ['auto', 'light', 'dark']

export function getPref() {
  try {
    const v = localStorage.getItem(KEY)
    return THEMES.includes(v) ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export function resolveTheme(pref, prefersDark) {
  if (pref === 'light' || pref === 'dark') return pref
  return prefersDark ? 'dark' : 'light'
}

export function applyTheme(pref) {
  const dark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  const theme = resolveTheme(pref, dark)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme])
  return theme
}

export function savePref(pref) {
  try { localStorage.setItem(KEY, pref) } catch { /* private mode */ }
  return applyTheme(pref)
}
