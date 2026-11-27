import { similarity } from './text.js'
import { lessonPhrases } from './phrases.js'

export const PASS_SCORE = 0.8
export const MAX_TRIES = 3
export const LEVELS = [1, 2, 3]

// Best score across the recogniser's alternatives.
export function scoreAttempt(target, alternatives) {
  return alternatives.reduce((best, a) => Math.max(best, similarity(a.transcript, target)), 0)
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
