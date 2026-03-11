let audioCtx = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

export function playCorrect() {
  playTone(523, 0.1, 'sine', 0.12) // C5
  setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 80) // E5
  setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 160) // G5
}

export function playIncorrect() {
  playTone(311, 0.15, 'square', 0.08)
  setTimeout(() => playTone(277, 0.2, 'square', 0.06), 120)
}

export function playClick() {
  playTone(800, 0.03, 'sine', 0.05)
}

export function playSuccess() {
  playTone(523, 0.08, 'sine', 0.1)
  setTimeout(() => playTone(659, 0.08, 'sine', 0.1), 60)
  setTimeout(() => playTone(784, 0.08, 'sine', 0.1), 120)
  setTimeout(() => playTone(1047, 0.2, 'sine', 0.08), 180)
}
