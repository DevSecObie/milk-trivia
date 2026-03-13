import { db } from './firebase'
import { doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, updateDoc, serverTimestamp, onSnapshot, deleteDoc, where, runTransaction } from 'firebase/firestore'

// ===== USER PROFILE =====
export async function saveProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

// Sync local stats to Firestore
export async function syncStats(uid, stats) {
  await setDoc(doc(db, 'users', uid), {
    xp: stats.xp,
    level: stats.level,
    title: stats.title,
    totalAnswered: stats.totalAnswered,
    totalCorrect: stats.totalCorrect,
    streak: stats.streak,
    survivalBest: stats.survivalBest,
    speedBest: stats.speedBest,
    achievements: stats.achievements,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// ===== LEADERBOARDS =====
export async function getLeaderboard(type = 'xp', maxResults = 50) {
  const q = query(
    collection(db, 'users'),
    orderBy(type, 'desc'),
    limit(maxResults)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d, i) => ({ uid: d.id, rank: i + 1, ...d.data() }))
}

// ===== MULTIPLAYER DUEL =====
export async function createDuel(uid, displayName, questions) {
  const duelRef = doc(collection(db, 'duels'))
  await setDoc(duelRef, {
    hostUid: uid,
    hostName: displayName || 'Player 1',
    hostScore: 0,
    hostAnswers: [],
    hostReady: false,
    guestUid: null,
    guestName: null,
    guestScore: 0,
    guestAnswers: [],
    guestReady: false,
    questions: questions,
    currentRound: 0,
    totalRounds: questions.length,
    status: 'waiting', // waiting, playing, finished
    createdAt: serverTimestamp(),
  })
  return duelRef.id
}

export async function joinDuel(duelId, uid, displayName) {
  const duelRef = doc(db, 'duels', duelId)
  const snap = await getDoc(duelRef)
  if (!snap.exists()) throw new Error('Duel not found')
  const data = snap.data()
  if (data.guestUid) throw new Error('Duel is full')
  if (data.hostUid === uid) throw new Error('Cannot join your own duel')
  await updateDoc(duelRef, {
    guestUid: uid,
    guestName: displayName || 'Player 2',
    status: 'playing',
  })
  return data
}

export function watchDuel(duelId, callback) {
  return onSnapshot(doc(db, 'duels', duelId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
  })
}

export async function submitDuelAnswer(duelId, isHost, round, correct, timeMs) {
  const duelRef = doc(db, 'duels', duelId)
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(duelRef)
    if (!snap.exists()) return
    const data = snap.data()

    const prefix = isHost ? 'host' : 'guest'
    const answers = [...(data[`${prefix}Answers`] || [])]
    answers.push({ round, correct, timeMs })

    const update = {
      [`${prefix}Answers`]: answers,
      [`${prefix}Score`]: answers.filter(a => a.correct).length,
    }

    // Advance round if both answered
    const otherPrefix = isHost ? 'guest' : 'host'
    const otherAnswers = data[`${otherPrefix}Answers`] || []
    if (otherAnswers.length >= round + 1) {
      update.currentRound = round + 1
      if (round + 1 >= data.totalRounds) {
        update.status = 'finished'
      }
    }

    transaction.update(duelRef, update)
  })
}

export async function getOpenDuels(maxResults = 20) {
  const q = query(
    collection(db, 'duels'),
    where('status', '==', 'waiting'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteDuel(duelId) {
  await deleteDoc(doc(db, 'duels', duelId))
}
