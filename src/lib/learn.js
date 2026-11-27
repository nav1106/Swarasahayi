import { similarity, normalizeText } from './text.js'
import { lessonPhrases } from './phrases.js'

export const PASS_SCORE = 0.75
export const MAX_TRIES = 3
export const LEVELS = [1, 2, 3]

// Best score across the recogniser's alternatives.
// Whole-sentence similarity, or the share of target words heard (so a missed or added word, or an accent that
// bends one word, does not fail a phrase that was clearly said).
export function wordScore(heard, target) {
  const want = normalizeText(target).split(' ').filter(Boolean)
  const got = normalizeText(heard).split(' ').filter(Boolean)
  if (!want.length || !got.length) return 0
  const hit = want.filter((w) => got.some((g) => g === w || (w.length > 3 && similarity(g, w) >= 0.75))).length
  const ratio = (hit / want.length) * Math.min(1, got.length / want.length + 0.25)
  // Short phrases need every word; longer ones may miss one.
  const lenient = hit === want.length || (want.length >= 5 && hit >= want.length - 1)
  return lenient ? ratio : Math.min(ratio, 0.7)
}

export function scoreAttempt(target, alternatives) {
  return alternatives.reduce((best, a) => Math.max(best, similarity(a.transcript, target), wordScore(a.transcript, target)), 0)
}

// progress: { [phraseId]: { passed: boolean, retry?: boolean } }
export function levelStats(trade, level, progress) {
  const phrases = lessonPhrases(trade, level)
  const passed = phrases.filter((p) => progress[p.id]?.passed).length
  return { total: phrases.length, passed }
}

// A level unlocks once 80% (rounded down) of the previous level is passed.
export function isLevelUnlocked(trade, level, progress) {
  if (level === 1) return true
  const prev = levelStats(trade, level - 1, progress)
  return prev.total > 0 && prev.passed >= Math.floor(prev.total * 0.8)
}
