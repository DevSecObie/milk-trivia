import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { getTestEnv, resetTestEnv, teardown, dbAs, seed } from './helpers.js'

beforeAll(async () => {
  await getTestEnv()
})

beforeEach(async () => {
  await resetTestEnv()
})

afterAll(async () => {
  await teardown()
})

describe('users/{uid} rules', () => {
  // ----- baseline user-doc shape used to seed pre-existing docs ---------
  // Mirrors the documented defaults for Integrity_Fields plus a handful of
  // Client_Writable_User_Fields. Seeded via `withSecurityRulesDisabled` so the
  // arrange phase bypasses the rules engine.
  const baselineUserDoc = () => ({
    displayName: 'Alice',
    settings: {},
    dailyGoal: 10,
    missed: [],
    theme: 'light',
    sound: true,
    activeGame: null,
    updatedAt: new Date(),
    createdAt: new Date(),
    xp: 0,
    level: 1,
    title: 'Beginner',
    totalAnswered: 0,
    totalCorrect: 0,
    streak: 0,
    survivalBest: 0,
    speedBest: 0,
    achievements: [],
    sessions: [],
    questionStats: {},
    levelUp: null,
    dailyProgress: {},
    qotdHistory: {},
    dailyGoalDays: 0,
  })

  it('R1.1: owner can read own user doc', async () => {
    const env = await getTestEnv()
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users', 'alice'), baselineUserDoc())
    })

    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(getDoc(doc(aliceDb, 'users', 'alice')))
  })

  it('R1.2: owner can delete own user doc', async () => {
    const env = await getTestEnv()
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users', 'alice'), baselineUserDoc())
    })

    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(deleteDoc(doc(aliceDb, 'users', 'alice')))
  })

  it("R1.3: authenticated user can read another user's doc (leaderboard read)", async () => {
    const env = await getTestEnv()
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users', 'alice'), baselineUserDoc())
    })

    const bobDb = dbAs(env, 'bob')
    await assertSucceeds(getDoc(doc(bobDb, 'users', 'alice')))
  })

  it('R2.5: unauthenticated user cannot read any user doc', async () => {
    const env = await getTestEnv()
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users', 'alice'), baselineUserDoc())
    })

    const anonDb = dbAs(env, null)
    await assertFails(getDoc(doc(anonDb, 'users', 'alice')))
  })

  it('R2.6: cross-uid write is denied', async () => {
    const env = await getTestEnv()
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users', 'alice'), baselineUserDoc())
    })

    const bobDb = dbAs(env, 'bob')

    // (a) Cross-uid update: bob tries to mutate alice's existing doc.
    await assertFails(
      updateDoc(doc(bobDb, 'users', 'alice'), { displayName: 'Mallory' })
    )

    // (b) Cross-uid delete: bob tries to delete alice's doc.
    await assertFails(deleteDoc(doc(bobDb, 'users', 'alice')))

    // (c) Cross-uid create: charlie tries to create a doc at users/dave.
    // Reset state so the create target does not already exist.
    await resetTestEnv()
    const charlieDb = dbAs(env, 'charlie')
    await assertFails(
      setDoc(doc(charlieDb, 'users', 'dave'), {
        displayName: 'Dave',
        settings: {},
        dailyGoal: 10,
        missed: [],
        theme: 'light',
        sound: true,
        activeGame: null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        xp: 0,
        level: 1,
        title: 'Beginner',
        totalAnswered: 0,
        totalCorrect: 0,
        survivalBest: 0,
        speedBest: 0,
        dailyGoalDays: 0,
        achievements: [],
        sessions: [],
      })
    )
  })

  it('R2.7: rejects user-doc update with unknown field (e.g. isAdmin)', async () => {
    const env = await getTestEnv()
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users', 'alice'), baselineUserDoc())
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice'), { isAdmin: true })
    )
  })

  it('R2.1: owner can update each Client_Writable_User_Field individually', async () => {
    const env = await getTestEnv()
    await seed(env, async (db) => {
      await setDoc(doc(db, 'users', 'alice'), baselineUserDoc())
    })

    const aliceDb = dbAs(env, 'alice')
    const ref = doc(aliceDb, 'users', 'alice')

    // Each field is updated in turn to confirm it is independently writable.
    await assertSucceeds(updateDoc(ref, { displayName: 'Alice II' }))
    await assertSucceeds(updateDoc(ref, { settings: { hapticsEnabled: true } }))
    await assertSucceeds(updateDoc(ref, { dailyGoal: 25 }))
    await assertSucceeds(updateDoc(ref, { theme: 'dark' }))
    await assertSucceeds(updateDoc(ref, { sound: false }))
    await assertSucceeds(updateDoc(ref, { missed: ['q-123'] }))
    await assertSucceeds(updateDoc(ref, { activeGame: { mode: 'classic' } }))
    await assertSucceeds(updateDoc(ref, { updatedAt: serverTimestamp() }))
  })

  it('R2.3: rejects user-doc create with an Integrity_Field at non-default value (e.g. xp: 999)', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice'), {
        displayName: 'Alice',
        xp: 999, // non-default value for an Integrity_Field
      })
    )
  })

  it('R2.3: allows user-doc create when Integrity_Fields are at documented defaults', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice'), {
        displayName: 'Alice',
        settings: {},
        dailyGoal: 10,
        missed: [],
        theme: 'light',
        sound: true,
        activeGame: null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        xp: 0,
        level: 1,
        title: 'Beginner',
        totalAnswered: 0,
        totalCorrect: 0,
        survivalBest: 0,
        speedBest: 0,
        dailyGoalDays: 0,
        achievements: [],
        sessions: [],
      })
    )
  })

  // ------------------------------------------------------------------
  // The following are deferred per design.md → "Residual risk under the chosen path".
  // Under the Documented_Tradeoff_Path chosen for this iteration, integrity fields
  // remain client-writable. These tests become real assertions only after the
  // future Server_Recompute_Path migration replaces integrityFieldsValid() with
  // !changedKeys().hasAny(integrityFields()) and moves writes to a Cloud Function.
  //
  // See: .kiro/specs/firestore-rules-hardening/design.md#residual-risk-under-the-chosen-path
  // ------------------------------------------------------------------
  it.todo('R2.4: rejects user-doc update that increases xp — deferred to Server_Recompute_Path migration')
  it.todo('R2.4: rejects user-doc update that increases level — deferred to Server_Recompute_Path migration')
  it.todo('R2.4: rejects user-doc update that increases survivalBest — deferred to Server_Recompute_Path migration')
  it.todo('R2.4: rejects user-doc update that increases speedBest — deferred to Server_Recompute_Path migration')
  it.todo('R8.3: rejects arbitrary Integrity_Field writes — deferred to Server_Recompute_Path migration')
})

