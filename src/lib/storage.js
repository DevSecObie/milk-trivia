// storage.js — Firestore-backed with local cache
// All data lives in Firestore under users/{uid}
// Local cache in memory for fast reads during a session

import { getUserData, saveUserData, addSession as fsAddSession } from './firestoreService'

let _uid = null
let _cache = null
let _saveTimer = null

const DEFAULTS = {
  xp: { total: 0, level: 1, title: 'Beginner' },
  sessions: [],
  missed: [],
  questionStats: {},
  streak: { current: 0, best: 0, lastDate: null },
  settings: { mode: 'mc', numQuestions: 50, range: 'all', shuffle: true, confirmBeforeSubmit: true, categories: [] },
  sound: true,
  theme: 'dark',
  dailyGoal: 20,
  dailyProgress: { date: null, count: 0 },
  qotdHistory: { date: null, questionNum: null, answered: false, correct: null },
  levelUp: {},
  achievements: [],
  survivalBest: 0,
  speedBest: 0,
  dailyGoalDays: 0,
  activeGame: null,
}

// Debounced save to Firestore
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    if (_uid && _cache) {
      saveUserData(_uid, _cache).catch(e => console.error('Firestore save error:', e))
    }
  }, 2000)
}

function getVal(key) {
  if (!_cache) return DEFAULTS[key]
  return _cache[key] ?? DEFAULTS[key]
}

function setVal(key, value) {
  if (!_cache) _cache = {}
  _cache[key] = value
  scheduleSave()
}

// ===== INIT: Load from Firestore =====
export async function initStorage(uid) {
  _uid = uid
  const data = await getUserData(uid)
  _cache = data || { ...DEFAULTS }
  return _cache
}

export function isStorageReady() {
  return _cache !== null
}

// Force save now
export async function flushStorage() {
  if (_saveTimer) clearTimeout(_saveTimer)
  if (_uid && _cache) await saveUserData(_uid, _cache)
}

// ===== SESSION HISTORY =====
export function saveSessions(session) {
  const sessions = getVal('sessions') || []
  sessions.push({ ...session, date: new Date().toISOString() })
  if (sessions.length > 100) sessions.splice(0, sessions.length - 100)
  setVal('sessions', sessions)
  // Also update totals
  _cache.totalAnswered = (_cache.totalAnswered || 0) + session.total
  _cache.totalCorrect = (_cache.totalCorrect || 0) + session.score
  scheduleSave()
}

export function getSessions() { return getVal('sessions') || [] }

// ===== QUESTION-LEVEL STATS =====
export function recordQuestionResult(questionNum, correct) {
  const stats = { ...getVal('questionStats') }
  if (!stats[questionNum]) stats[questionNum] = { attempts: 0, correct: 0, wrong: 0 }
  stats[questionNum].attempts++
  if (correct) stats[questionNum].correct++
  else stats[questionNum].wrong++
  setVal('questionStats', stats)
}

export function getQuestionStats() { return getVal('questionStats') || {} }

export function getWeightedQuestions(questions) {
  const stats = getVal('questionStats') || {}
  return [...questions].sort((a, b) => {
    const sa = stats[a.n] || { wrong: 0, attempts: 0 }
    const sb = stats[b.n] || { wrong: 0, attempts: 0 }
    return (sb.attempts > 0 ? sb.wrong / sb.attempts : 0.5) - (sa.attempts > 0 ? sa.wrong / sa.attempts : 0.5)
  })
}

// ===== MISSED =====
export function addMissed(n) { const m = [...getVal('missed')]; if (!m.includes(n)) { m.push(n); setVal('missed', m) } }
export function removeMissed(n) { setVal('missed', getVal('missed').filter(x => x !== n)) }
export function getMissed() { return getVal('missed') || [] }
export function clearMissed() { setVal('missed', []) }

// ===== STREAK =====
export function updateStreak() {
  const streak = { ...getVal('streak') }
  const today = new Date().toISOString().split('T')[0]
  if (streak.lastDate === today) return streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  streak.current = streak.lastDate === yesterday ? streak.current + 1 : 1
  streak.lastDate = today
  if (streak.current > streak.best) streak.best = streak.current
  setVal('streak', streak)
  return streak
}
export function getStreak() { return getVal('streak') || { current: 0, best: 0, lastDate: null } }

// ===== ACTIVE GAME =====
export function saveActiveGame(state) { setVal('activeGame', state) }
export function getActiveGame() { return getVal('activeGame') }
export function clearActiveGame() { setVal('activeGame', null) }

// ===== SETTINGS =====
export function getSettings() { return getVal('settings') || DEFAULTS.settings }
export function saveSettings(s) { setVal('settings', s) }

// ===== SOUND / THEME =====
export function isSoundOn() { return getVal('sound') ?? true }
export function setSoundPref(on) { setVal('sound', on) }
export function getTheme() {
  // Theme can be read before Firestore loads — use localStorage as fallback
  if (_cache) return _cache.theme ?? 'dark'
  try { const v = localStorage.getItem('mq_theme'); return v ? JSON.parse(v) : 'dark' } catch { return 'dark' }
}
export function setThemePref(theme) {
  setVal('theme', theme)
  try { localStorage.setItem('mq_theme', JSON.stringify(theme)) } catch {}
}

