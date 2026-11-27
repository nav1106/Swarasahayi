// What to do with a recognition result, based on its confidence.
export const THRESHOLDS = { reject: 0.6, confirm: 0.75 }
// Browsers sometimes report 0 or nothing when confidence is unknown.
const UNKNOWN_CONFIDENCE = 0.8

export function effectiveConfidence(c) {
  return typeof c === 'number' && c > 0 ? c : UNKNOWN_CONFIDENCE
}

// kind: empty (ask again) | confirm (ask "is this what you meant?") | ok (go ahead)
export function decideAction(transcript, confidence) {
  if (!transcript || !transcript.trim()) return { kind: 'empty', confidence: 0 }
  const c = effectiveConfidence(confidence)
  if (c < THRESHOLDS.reject) return { kind: 'empty', confidence: c }
  if (c < THRESHOLDS.confirm) return { kind: 'confirm', confidence: c }
  return { kind: 'ok', confidence: c }
}