describe('duels/{duelId} create rules', () => {
  // A counter so each test writes to a distinct duel ID, avoiding leftover
  // state pollution even if `resetTestEnv` semantics shift in the future.
  let duelCounter = 0
  const nextDuelId = () => `duel-${++duelCounter}`

  // Returns a valid duel-create payload with all required fields at their
  // documented defaults. `overrides` is shallow-merged on top so negative
  // cases can flip a single field without restating the whole shape.
  const validDuelDoc = (overrides = {}) => ({
    hostUid: 'alice',
    hostName: 'Alice',
    hostScore: 0,
    hostAnswers: [],
    hostReady: false,
    guestUid: null,
    guestName: null,
    guestScore: 0,
    guestAnswers: [],
    guestReady: false,
    questions: [{ q: '?', a: '!' }],
    currentRound: 0,
    totalRounds: 1,
    status: 'waiting',
    createdAt: serverTimestamp(),
    ...overrides,
  })

  it('R5.1: allows valid duel create with all required fields at correct defaults', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    await assertSucceeds(
      setDoc(doc(aliceDb, 'duels', nextDuelId()), validDuelDoc())
    )
  })

  it('R5.1 / R4.1: rejects create when hostUid != request.auth.uid', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    await assertFails(
      setDoc(doc(aliceDb, 'duels', nextDuelId()), validDuelDoc({ hostUid: 'bob' }))
    )
  })

  it('R5.1: rejects create with hostScore != 0', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    await assertFails(
      setDoc(doc(aliceDb, 'duels', nextDuelId()), validDuelDoc({ hostScore: 5 }))
    )
  })

  it('R5.1: rejects create with empty questions list', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    await assertFails(
      setDoc(
        doc(aliceDb, 'duels', nextDuelId()),
        validDuelDoc({ questions: [], totalRounds: 0 })
      )
    )
  })

  it('R5.1: rejects create with questions list of size > 100', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    const oversized = Array.from({ length: 101 }, () => ({ q: '?', a: '!' }))
    await assertFails(
      setDoc(
        doc(aliceDb, 'duels', nextDuelId()),
        validDuelDoc({ questions: oversized, totalRounds: 101 })
      )
    )
  })

  it('R5.7: rejects create with an extra unknown field', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    await assertFails(
      setDoc(
        doc(aliceDb, 'duels', nextDuelId()),
        validDuelDoc({ cheatMode: true })
      )
    )
  })

  it('R5.1: rejects create when totalRounds != questions.size()', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    const threeQuestions = [
      { q: 'q1', a: 'a1' },
      { q: 'q2', a: 'a2' },
      { q: 'q3', a: 'a3' },
    ]
    await assertFails(
      setDoc(
        doc(aliceDb, 'duels', nextDuelId()),
        validDuelDoc({ questions: threeQuestions, totalRounds: 5 })
      )
    )
  })

  it("R5.1: rejects create with status != 'waiting'", async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    await assertFails(
      setDoc(
        doc(aliceDb, 'duels', nextDuelId()),
        validDuelDoc({ status: 'playing' })
      )
    )
  })

  it('R5.1: rejects create with non-null guestUid at create time', async () => {
    const env = await getTestEnv()
    const aliceDb = dbAs(env, 'alice')

    await assertFails(
      setDoc(
        doc(aliceDb, 'duels', nextDuelId()),
        validDuelDoc({ guestUid: 'bob' })
      )
    )
  })
})

