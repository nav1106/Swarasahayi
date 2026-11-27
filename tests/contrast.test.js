import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Reads the real colour tokens from index.css so the test cannot drift from the design.
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

function tokens(selector) {
  const block = css.split(selector)[1].split('}')[0]
  return Object.fromEntries([...block.matchAll(/--c-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))
}
const light = tokens(':root {')
const dark = tokens(':root[data-theme="dark"] {')

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Text pairs that actually appear in the app. WCAG AA needs 4.5 for normal text.
const PAIRS = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface2'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface2'],
  ['on-primary', 'primary'],
  ['success', 'success-bg'], ['danger', 'danger-bg'], ['ink', 'danger-bg'],
  ['link', 'bg'], ['link', 'surface'], ['link', 'surface2'],
]

describe.each([['light', light], ['dark', dark]])('%s theme contrast', (_name, t) => {
  it('defines every token', () => {
    for (const k of new Set(PAIRS.flat())) expect(t[k], k).toBeTruthy()
  })
  it.each(PAIRS)('%s on %s meets WCAG AA', (fg, bg) => {
    expect(ratio(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
  })
})