// ===== DAILY GOAL =====
export function getDailyGoal() { return getVal('dailyGoal') || 20 }
export function setDailyGoal(g) { setVal('dailyGoal', g) }
export function getDailyProgress() {
  const data = getVal('dailyProgress') || { date: null, count: 0 }
  const today = new Date().toISOString().split('T')[0]
  if (data.date !== today) return { date: today, count: 0 }
  return data
}
export function addDailyProgress(n) {
  const today = new Date().toISOString().split('T')[0]
  const data = getVal('dailyProgress') || { date: null, count: 0 }
  if (data.date !== today) setVal('dailyProgress', { date: today, count: n })
  else { data.count += n; setVal('dailyProgress', data) }
}

// ===== QOTD =====
export function getQOTD(totalQuestions) {
  const today = new Date().toISOString().split('T')[0]
  const h = getVal('qotdHistory') || { date: null, questionNum: null, answered: false, correct: null }
  if (h.date === today) return h
  const seed = today.split('-').join('')
  const num = (parseInt(seed) % totalQuestions) + 1
  const qotd = { date: today, questionNum: num, answered: false, correct: null }
  setVal('qotdHistory', qotd)
  return qotd
}
export function markQOTDAnswered(correct) {
  const today = new Date().toISOString().split('T')[0]
  const h = getVal('qotdHistory') || { date: today, questionNum: 1, answered: false, correct: null }
  h.answered = true; h.correct = correct
  setVal('qotdHistory', h)
}

// ===== LEVEL UP =====
export function getLevelUpProgress() { return getVal('levelUp') || {} }
export function updateLevelUp(category, correct) {
  const progress = { ...getVal('levelUp') }
  if (!progress[category]) progress[category] = { level: 1, questionsCorrect: 0, questionsAttempted: 0 }
  const cat = progress[category]
  cat.questionsAttempted++
  if (correct) cat.questionsCorrect++
  const thresholds = [0, 5, 10, 15, 20, 30]
  const next = thresholds[cat.level] || 30
  if (cat.questionsCorrect >= next && cat.level < 5) cat.level++
  setVal('levelUp', progress)
  return progress
}
export function getCategoryMastery(questionStats, allQuestions) {
  const catStats = {}
  allQuestions.forEach(q => {
    const stat = questionStats[q.n]
    ;(q.categories || []).forEach(c => {
      if (!catStats[c]) catStats[c] = { total: 0, attempted: 0, correct: 0 }
      catStats[c].total++
      if (stat) { catStats[c].attempted += stat.attempts; catStats[c].correct += stat.correct }
    })
  })
  return catStats
}

// ===== XP =====
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
export { RANKS }

export function getXP() { return getVal('xp') || { total: 0, level: 1, title: 'Beginner' } }
export function addXP(amount) {
  const xp = { ...getVal('xp') }
  xp.total += amount
  let newRank = RANKS[0]
  for (const r of RANKS) { if (xp.total >= r.xpNeeded) newRank = r; else break }
  const leveledUp = newRank.level > xp.level
  xp.level = newRank.level; xp.title = newRank.title
  setVal('xp', xp)
  return { ...xp, leveledUp, nextRank: RANKS[newRank.level] || null }
}
export function getXPForAction(action) {
  return { correct: 10, incorrect: 2, perfectGame: 50, streak3: 15, streak5: 30, streak10: 75, dailyGoal: 40, survivalRecord: 100, speedRound: 25, firstGame: 50 }[action] || 0
}

// ===== SURVIVAL / SPEED =====
export function getSurvivalBest() { return getVal('survivalBest') || 0 }
export function setSurvivalBest(val) { if (val > (getVal('survivalBest') || 0)) setVal('survivalBest', val) }
export function getSpeedBest() { return getVal('speedBest') || 0 }
export function setSpeedBest(val) { if (val > (getVal('speedBest') || 0)) setVal('speedBest', val) }
export function incrementDailyGoalDays() { setVal('dailyGoalDays', (getVal('dailyGoalDays') || 0) + 1) }

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

export function getAchievements() { return getVal('achievements') || [] }
export function checkAchievements() {
  const unlocked = [...(getVal('achievements') || [])]
  const sessions = getSessions()
  const streak = getStreak()
  const xp = getXP()
  const missed = getMissed()
  const stats = {
    sessions, totalAnswered: sessions.reduce((s, x) => s + x.total, 0), streak, xpLevel: xp.level,
    missedCount: missed.length, hadMissed: sessions.length > 0, survivalBest: getVal('survivalBest') || 0,
    speedBest: getVal('speedBest') || 0, modesPlayed: new Set(sessions.map(s => s.mode)), dailyGoalDays: getVal('dailyGoalDays') || 0,
  }
  const newlyUnlocked = []
  for (const ach of ACHIEVEMENT_DEFS) {
    if (!unlocked.includes(ach.id) && ach.check(stats)) { unlocked.push(ach.id); newlyUnlocked.push(ach) }
  }
  if (newlyUnlocked.length > 0) setVal('achievements', unlocked)
  return { unlocked, newlyUnlocked, all: ACHIEVEMENT_DEFS }
}

// ===== CLEAR ALL =====
export function clearAllData() {
  _cache = { ...DEFAULTS }
  scheduleSave()
}