describe('duels/{duelId} update rules — participants', () => {
  // Counter so each test writes to a distinct duel ID.
  let duelCounter = 0
  const nextDuelId = () => `duel-update-${++duelCounter}`

  // Local copy of the duel-shape factory. The create-suite version lives in a
  // sibling describe and is not in scope here; per the design notes, the
  // minimal-change choice is to redefine inline rather than hoist.
  const validDuelDoc = (overrides = {}) => ({
    hostUid: 'alice',
    hostName: 'Alice',
    hostScore: 0,
    hostAnswers: [],
    hostReady: false,
    guestUid: null,
    guestName: null,
    guestScore: 0,
    guestAnswers: [],
    guestReady: false,
    questions: [
      { q: 'q1', a: 'a1' },
      { q: 'q2', a: 'a2' },
    ],
    currentRound: 0,
    totalRounds: 2,
    status: 'waiting',
    createdAt: new Date(),
    ...overrides,
  })

  // Seeds a duel in the 'playing' state with alice as host and bob as guest.
  // totalRounds=2 keeps every monotonic check (currentRound 0->1, scores 0->1,
  // answers 0->1) inside the valid range without forcing the boundary.
  async function seedPlayingDuel(env, duelId, overrides = {}) {
    await seed(env, async (db) => {
      await setDoc(
        doc(db, 'duels', duelId),
        validDuelDoc({
          status: 'playing',
          guestUid: 'bob',
          guestName: 'Bob',
          ...overrides,
        })
      )
    })
  }

  it('R4.2: host can update hostScore, hostAnswers, hostReady (host-owned)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'duels', id), {
        hostScore: 1,
        hostAnswers: [{ round: 0, correct: true }],
        hostReady: true,
      })
    )
  })

  it('R1.7: host can update currentRound (shared, valid transition)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'duels', id), { currentRound: 1 })
    )
  })

  it('R1.7: host can update status playing -> finished (shared, valid transition)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'duels', id), { status: 'finished' })
    )
  })

  it('R4.4: host cannot modify guestScore', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { guestScore: 5 })
    )
  })

  it('R4.4: host cannot modify guestAnswers', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), {
        guestAnswers: [{ round: 0, correct: true }],
      })
    )
  })

  it('R4.4: host cannot modify guestReady', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { guestReady: true })
    )
  })

  it('R4.3: guest can update guestScore, guestAnswers, guestReady (guest-owned)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const bobDb = dbAs(env, 'bob')
    await assertSucceeds(
      updateDoc(doc(bobDb, 'duels', id), {
        guestScore: 1,
        guestAnswers: [{ round: 0, correct: true }],
        guestReady: true,
      })
    )
  })

  it('R4.5: guest cannot modify hostScore', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const bobDb = dbAs(env, 'bob')
    await assertFails(
      updateDoc(doc(bobDb, 'duels', id), { hostScore: 5 })
    )
  })

  it('R4.5: guest cannot modify hostAnswers', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const bobDb = dbAs(env, 'bob')
    await assertFails(
      updateDoc(doc(bobDb, 'duels', id), {
        hostAnswers: [{ round: 0, correct: true }],
      })
    )
  })

  it('R4.5: guest cannot modify hostReady', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const bobDb = dbAs(env, 'bob')
    await assertFails(
      updateDoc(doc(bobDb, 'duels', id), { hostReady: true })
    )
  })

  it('R4.1: non-participant authenticated user cannot update any field', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const malloryDb = dbAs(env, 'mallory')
    await assertFails(
      updateDoc(doc(malloryDb, 'duels', id), { hostScore: 1 })
    )
    await assertFails(
      updateDoc(doc(malloryDb, 'duels', id), { guestScore: 1 })
    )
    await assertFails(
      updateDoc(doc(malloryDb, 'duels', id), { currentRound: 1 })
    )
  })

  it('R8.5: unauthenticated user cannot update any field', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const anonDb = dbAs(env, null)
    await assertFails(
      updateDoc(doc(anonDb, 'duels', id), { hostScore: 1 })
    )
  })
})

