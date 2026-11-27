// Shared text helpers: normalisation and similarity.

const ZERO_WIDTH = /[​‌‍﻿]/g
const PUNCT = /[.,!?;:।"'“”‘’()\[\]{}]/g

export function normalizeText(s = '') {
  return s
    .normalize('NFC')
    .replace(ZERO_WIDTH, '')
    .toLowerCase()
    .replace(PUNCT, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = cur
  }
  return prev[b.length]
}

// 1 = identical, 0 = completely different (on normalised text).
export function similarity(a, b) {
  const x = normalizeText(a)
  const y = normalizeText(b)
  if (!x.length && !y.length) return 1
  const longest = Math.max(x.length, y.length)
  return 1 - levenshtein(x, y) / longest
}
