const KEYS = {
  SESSIONS: 'mq_sessions',
  MISSED: 'mq_missed',
  QUESTION_STATS: 'mq_qstats',
  STREAK: 'mq_streak',
  SETTINGS: 'mq_settings',
  ACTIVE_GAME: 'mq_active_game',
  SOUND: 'mq_sound',
  THEME: 'mq_theme',
  DAILY_GOAL: 'mq_daily_goal',
  DAILY_PROGRESS: 'mq_daily_progress',
  QOTD_HISTORY: 'mq_qotd_history',
  LEVEL_UP: 'mq_level_up',
  XP: 'mq_xp',
  ACHIEVEMENTS: 'mq_achievements',
  SURVIVAL_BEST: 'mq_survival_best',
  SPEED_BEST: 'mq_speed_best',
  DAILY_GOAL_DAYS: 'mq_daily_goal_days',
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

// ===== DAILY STUDY GOAL =====
export function getDailyGoal() {
  return get(KEYS.DAILY_GOAL, 20) // default 20 questions per day
}

export function setDailyGoal(goal) {
  set(KEYS.DAILY_GOAL, goal)
}

export function getDailyProgress() {
  const data = get(KEYS.DAILY_PROGRESS, { date: null, count: 0 })
  const today = new Date().toISOString().split('T')[0]
  if (data.date !== today) return { date: today, count: 0 }
  return data
}

export function addDailyProgress(numAnswered) {
  const today = new Date().toISOString().split('T')[0]
  const data = get(KEYS.DAILY_PROGRESS, { date: null, count: 0 })
  if (data.date !== today) {
    set(KEYS.DAILY_PROGRESS, { date: today, count: numAnswered })
  } else {
    data.count += numAnswered
    set(KEYS.DAILY_PROGRESS, data)
  }
}

// ===== QUESTION OF THE DAY =====
export function getQOTD(totalQuestions) {
  const today = new Date().toISOString().split('T')[0]
  const history = get(KEYS.QOTD_HISTORY, { date: null, questionNum: null, answered: false, correct: null })
  if (history.date === today) return history
  // Generate deterministic QOTD based on date
  const seed = today.split('-').join('')
  const num = (parseInt(seed) % totalQuestions) + 1
  const qotd = { date: today, questionNum: num, answered: false, correct: null }
  set(KEYS.QOTD_HISTORY, qotd)
  return qotd
}

export function markQOTDAnswered(correct) {
  const today = new Date().toISOString().split('T')[0]
  const history = get(KEYS.QOTD_HISTORY, { date: today, questionNum: 1, answered: false, correct: null })
  history.answered = true
  history.correct = correct
  set(KEYS.QOTD_HISTORY, history)
}

// ===== LEVEL UP (Progressive Mastery) =====
export function getLevelUpProgress() {
  return get(KEYS.LEVEL_UP, {})
  // Structure: { [category]: { level: 0-5, questionsCorrect: 0, questionsAttempted: 0, unlocked: true/false } }
}

export function updateLevelUp(category, correct) {
  const progress = get(KEYS.LEVEL_UP, {})
  if (!progress[category]) {
    progress[category] = { level: 1, questionsCorrect: 0, questionsAttempted: 0 }
  }
  const cat = progress[category]
  cat.questionsAttempted++
  if (correct) cat.questionsCorrect++

  // Level up thresholds: need X correct answers at each level to advance
  const thresholds = [0, 5, 10, 15, 20, 30] // questions needed per level
  const nextThreshold = thresholds[cat.level] || 30
  if (cat.questionsCorrect >= nextThreshold && cat.level < 5) {
    cat.level++
  }
  set(KEYS.LEVEL_UP, progress)
  return progress
}

export function getCategoryMastery(questionStats, allQuestions) {
  // Compute mastery % per category
  const catStats = {}
  allQuestions.forEach(q => {
    const cats = q.categories || []
    const stat = questionStats[q.n]
    cats.forEach(c => {
      if (!catStats[c]) catStats[c] = { total: 0, attempted: 0, correct: 0 }
      catStats[c].total++
      if (stat) {
        catStats[c].attempted += stat.attempts
        catStats[c].correct += stat.correct
      }
    })
  })
  return catStats
}

// ===== XP / RANK / LEVELS =====
export function getXP() {
  return get(KEYS.XP, { total: 0, level: 1, title: 'Beginner' })
}

const RANKS = [
  { level: 1, title: 'Beginner', xpNeeded: 0 },
  { level: 2, title: 'Student', xpNeeded: 100 },
  { level: 3, title: 'Learner', xpNeeded: 300 },
  { level: 4, title: 'Scholar', xpNeeded: 600 },
  { level: 5, title: 'Disciple', xpNeeded: 1000 },
  { level: 6, title: 'Teacher', xpNeeded: 1500 },
  { level: 7, title: 'Elder', xpNeeded: 2200 },
  { level: 8, title: 'Scribe', xpNeeded: 3000 },
  { level: 9, title: 'Prophet', xpNeeded: 4000 },
  { level: 10, title: 'Apostle', xpNeeded: 5500 },
  { level: 11, title: 'Evangelist', xpNeeded: 7500 },
  { level: 12, title: 'Shepherd', xpNeeded: 10000 },
  { level: 13, title: 'Watchman', xpNeeded: 13000 },
  { level: 14, title: 'Priest', xpNeeded: 17000 },
  { level: 15, title: 'High Priest', xpNeeded: 22000 },
]

export function addXP(amount) {
  const xp = get(KEYS.XP, { total: 0, level: 1, title: 'Beginner' })
  xp.total += amount
  // Determine level
  let newRank = RANKS[0]
  for (const r of RANKS) {
    if (xp.total >= r.xpNeeded) newRank = r
    else break
  }
  const leveledUp = newRank.level > xp.level
  xp.level = newRank.level
  xp.title = newRank.title
  set(KEYS.XP, xp)
  return { ...xp, leveledUp, nextRank: RANKS[newRank.level] || null }
}

export function getXPForAction(action) {
  const xpMap = {
    correct: 10, incorrect: 2, perfectGame: 50, streak3: 15, streak5: 30, streak10: 75,
    dailyGoal: 40, survivalRecord: 100, speedRound: 25, firstGame: 50,
  }
  return xpMap[action] || 0
}

export { RANKS }

// ===== ACHIEVEMENTS =====
const ACHIEVEMENT_DEFS = [
  { id: 'first_game', name: 'First Steps', desc: 'Complete your first quiz', icon: '🏁', check: (s) => s.sessions.length >= 1 },
  { id: 'ten_games', name: 'Dedicated', desc: 'Complete 10 quizzes', icon: '📚', check: (s) => s.sessions.length >= 10 },
  { id: 'fifty_games', name: 'Scholar', desc: 'Complete 50 quizzes', icon: '🎓', check: (s) => s.sessions.length >= 50 },
  { id: 'hundred_qs', name: 'Century', desc: 'Answer 100 questions', icon: '💯', check: (s) => s.totalAnswered >= 100 },
  { id: 'five_hundred_qs', name: 'Warrior', desc: 'Answer 500 questions', icon: '⚔', check: (s) => s.totalAnswered >= 500 },
  { id: 'thousand_qs', name: 'Mighty', desc: 'Answer 1000 questions', icon: '🏆', check: (s) => s.totalAnswered >= 1000 },
  { id: 'perfect_10', name: 'Perfect 10', desc: 'Score 100% on a 10+ question quiz', icon: '✨', check: (s) => s.sessions.some(x => x.pct === 100 && x.total >= 10) },
  { id: 'streak_7', name: 'Week Warrior', desc: '7-day study streak', icon: '🔥', check: (s) => s.streak.best >= 7 },
  { id: 'streak_30', name: 'Monthly Master', desc: '30-day study streak', icon: '🌟', check: (s) => s.streak.best >= 30 },
  { id: 'survival_10', name: 'Survivor', desc: 'Answer 10 in Survival Mode', icon: '🛡', check: (s) => s.survivalBest >= 10 },
  { id: 'survival_25', name: 'Iron Will', desc: 'Answer 25 in Survival Mode', icon: '💪', check: (s) => s.survivalBest >= 25 },
  { id: 'speed_20', name: 'Lightning', desc: 'Answer 20+ in Speed Round', icon: '⚡', check: (s) => s.speedBest >= 20 },
  { id: 'all_modes', name: 'Explorer', desc: 'Play every game mode', icon: '🗺', check: (s) => s.modesPlayed.size >= 8 },
  { id: 'daily_goal_5', name: 'Consistent', desc: 'Hit daily goal 5 days', icon: '📅', check: (s) => s.dailyGoalDays >= 5 },
  { id: 'level_5', name: 'Rising Star', desc: 'Reach level 5', icon: '⭐', check: (s) => s.xpLevel >= 5 },
  { id: 'level_10', name: 'Pillar', desc: 'Reach level 10', icon: '🏛', check: (s) => s.xpLevel >= 10 },
  { id: 'mock_pass', name: 'Exam Ready', desc: 'Score 80%+ on Mock Exam', icon: '📝', check: (s) => s.sessions.some(x => x.mode === 'mock' && x.pct >= 80) },
  { id: 'no_missed', name: 'Clean Slate', desc: 'Clear all missed questions', icon: '✅', check: (s) => s.hadMissed && s.missedCount === 0 },
]

export function getAchievements() {
  return get(KEYS.ACHIEVEMENTS, []) // array of achievement ids
}

export function checkAchievements() {
  const unlocked = get(KEYS.ACHIEVEMENTS, [])
  const sessions = getSessions()
  const streak = getStreak()
  const xp = getXP()
  const missed = getMissed()

  const stats = {
    sessions,
    totalAnswered: sessions.reduce((s, x) => s + x.total, 0),
    streak,
    xpLevel: xp.level,
    missedCount: missed.length,
    hadMissed: sessions.length > 0,
    survivalBest: get(KEYS.SURVIVAL_BEST, 0),
    speedBest: get(KEYS.SPEED_BEST, 0),
    modesPlayed: new Set(sessions.map(s => s.mode)),
    dailyGoalDays: get(KEYS.DAILY_GOAL_DAYS, 0),
  }

  const newlyUnlocked = []
  for (const ach of ACHIEVEMENT_DEFS) {
    if (!unlocked.includes(ach.id) && ach.check(stats)) {
      unlocked.push(ach.id)
      newlyUnlocked.push(ach)
    }
  }

  if (newlyUnlocked.length > 0) {
    set(KEYS.ACHIEVEMENTS, unlocked)
  }

  return { unlocked, newlyUnlocked, all: ACHIEVEMENT_DEFS }
}

export function getSurvivalBest() { return get(KEYS.SURVIVAL_BEST, 0) }
export function setSurvivalBest(val) { const cur = get(KEYS.SURVIVAL_BEST, 0); if (val > cur) set(KEYS.SURVIVAL_BEST, val) }
export function getSpeedBest() { return get(KEYS.SPEED_BEST, 0) }
export function setSpeedBest(val) { const cur = get(KEYS.SPEED_BEST, 0); if (val > cur) set(KEYS.SPEED_BEST, val) }
export function incrementDailyGoalDays() {
  const days = get(KEYS.DAILY_GOAL_DAYS, 0)
  set(KEYS.DAILY_GOAL_DAYS, days + 1)
}

// ===== CLEAR ALL =====
export function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