describe('duels/{duelId} update rules — join handshake', () => {
  // Counter so each test writes to a distinct duel ID.
  let duelCounter = 0
  const nextDuelId = () => `duel-join-${++duelCounter}`

  // Local copy of the duel-shape factory. Sibling describe blocks define their
  // own; per the design notes, the minimal-change choice is to redefine inline
  // rather than hoist into module scope.
  const validDuelDoc = (overrides = {}) => ({
    hostUid: 'alice',
    hostName: 'Alice',
    hostScore: 0,
    hostAnswers: [],
    hostReady: false,
    guestUid: null,
    guestName: null,
    guestScore: 0,
    guestAnswers: [],
    guestReady: false,
    questions: [
      { q: 'q1', a: 'a1' },
      { q: 'q2', a: 'a2' },
    ],
    currentRound: 0,
    totalRounds: 2,
    status: 'waiting',
    createdAt: new Date(),
    ...overrides,
  })

  // Seeds a duel in the 'waiting' state with no guest yet — the standard
  // pre-condition for a join handshake. totalRounds=2 keeps every subsequent
  // monotonic check inside the valid range without forcing the boundary.
  async function seedWaitingDuel(env, duelId, overrides = {}) {
    await seed(env, async (db) => {
      await setDoc(
        doc(db, 'duels', duelId),
        validDuelDoc({
          status: 'waiting',
          guestUid: null,
          guestName: null,
          currentRound: 0,
          totalRounds: 2,
          ...overrides,
        })
      )
    })
  }

  it('R4.6: third-party user can claim a waiting duel by setting guestUid=self and guestName', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedWaitingDuel(env, id)

    const bobDb = dbAs(env, 'bob')
    await assertSucceeds(
      updateDoc(doc(bobDb, 'duels', id), {
        guestUid: 'bob',
        guestName: 'Bob',
        status: 'playing',
      })
    )
  })

  it('R4.6: rejects join when an additional non-join field is also being changed', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedWaitingDuel(env, id)

    const bobDb = dbAs(env, 'bob')
    // hostScore is outside joinFields — even with valid guestUid/guestName/status,
    // the join handshake predicate (onlyChanged(joinFields())) must reject this.
    await assertFails(
      updateDoc(doc(bobDb, 'duels', id), {
        guestUid: 'bob',
        guestName: 'Bob',
        status: 'playing',
        hostScore: 1,
      })
    )
  })

  it('R4.6: host cannot self-join (host setting guestUid=self is denied)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedWaitingDuel(env, id)

    const aliceDb = dbAs(env, 'alice')
    // Join handshake requires resource.data.hostUid != request.auth.uid; the
    // host path doesn't allow guestUid/guestName changes either, so both
    // legal-update branches fail.
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), {
        guestUid: 'alice',
        guestName: 'Alice2',
        status: 'playing',
      })
    )
  })

  it('R4.8: rejects setting guestUid to a uid other than request.auth.uid', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedWaitingDuel(env, id)

    const bobDb = dbAs(env, 'bob')
    await assertFails(
      updateDoc(doc(bobDb, 'duels', id), {
        guestUid: 'mallory',
        guestName: 'Mallory',
        status: 'playing',
      })
    )
  })

  it('R4.7: rejects overwriting an already-non-null guestUid (R8.9)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    // Seed inline: a 'playing' duel where bob has already joined. Mallory
    // tries to overwrite guestUid — the join handshake requires the existing
    // guestUid to be null, so this must fail.
    await seed(env, async (db) => {
      await setDoc(
        doc(db, 'duels', id),
        validDuelDoc({
          status: 'playing',
          guestUid: 'bob',
          guestName: 'Bob',
        })
      )
    })

    const malloryDb = dbAs(env, 'mallory')
    await assertFails(
      updateDoc(doc(malloryDb, 'duels', id), {
        guestUid: 'mallory',
        guestName: 'Mallory',
      })
    )
  })
})
describe('duels/{duelId} update rules — immutability and transitions', () => {
  // Counter so each test writes to a distinct duel ID, avoiding any chance of
  // cross-test interference even if `resetTestEnv` semantics shift.
  let duelCounter = 0
  const nextDuelId = () => `duel-immut-${++duelCounter}`

  // Local copy of the duel-shape factory. Sibling describe blocks define their
  // own; per the design notes, the minimal-change choice is to redefine inline
  // rather than hoist into module scope. Defaults to a 'waiting' shape with
  // totalRounds=2 and a matching 2-question list; callers override per-test.
  const validDuelDoc = (overrides = {}) => ({
    hostUid: 'alice',
    hostName: 'Alice',
    hostScore: 0,
    hostAnswers: [],
    hostReady: false,
    guestUid: null,
    guestName: null,
    guestScore: 0,
    guestAnswers: [],
    guestReady: false,
    questions: [
      { q: 'q1', a: 'a1' },
      { q: 'q2', a: 'a2' },
    ],
    currentRound: 0,
    totalRounds: 2,
    status: 'waiting',
    createdAt: new Date(),
    ...overrides,
  })

  // Flexible seeding helper: writes a duel in whatever state `overrides`
  // describes (waiting / playing / finished). This is more general than the
  // per-state seeders in earlier suites because the immutability + transition
  // tests need to start from many different states.
  async function seedDuel(env, duelId, overrides = {}) {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'duels', duelId), validDuelDoc(overrides))
    })
  }

  // ----------------------------------------------------------------
  // Immutability (R6.1 / R8.8)
  // ----------------------------------------------------------------

  it('R6.1: rejects mutation of hostUid (R8.8)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { hostUid: 'mallory' })
    )
  })

  it('R6.1: rejects mutation of hostName', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { hostName: 'AliceX' })
    )
  })

  it('R6.1: rejects mutation of questions (R8.8)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), {
        questions: [{ q: 'new', a: 'new' }],
      })
    )
  })

  it('R6.1: rejects mutation of totalRounds (R8.8)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { totalRounds: 5 })
    )
  })

  it('R6.1: rejects mutation of createdAt (R8.8)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { createdAt: serverTimestamp() })
    )
  })

  // ----------------------------------------------------------------
  // Status transitions (R6.4)
  // ----------------------------------------------------------------

  it('R6.4: rejects status transition playing -> waiting', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { status: 'waiting' })
    )
  })

  it('R6.4: rejects status transition finished -> playing', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    // Seed a finished duel with sensible end-state values: scores at the
    // totalRounds cap and currentRound at totalRounds.
    await seedDuel(env, id, {
      status: 'finished',
      guestUid: 'bob',
      guestName: 'Bob',
      currentRound: 2,
      totalRounds: 2,
      hostScore: 2,
      guestScore: 2,
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { status: 'playing' })
    )
  })

  it('R6.4: rejects status transition finished -> waiting', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'finished',
      guestUid: 'bob',
      guestName: 'Bob',
      currentRound: 2,
      totalRounds: 2,
      hostScore: 2,
      guestScore: 2,
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { status: 'waiting' })
    )
  })

  it('R6.4: allows status transition waiting -> playing', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    // Seed with guestUid pre-set so this is a host-path update (status flip
    // by the host while guest is already joined), not a join handshake. This
    // is a slight oddity — typically waiting->playing happens via the join
    // handshake — but the rule's statusTransitionAllowed permits waiting ->
    // playing on the host path too.
    await seedDuel(env, id, {
      status: 'waiting',
      guestUid: 'bob',
      guestName: 'Bob',
    })

    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'duels', id), { status: 'playing' })
    )
  })

  it('R6.4: allows status transition playing -> finished', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
    })

    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'duels', id), { status: 'finished' })
    )
  })

  it('R6.4: allows status transition waiting -> finished (host abandons)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    // Host abandons before any guest has joined. guestUid stays null; only
    // status flips. This satisfies the host-path branch of `allow update`.
    await seedDuel(env, id, { status: 'waiting' })

    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'duels', id), { status: 'finished' })
    )
  })

  // ----------------------------------------------------------------
  // currentRound monotonicity (R6.2, R6.3, R8.7)
  // ----------------------------------------------------------------

  it('R6.2: currentRound cannot decrease (R8.7)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    // Need totalRounds >= 1 for currentRound=1 to fit; use 3 for headroom.
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
      currentRound: 1,
      totalRounds: 3,
      questions: [
        { q: 'q1', a: 'a1' },
        { q: 'q2', a: 'a2' },
        { q: 'q3', a: 'a3' },
      ],
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { currentRound: 0 })
    )
  })

  it('R6.3: currentRound cannot increase by more than 1 (R8.7)', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
      currentRound: 0,
      totalRounds: 3,
      questions: [
        { q: 'q1', a: 'a1' },
        { q: 'q2', a: 'a2' },
        { q: 'q3', a: 'a3' },
      ],
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { currentRound: 2 })
    )
  })

  // ----------------------------------------------------------------
  // Score and answer monotonicity (R6.5, R6.6, R6.7, R6.8)
  // ----------------------------------------------------------------

  it('R6.5: hostScore cannot decrease', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    // totalRounds=3 lets hostScore=2 fit comfortably under the cap.
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
      hostScore: 2,
      totalRounds: 3,
      questions: [
        { q: 'q1', a: 'a1' },
        { q: 'q2', a: 'a2' },
        { q: 'q3', a: 'a3' },
      ],
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { hostScore: 1 })
    )
  })

  it('R6.6: guestScore cannot decrease', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
      guestScore: 2,
      totalRounds: 3,
      questions: [
        { q: 'q1', a: 'a1' },
        { q: 'q2', a: 'a2' },
        { q: 'q3', a: 'a3' },
      ],
    })

    const bobDb = dbAs(env, 'bob')
    await assertFails(
      updateDoc(doc(bobDb, 'duels', id), { guestScore: 1 })
    )
  })

  it('R6.7: hostAnswers size cannot decrease', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
      hostAnswers: [{ r: 0 }, { r: 1 }],
      totalRounds: 3,
      questions: [
        { q: 'q1', a: 'a1' },
        { q: 'q2', a: 'a2' },
        { q: 'q3', a: 'a3' },
      ],
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { hostAnswers: [{ r: 0 }] })
    )
  })

  it('R6.8: guestAnswers size cannot decrease', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
      guestAnswers: [{ r: 0 }, { r: 1 }],
      totalRounds: 3,
      questions: [
        { q: 'q1', a: 'a1' },
        { q: 'q2', a: 'a2' },
        { q: 'q3', a: 'a3' },
      ],
    })

    const bobDb = dbAs(env, 'bob')
    await assertFails(
      updateDoc(doc(bobDb, 'duels', id), { guestAnswers: [{ r: 0 }] })
    )
  })

  // ----------------------------------------------------------------
  // Out-of-range / invalid values (R5.2, R5.5, R5.6)
  // ----------------------------------------------------------------

  it('R5.2: rejects update with hostScore > totalRounds', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    // totalRounds=2; hostScore=5 violates isUpdateShapeValid's <= total cap.
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
      totalRounds: 2,
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { hostScore: 5 })
    )
  })

  it('R5.5: rejects update with currentRound > totalRounds', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
      totalRounds: 2,
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { currentRound: 5 })
    )
  })

  it("R5.6: rejects update with status not in {'waiting','playing','finished'}", async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedDuel(env, id, {
      status: 'playing',
      guestUid: 'bob',
      guestName: 'Bob',
    })

    const aliceDb = dbAs(env, 'alice')
    await assertFails(
      updateDoc(doc(aliceDb, 'duels', id), { status: 'paused' })
    )
  })
})

