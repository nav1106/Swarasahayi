// Noise and volume check using the microphone level. Optional: if the mic cannot be shared
// with speech recognition on a device, the meter simply stays off.

// floor = typical background level, peak = loudest moment. Both 0..1.
export function classifyLevels({ floor, peak }) {
  if (peak < 0.02) return 'quiet'
  if (floor > 0.08 || (peak > 0 && floor / peak > 0.6 && floor > 0.04)) return 'noisy'
  return 'ok'
}

export async function startMeter(onLevel) {
  if (!navigator.mediaDevices?.getUserMedia) return null
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
    })
  } catch {
    return null
  }
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  const buf = new Float32Array(analyser.fftSize)
  const samples = []
  const started = performance.now()
  let raf
  const tick = () => {
    analyser.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    const level = Math.sqrt(sum / buf.length)
    samples.push({ t: performance.now() - started, level })
    onLevel?.(level)
    raf = requestAnimationFrame(tick)
  }
  tick()
  return {
    stop() {
      cancelAnimationFrame(raf)
      stream.getTracks().forEach((t) => t.stop())
      ctx.close().catch(() => {})
      const early = samples.filter((s) => s.t < 400).map((s) => s.level)
      const floor = early.length ? early.reduce((a, b) => a + b, 0) / early.length : 0
      const peak = samples.reduce((m, s) => Math.max(m, s.level), 0)
      return { floor, peak, verdict: classifyLevels({ floor, peak }) }
    },
  }
}
