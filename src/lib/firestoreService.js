import { db } from './firebase'
import { doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, updateDoc, serverTimestamp, onSnapshot, deleteDoc, where, runTransaction, increment } from 'firebase/firestore'

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
  const q = query(collection(db, 'users'), orderBy(type, 'desc'), limit(maxResults))
  const snap = await getDocs(q)
  return snap.docs.map((d, i) => ({ uid: d.id, rank: i + 1, ...d.data() }))
}

// ===== ADMIN: GET ALL USERS =====
export async function getAllUsers() {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('xp', 'desc')))
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }))
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