describe('duels/{duelId} delete rules', () => {
  // Counter so each test writes to a distinct duel ID, avoiding any chance of
  // cross-test interference even if `resetTestEnv` semantics shift.
  let duelCounter = 0
  const nextDuelId = () => `duel-delete-${++duelCounter}`

  // Local copy of the duel-shape factory. Sibling describe blocks define their
  // own; per the design notes, the minimal-change choice is to redefine inline
  // rather than hoist into module scope.
  const validDuelDoc = (overrides = {}) => ({
    hostUid: 'alice',
    hostName: 'Alice',
    hostScore: 0,
    hostAnswers: [],
    hostReady: false,
    guestUid: null,
    guestName: null,
    guestScore: 0,
    guestAnswers: [],
    guestReady: false,
    questions: [
      { q: 'q1', a: 'a1' },
      { q: 'q2', a: 'a2' },
    ],
    currentRound: 0,
    totalRounds: 2,
    status: 'waiting',
    createdAt: new Date(),
    ...overrides,
  })

  // Seeds a duel in the 'playing' state with alice as host and bob as guest.
  // This is the typical pre-condition for testing delete rules: a live duel
  // with both participants present.
  async function seedPlayingDuel(env, duelId, overrides = {}) {
    await seed(env, async (db) => {
      await setDoc(
        doc(db, 'duels', duelId),
        validDuelDoc({
          status: 'playing',
          guestUid: 'bob',
          guestName: 'Bob',
          ...overrides,
        })
      )
    })
  }

  it('R1.6 / R4.9: host can delete own duel', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(deleteDoc(doc(aliceDb, 'duels', id)))
  })

  it('R4.9: guest cannot delete duel', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const bobDb = dbAs(env, 'bob')
    await assertFails(deleteDoc(doc(bobDb, 'duels', id)))
  })

  it('R4.9: non-participant cannot delete duel', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()
    await seedPlayingDuel(env, id)

    const malloryDb = dbAs(env, 'mallory')
    await assertFails(deleteDoc(doc(malloryDb, 'duels', id)))
  })
})

