// ─── LocalStorage helper with JSON safety ──────────────────
const get = (key) => { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } }
const set = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* quota */ } }

// ─── In-progress quiz state  ────────────────────────────────
export const saveQuizProgress = (state) => set('cj_quiz_progress', state)
export const loadQuizProgress = () => get('cj_quiz_progress')
export const clearQuizProgress = () => localStorage.removeItem('cj_quiz_progress')

// ─── Session history ────────────────────────────────────────
export function saveSession(session) {
  // session: { date, mode, score, total, pct, timeTakenSec, range, missed:[questionNumbers] }
  const hist = get('cj_sessions') || []
  hist.push({ ...session, id: Date.now() })
  set('cj_sessions', hist)
}
export const getSessions = () => get('cj_sessions') || []
export const clearSessions = () => localStorage.removeItem('cj_sessions')

// ─── Streak tracking ───────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10) }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
}

export function recordStudyDay() {
  const streak = get('cj_streak') || { current: 0, best: 0, lastDate: '' }
  const today = todayStr()
  if (streak.lastDate === today) return streak // already recorded today
  if (streak.lastDate === yesterdayStr()) {
    streak.current += 1
  } else {
    streak.current = 1
  }
  streak.lastDate = today
  if (streak.current > streak.best) streak.best = streak.current
  set('cj_streak', streak)
  return streak
}

export function getStreak() {
  const streak = get('cj_streak') || { current: 0, best: 0, lastDate: '' }
  // If last study date was before yesterday, streak is broken
  const today = todayStr()
  if (streak.lastDate !== today && streak.lastDate !== yesterdayStr()) {
    streak.current = 0
  }
  return streak
}

// ─── Missed questions bank ──────────────────────────────────
export function addMissedQuestions(questionNumbers) {
  const missed = get('cj_missed') || {}
  questionNumbers.forEach(n => {
    missed[n] = (missed[n] || 0) + 1
  })
  set('cj_missed', missed)
}

export function removeMissedQuestion(n) {
  const missed = get('cj_missed') || {}
  delete missed[n]
  set('cj_missed', missed)
}

export function getMissedQuestions() {
  return get('cj_missed') || {} // { questionNumber: timesWrong }
}

export function clearMissedQuestions() {
  localStorage.removeItem('cj_missed')
}

// ─── Per-question difficulty weight ─────────────────────────
// Stores { [questionNumber]: { wrong: N, right: N } }
export function recordAnswer(questionNumber, isCorrect) {
  const weights = get('cj_weights') || {}
  if (!weights[questionNumber]) weights[questionNumber] = { wrong: 0, right: 0 }
  if (isCorrect) weights[questionNumber].right += 1
  else weights[questionNumber].wrong += 1
  set('cj_weights', weights)
}

export function getWeights() {
  return get('cj_weights') || {}
}

// Returns array of question objects sorted by difficulty weight (most missed first)
export function weightedShuffle(pool) {
  const weights = getWeights()
  // Score = wrong - right (higher = harder for user)
  const scored = pool.map(q => {
    const w = weights[q.n] || { wrong: 0, right: 0 }
    const difficulty = w.wrong - w.right
    // Add randomness so it's not deterministic
    return { q, score: difficulty + (Math.random() * 2 - 0.5) }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.q)
}

// ─── Theme preference ───────────────────────────────────────
export const getTheme = () => get('cj_theme') || 'dark'
export const setTheme = (t) => set('cj_theme', t)

// ─── Sound preference ───────────────────────────────────────
export const getSoundEnabled = () => { const v = get('cj_sound'); return v === null ? true : v }
export const setSoundEnabled = (v) => set('cj_sound', v)

// ─── Category tags ──────────────────────────────────────────
// Manually curated category tags by question number ranges / topics
const CATEGORY_MAP = buildCategoryMap()

function buildCategoryMap() {
  // Based on common themes in the 240 Milk Questions
  const map = {}
  const assign = (nums, cat) => nums.forEach(n => {
    if (!map[n]) map[n] = []
    map[n].push(cat)
  })
  // Foundational / Identity
  assign([1,2,3,4,5,6,7,8,9,10,11,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30], 'Identity & Covenant')
  // Laws / Commandments
  assign([31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,233,236,237], 'Laws & Commandments')
  // Sabbath
  assign([61,62,63,64,65,66,67,68,69,70,231,238], 'Sabbath & Holy Days')
  // Prophecy
  assign([71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90], 'Prophecy')
  // Dietary Laws
  assign([91,92,93,94,95,96,97,98,99,100,233], 'Dietary Laws')
  // Christ / Messiah
  assign([101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,14,229,232,238], 'Christ & Messiah')
  // History / Nations
  assign([116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,12], 'History & Nations')
  // Prayer & Worship
  assign([131,132,133,134,135,136,137,138,139,140,240], 'Prayer & Worship')
  // Sin & Repentance
  assign([141,142,143,144,145,146,147,148,149,150,13], 'Sin & Repentance')
  // Family & Relationships
  assign([151,152,153,154,155,156,157,158,159,160,239], 'Family & Relationships')
  // End Times / Judgment
  assign([161,162,163,164,165,166,167,168,169,170,234,235], 'End Times & Judgment')
  // Apostles / Disciples
  assign([171,172,173,174,175,176,177,178,179,180,230], 'Apostles & Disciples')
  // Apocrypha / Wisdom
  assign([181,182,183,184,185,186,187,188,189,190], 'Apocrypha & Wisdom')
  // Precepts / General
  assign([191,192,193,194,195,196,197,198,199,200], 'Precepts')
  // Remaining in general
  for (let i = 201; i <= 228; i++) {
    if (!map[i]) map[i] = ['General Knowledge']
  }
  // Fill any gaps
  for (let i = 1; i <= 240; i++) {
    if (!map[i]) map[i] = ['General Knowledge']
  }
  return map
}

export function getCategories(questionNumber) {
  return CATEGORY_MAP[questionNumber] || ['General Knowledge']
}

export const ALL_CATEGORIES = [
  'Identity & Covenant', 'Laws & Commandments', 'Sabbath & Holy Days',
  'Prophecy', 'Dietary Laws', 'Christ & Messiah', 'History & Nations',
  'Prayer & Worship', 'Sin & Repentance', 'Family & Relationships',
  'End Times & Judgment', 'Apostles & Disciples', 'Apocrypha & Wisdom',
  'Precepts', 'General Knowledge'
]
