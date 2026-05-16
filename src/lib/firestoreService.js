import { db } from './firebase'
import { doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, updateDoc, serverTimestamp, onSnapshot, deleteDoc, where, runTransaction, increment } from 'firebase/firestore'

// ===== USER FIELD WHITELIST =====
// Mirror of the field sets in firestore.rules (clientWritableFields() and
// integrityFields()). Used as a runtime guard in saveUserData so that a
// regression which adds a stray field to the cached user payload fails
// loudly in dev rather than producing a silent permission-denied in prod.
// See .kiro/specs/firestore-rules-hardening/design.md → "Client refactor surface".
const CLIENT_WRITABLE_USER_FIELDS = [
  'displayName', 'settings', 'dailyGoal', 'missed',
  'theme', 'sound', 'activeGame', 'updatedAt', 'createdAt',
]

const INTEGRITY_USER_FIELDS = [
  'xp', 'level', 'title',
  'totalAnswered', 'totalCorrect', 'streak',
  'survivalBest', 'speedBest',
  'achievements', 'sessions', 'questionStats',
  'levelUp', 'dailyProgress', 'qotdHistory', 'dailyGoalDays',
]

export const ALL_KNOWN_USER_FIELDS = Object.freeze([
  ...CLIENT_WRITABLE_USER_FIELDS,
  ...INTEGRITY_USER_FIELDS,
])

const ALL_KNOWN_USER_FIELDS_SET = new Set(ALL_KNOWN_USER_FIELDS)

// ===== USER PROFILE + ALL STATS =====
const defaultUserData = {
  displayName: 'Anonymous',
  xp: 0, level: 1, title: 'Beginner',
  totalAnswered: 0, totalCorrect: 0,
  streak: { current: 0, best: 0, lastDate: null },
  survivalBest: 0, speedBest: 0,
  achievements: [],
  missed: [],
  questionStats: {},
  dailyGoal: 20,
  dailyProgress: { date: null, count: 0 },
  qotdHistory: { date: null, questionNum: null, answered: false, correct: null },
  levelUp: {},
  sessions: [],
  settings: { mode: 'mc', numQuestions: 50, range: 'all', shuffle: true, confirmBeforeSubmit: true, categories: [] },
  dailyGoalDays: 0,
  createdAt: null,
  updatedAt: null,
}

export async function getUserData(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (snap.exists()) return { ...defaultUserData, ...snap.data() }
  return null
}

export async function initUserData(uid, displayName) {
  const existing = await getUserData(uid)
  if (existing) return existing
  const data = {
    ...defaultUserData,
    displayName: displayName || 'Anonymous',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'users', uid), data)
  return data
}

export async function saveUserData(uid, data) {
  // Runtime whitelist guard. Per design.md → "Client refactor surface" call site #2,
  // every key written through saveUserData must be in ALL_KNOWN_USER_FIELDS so that
  // a future regression adding a stray field (e.g. "isAdmin") fails loudly in dev
  // instead of producing a silent permission-denied from rules in production.
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (!ALL_KNOWN_USER_FIELDS_SET.has(key)) {
        throw new Error(`saveUserData: unknown field '${key}' is not in allKnownUserFields`)
      }
    }
  }
  await setDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// Convenience: update specific fields
export async function updateUserFields(uid, fields) {
  await updateDoc(doc(db, 'users', uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  })
}

// ===== SAVE SESSION =====
export async function addSession(uid, session) {
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return
  const data = snap.data()
  const sessions = [...(data.sessions || []), { ...session, date: new Date().toISOString() }]
  // Keep last 100
  if (sessions.length > 100) sessions.splice(0, sessions.length - 100)
  await updateDoc(userRef, {
    sessions,
    totalAnswered: (data.totalAnswered || 0) + session.total,
    totalCorrect: (data.totalCorrect || 0) + session.score,
    updatedAt: serverTimestamp(),
  })
}

// ===== LEADERBOARDS =====
export async function getLeaderboard(type = 'xp', maxResults = 50) {
  // Cap leaderboard reads at 50 results client-side (Requirement 1.3).
  // Firestore rules cannot inspect query.limit reliably, so this clamp is the
  // sole enforcement point. Defense-in-depth: a future caller passing a larger
  // value (or user-supplied input) is silently clamped instead of leaking.
  const cap = Math.min(50, maxResults)
  const q = query(collection(db, 'users'), orderBy(type, 'desc'), limit(cap))
  const snap = await getDocs(q)
  return snap.docs.map((d, i) => ({ uid: d.id, rank: i + 1, ...d.data() }))
}

// ===== MULTIPLAYER DUEL =====
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out.')), ms)),
  ])
}

export async function createDuel(uid, displayName, questions) {
  const duelRef = doc(collection(db, 'duels'))
  await withTimeout(setDoc(duelRef, {
    hostUid: uid, hostName: displayName || 'Player 1', hostScore: 0, hostAnswers: [], hostReady: false,
    guestUid: null, guestName: null, guestScore: 0, guestAnswers: [], guestReady: false,
    questions, currentRound: 0, totalRounds: questions.length, status: 'waiting', createdAt: serverTimestamp(),
  }))
  return duelRef.id
}

export async function joinDuel(duelId, uid, displayName) {
  const duelRef = doc(db, 'duels', duelId)
  const snap = await withTimeout(getDoc(duelRef))
  if (!snap.exists()) throw new Error('Duel not found')
  const data = snap.data()
  if (data.guestUid) throw new Error('Duel is full')
  if (data.hostUid === uid) throw new Error('Cannot join your own duel')
  await withTimeout(updateDoc(duelRef, { guestUid: uid, guestName: displayName || 'Player 2', status: 'playing' }))
  return data
}

export function watchDuel(duelId, callback) {
  return onSnapshot(doc(db, 'duels', duelId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
  })
}

export async function submitDuelAnswer(duelId, isHost, round, correct, timeMs) {
  const duelRef = doc(db, 'duels', duelId)
  await withTimeout(runTransaction(db, async (transaction) => {
    const snap = await transaction.get(duelRef)
    if (!snap.exists()) return
    const data = snap.data()
    const prefix = isHost ? 'host' : 'guest'
    const answers = [...(data[`${prefix}Answers`] || [])]
    answers.push({ round, correct, timeMs })
    const update = { [`${prefix}Answers`]: answers, [`${prefix}Score`]: answers.filter(a => a.correct).length }
    const otherAnswers = data[`${isHost ? 'guest' : 'host'}Answers`] || []
    if (otherAnswers.length >= round + 1) {
      update.currentRound = round + 1
      if (round + 1 >= data.totalRounds) update.status = 'finished'
    }
    transaction.update(duelRef, update)
  }))
}

export async function getOpenDuels(maxResults = 20) {
  const q = query(collection(db, 'duels'), where('status', '==', 'waiting'), orderBy('createdAt', 'desc'), limit(maxResults))
  const snap = await withTimeout(getDocs(q))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteDuel(duelId) {
  await deleteDoc(doc(db, 'duels', duelId))
}

// Delete user's Firestore data
export async function deleteUserData(uid) {
  const { deleteDoc, doc } = await import('firebase/firestore')
  const { db } = await import('./firebase')
  await deleteDoc(doc(db, 'users', uid))
}
