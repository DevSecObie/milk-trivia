const KEYS = {
  SESSIONS: 'mq_sessions',
  MISSED: 'mq_missed',
  QUESTION_STATS: 'mq_qstats',
  STREAK: 'mq_streak',
  SETTINGS: 'mq_settings',
  ACTIVE_GAME: 'mq_active_game',
  SOUND: 'mq_sound',
  THEME: 'mq_theme',
}

function get(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function set(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ===== SESSION HISTORY =====
export function saveSessions(session) {
  // session: { date, mode, score, total, pct, timeSeconds, categories }
  const sessions = get(KEYS.SESSIONS, [])
  sessions.push({ ...session, date: new Date().toISOString() })
  // Keep last 100 sessions
  if (sessions.length > 100) sessions.splice(0, sessions.length - 100)
  set(KEYS.SESSIONS, sessions)
}

export function getSessions() {
  return get(KEYS.SESSIONS, [])
}

// ===== QUESTION-LEVEL STATS (for difficulty weighting) =====
export function recordQuestionResult(questionNum, correct) {
  const stats = get(KEYS.QUESTION_STATS, {})
  if (!stats[questionNum]) stats[questionNum] = { attempts: 0, correct: 0, wrong: 0 }
  stats[questionNum].attempts++
  if (correct) stats[questionNum].correct++
  else stats[questionNum].wrong++
  set(KEYS.QUESTION_STATS, stats)
}

export function getQuestionStats() {
  return get(KEYS.QUESTION_STATS, {})
}

// Get difficulty-weighted questions (most missed first)
export function getWeightedQuestions(questions) {
  const stats = get(KEYS.QUESTION_STATS, {})
  return [...questions].sort((a, b) => {
    const sa = stats[a.n] || { wrong: 0, attempts: 0 }
    const sb = stats[b.n] || { wrong: 0, attempts: 0 }
    const ra = sa.attempts > 0 ? sa.wrong / sa.attempts : 0.5
    const rb = sb.attempts > 0 ? sb.wrong / sb.attempts : 0.5
    return rb - ra // Higher miss rate first
  })
}

// ===== MISSED QUESTIONS BANK =====
export function addMissed(questionNum) {
  const missed = get(KEYS.MISSED, [])
  if (!missed.includes(questionNum)) {
    missed.push(questionNum)
    set(KEYS.MISSED, missed)
  }
}

export function removeMissed(questionNum) {
  const missed = get(KEYS.MISSED, [])
  set(KEYS.MISSED, missed.filter(n => n !== questionNum))
}

export function getMissed() {
  return get(KEYS.MISSED, [])
}

export function clearMissed() {
  set(KEYS.MISSED, [])
}

// ===== STREAK TRACKING =====
export function updateStreak() {
  const streak = get(KEYS.STREAK, { current: 0, best: 0, lastDate: null })
  const today = new Date().toISOString().split('T')[0]

  if (streak.lastDate === today) return streak // Already studied today

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (streak.lastDate === yesterday) {
    streak.current++
  } else {
    streak.current = 1
  }
  streak.lastDate = today
  if (streak.current > streak.best) streak.best = streak.current
  set(KEYS.STREAK, streak)
  return streak
}

export function getStreak() {
  return get(KEYS.STREAK, { current: 0, best: 0, lastDate: null })
}

// ===== ACTIVE GAME (resume) =====
export function saveActiveGame(state) {
  set(KEYS.ACTIVE_GAME, state)
}

export function getActiveGame() {
  return get(KEYS.ACTIVE_GAME, null)
}

export function clearActiveGame() {
  localStorage.removeItem(KEYS.ACTIVE_GAME)
}

// ===== SETTINGS =====
export function getSettings() {
  return get(KEYS.SETTINGS, {
    mode: 'mc',
    numQuestions: 50,
    range: 'all',
    shuffle: true,
    confirmBeforeSubmit: true,
    categories: [],
  })
}

export function saveSettings(settings) {
  set(KEYS.SETTINGS, settings)
}

// ===== SOUND =====
export function isSoundOn() {
  return get(KEYS.SOUND, true)
}

export function setSoundPref(on) {
  set(KEYS.SOUND, on)
}

// ===== THEME =====
export function getTheme() {
  return get(KEYS.THEME, 'dark')
}

export function setThemePref(theme) {
  set(KEYS.THEME, theme)
}

// ===== CLEAR ALL =====
export function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
