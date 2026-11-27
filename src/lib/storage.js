// Everything stays on the phone (localStorage). Audio is never stored.
const KEY = 'swarasahayi.v1'

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}
function writeAll(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* private mode or full */ }
}

export const load = (name, fallback) => readAll()[name] ?? fallback
export function save(name, value) {
  const all = readAll()
  all[name] = value
  writeAll(all)
}
export function appendFeedback(entry) {
  const log = load('feedback', [])
  log.push({ ...entry, at: new Date().toISOString() })
  save('feedback', log.slice(-500))
}