describe('legitimate end-to-end flows', () => {
  // Counter so the lifecycle test writes to a distinct duel ID.
  let duelCounter = 0
  const nextDuelId = () => `duel-e2e-${++duelCounter}`

  // Local copy of the duel-shape factory used for the create step. Sibling
  // describe blocks define their own; per the design notes, the minimal-change
  // choice is to redefine inline rather than hoist into module scope.
  const validDuelDoc = (overrides = {}) => ({
    hostUid: 'alice',
    hostName: 'Alice',
    hostScore: 0,
    hostAnswers: [],
    hostReady: false,
    guestUid: null,
    guestName: null,
    guestScore: 0,
    guestAnswers: [],
    guestReady: false,
    questions: [
      { q: 'q1', a: 'a1' },
      { q: 'q2', a: 'a2' },
    ],
    currentRound: 0,
    totalRounds: 2,
    status: 'waiting',
    createdAt: serverTimestamp(),
    ...overrides,
  })

  it('R8.11: full duel lifecycle (create -> guest joins -> alternating answer submissions -> status finishes) is allowed under the new rules', async () => {
    const env = await getTestEnv()
    const id = nextDuelId()

    // ---- Step 1: alice creates a valid duel (status: 'waiting'). ----
    const aliceDb = dbAs(env, 'alice')
    await assertSucceeds(
      setDoc(doc(aliceDb, 'duels', id), validDuelDoc())
    )

    // ---- Step 2: bob joins via the handshake. Only joinFields change. ----
    const bobDb = dbAs(env, 'bob')
    await assertSucceeds(
      updateDoc(doc(bobDb, 'duels', id), {
        guestUid: 'bob',
        guestName: 'Bob',
        status: 'playing',
      })
    )

    // ---- Step 3: alice (host) submits round 0 and advances currentRound. ----
    // Changed keys: hostScore, hostAnswers, currentRound — all in
    // hostOwned ∪ sharedOwned. currentRound 0 -> 1 satisfies monotone.
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'duels', id), {
        hostScore: 1,
        hostAnswers: [{ round: 0, correct: true }],
        currentRound: 1,
      })
    )

    // ---- Step 4: bob (guest) submits round 0. currentRound stays at 1. ----
    // Changed keys: guestScore, guestAnswers — both in guestOwned.
    await assertSucceeds(
      updateDoc(doc(bobDb, 'duels', id), {
        guestScore: 1,
        guestAnswers: [{ round: 0, correct: true }],
      })
    )

    // ---- Step 5: alice (host) submits final round and finishes the duel. ----
    // Changed keys: hostScore, hostAnswers, currentRound, status — exactly
    // hostOwned ∪ sharedOwned. currentRound 1 -> 2, status playing -> finished.
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'duels', id), {
        hostScore: 2,
        hostAnswers: [
          { round: 0, correct: true },
          { round: 1, correct: true },
        ],
        currentRound: 2,
        status: 'finished',
      })
    )

    // ---- Step 6: bob (guest) submits final round. status finished -> finished
    // is allowed by statusTransitionAllowed (newS == oldS). ----
    await assertSucceeds(
      updateDoc(doc(bobDb, 'duels', id), {
        guestScore: 2,
        guestAnswers: [
          { round: 0, correct: true },
          { round: 1, correct: true },
        ],
      })
    )

    // ---- Step 7: alice (host) deletes the finished duel. ----
    await assertSucceeds(deleteDoc(doc(aliceDb, 'duels', id)))
  })
})
