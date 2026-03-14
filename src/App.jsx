import { useState, useCallback, useEffect } from 'react'
import questions from './data/questions.json'
import { getCategories } from './data/categories'
import WHO_SAID_IT from './data/whoSaidIt'
import SCENARIOS from './data/scenarios'
import { VIRTUOUS_QUESTIONS, VIRTUOUS_SCENARIOS, VIRTUOUS_FILL_INS } from './data/virtuous'
import SCRIPTURE_MATCHES from './data/scriptureMatch'
import ParticleBackground from './components/ParticleBackground'
import LoginScreen from './components/LoginScreen'
import HomeScreen from './components/HomeScreen'
import GameScreen from './components/GameScreen'
import ResultsScreen from './components/ResultsScreen'
import StatsScreen from './components/StatsScreen'
import MemoryGameScreen from './components/MemoryGameScreen'
import SurvivalScreen from './components/SurvivalScreen'
import SpeedRoundScreen from './components/SpeedRoundScreen'
import ScriptureMatchScreen from './components/ScriptureMatchScreen'
import LeaderboardScreen from './components/LeaderboardScreen'
import ProfileScreen from './components/ProfileScreen'
import DuelScreen from './components/DuelScreen'
import AdminScreen from './components/AdminScreen'
import { onAuthChange, logOut } from './lib/authService'
import { initUserData } from './lib/firestoreService'
import { initStorage, flushStorage, getActiveGame, clearActiveGame, saveActiveGame, getTheme, setThemePref, saveSettings, getMissed, getWeightedQuestions, updateStreak, saveSessions, recordQuestionResult, addMissed, removeMissed, addDailyProgress, updateLevelUp, markQOTDAnswered, addXP, getXPForAction, checkAchievements, setSurvivalBest, setSpeedBest, getXP, getSurvivalBest, getSpeedBest, getStreak, getSessions } from './lib/storage'

const ADMIN_EMAILS = ['obediyah.ben.israel@gmail.com', 'oisrae1@wgu.edu']

function shuffleArray(arr) {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }; return a
}

const UNIQUE_REFS = [...new Set(questions.flatMap(q => q.refs || []))]

// Attach categories to each question
const ALL_Q = questions.map(q => ({ ...q, categories: getCategories(q.n) }))

export default function App() {
  const [screen, setScreen] = useState('home')
  const [gameState, setGameState] = useState(null)
  const [theme, setTheme] = useState(getTheme())
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setThemePref(theme)
  }, [theme])

  // Firebase auth listener
  useEffect(() => {
    return onAuthChange(async (u) => {
      setUser(u)
      if (u) {
        await initUserData(u.uid, u.displayName || u.email || 'Anonymous')
        await initStorage(u.uid)
      }
      setAuthLoading(false)
      // Auto-navigate to duel screen when arriving via shared duel link
      if (u && new URLSearchParams(window.location.search).get('duel')) {
        setScreen('duel')
      }

    })
  }, [])

  // Check for active (resumable) game on mount
  const [resumeData, setResumeData] = useState(null)
  useEffect(() => {
    const active = getActiveGame()
    if (active && active.questions && active.idx < active.questions.length) {
      setResumeData(active)
    }
  }, [])

  // XP + Achievements after any game ends
  const awardXP = useCallback((score, total) => {
    let xp = score * getXPForAction('correct') + (total - score) * getXPForAction('incorrect')
    if (score === total && total >= 10) xp += getXPForAction('perfectGame')
    addXP(xp)
    checkAchievements()
  }, [])

  const startGame = useCallback((settings) => {
    // Standalone screen modes
    if (settings.mode === 'survival') { setScreen('survival'); return }
    if (settings.mode === 'speed') { setScreen('speed'); return }
    if (settings.mode === 'match') { setScreen('match'); return }

    // Virtuous Woman mode
    if (settings.mode === 'virtuous') {
      const vPool = shuffleArray(VIRTUOUS_QUESTIONS).slice(0, settings.numQuestions).map((item, i) => ({
        n: i + 1, q: item.q, a: item.a,
        options: shuffleArray([item.a, ...item.wrong]),
        ref: item.ref, bibleMode: 'virtuous',
        verses: [{ ref: item.ref, text: item.verse }],
      }))
      if (vPool.length === 0) return alert('Not enough data!')
      const state = {
        mode: 'virtuous', questions: vPool, confirmBeforeSubmit: false,
        idx: 0, score: 0, answers: [], startTime: Date.now(),
      }
      setGameState(state)
      saveActiveGame(state)
      setResumeData(null)
      setScreen('game')
      saveSettings(settings)
      return
    }

    // Virtuous Fill in the Blank mode
    if (settings.mode === 'virtuous_fillin') {
      const allFillIns = shuffleArray(VIRTUOUS_FILL_INS)
      const vfPool = allFillIns.slice(0, settings.numQuestions).map((item, i) => {
        const wrongAnswers = shuffleArray(allFillIns.filter(f => f.answer !== item.answer).map(f => f.answer)).slice(0, 3)
        return {
          n: i + 1, q: item.text, a: item.answer,
          options: shuffleArray([item.answer, ...wrongAnswers]),
          ref: item.ref, bibleMode: 'virtuous',
          verses: [{ ref: item.ref, text: item.fullText }],
        }
      })
      if (vfPool.length === 0) return alert('Not enough data!')
      const state = {
        mode: 'virtuous', questions: vfPool, confirmBeforeSubmit: false,
        idx: 0, score: 0, answers: [], startTime: Date.now(),
      }
      setGameState(state)
      saveActiveGame(state)
      setResumeData(null)
      setScreen('game')
      saveSettings(settings)
      return
    }

    // Virtuous Scenario mode
    if (settings.mode === 'virtuous_scenario') {
      const vsPool = shuffleArray(VIRTUOUS_SCENARIOS).slice(0, settings.numQuestions).map((item, i) => ({
        n: i + 1, q: item.scenario, a: item.correctRef,
        correctText: item.correctText,
        options: shuffleArray([item.correctRef, ...item.wrongRefs]),
        bibleMode: 'scenario',
        verses: [{ ref: item.correctRef, text: item.correctText }],
      }))
      if (vsPool.length === 0) return alert('Not enough data!')
      const state = {
        mode: 'scenario', questions: vsPool, confirmBeforeSubmit: false,
        idx: 0, score: 0, answers: [], startTime: Date.now(),
      }
      setGameState(state)
      saveActiveGame(state)
      setResumeData(null)
      setScreen('game')
      saveSettings(settings)
      return
    }

    // Bible game modes use separate data
    const bibleModes = ['guessbook', 'whosaid', 'scenario', 'quotecomplete', 'catrush']
    if (bibleModes.includes(settings.mode)) {
      let biblePool = []
      const mode = settings.mode

      if (mode === 'whosaid') {
        biblePool = shuffleArray(WHO_SAID_IT).slice(0, settings.numQuestions).map((item, i) => ({
          n: i + 1, q: `"${item.quote}"`, a: item.speaker,
          options: shuffleArray([item.speaker, ...item.wrong]),
          ref: item.ref, bibleMode: 'whosaid',
          verses: [{ ref: item.ref, text: item.quote }],
        }))
      } else if (mode === 'scenario') {
        biblePool = shuffleArray(SCENARIOS).slice(0, settings.numQuestions).map((item, i) => ({
          n: i + 1, q: item.scenario, a: item.correctRef,
          correctText: item.correctText,
          options: shuffleArray([item.correctRef, ...item.wrongRefs]),
          bibleMode: 'scenario',
          verses: [{ ref: item.correctRef, text: item.correctText }],
        }))
      } else if (mode === 'guessbook') {
        const withVerses = ALL_Q.filter(q => q.verses && q.verses.length > 0)
        const allBooks = [...new Set(withVerses.flatMap(q => q.verses.map(v => v.ref.split(/\d/)[0].trim())))]
        biblePool = shuffleArray(withVerses).slice(0, settings.numQuestions).map((q, i) => {
          const verse = q.verses[0]
          const correctBook = verse.ref.split(/\d/)[0].trim()
          const wrongBooks = shuffleArray(allBooks.filter(b => b !== correctBook)).slice(0, 3)
          const verseText = verse.text.replace(/\[\d+\]\s*/g, '')
          return {
            n: i + 1, q: verseText.substring(0, 200) + (verseText.length > 200 ? '...' : ''),
            a: correctBook, options: shuffleArray([correctBook, ...wrongBooks]),
            ref: verse.ref, bibleMode: 'guessbook',
            verses: [{ ref: verse.ref, text: verse.text.replace(/\[\d+\]\s*/g, '') }],
          }
        })
      } else if (mode === 'quotecomplete') {
        const withVerses = ALL_Q.filter(q => q.verses && q.verses.length > 0)
        biblePool = shuffleArray(withVerses).slice(0, settings.numQuestions).map((q, i) => {
          const verse = q.verses[0]
          const text = verse.text.replace(/\[\d+\]\s*/g, '')
          const words = text.split(/\s+/)
          // Pick a meaningful segment to blank (last 2-4 words)
          const endIdx = words.length
          const startIdx = Math.max(0, endIdx - Math.min(4, Math.max(2, Math.floor(words.length * 0.15))))
          const blankedWords = words.slice(startIdx, endIdx).join(' ').replace(/[.,;:!?]+$/, '')
          const prompt = words.slice(0, startIdx).join(' ') + ' ____'
          // Generate wrong options from other verses
          const otherVerses = shuffleArray(withVerses.filter(oq => oq.n !== q.n)).slice(0, 3)
          const wrongOptions = otherVerses.map(oq => {
            const oText = oq.verses[0].text.replace(/\[\d+\]\s*/g, '')
            const oWords = oText.split(/\s+/)
            const oEnd = oWords.length
            const oStart = Math.max(0, oEnd - Math.min(4, Math.max(2, Math.floor(oWords.length * 0.15))))
            return oWords.slice(oStart, oEnd).join(' ').replace(/[.,;:!?]+$/, '')
          })
          return {
            n: i + 1, q: prompt, a: blankedWords,
            options: shuffleArray([blankedWords, ...wrongOptions]),
            ref: verse.ref, bibleMode: 'quotecomplete',
            verses: [{ ref: verse.ref, text: text }],
          }
        })
      } else if (mode === 'catrush') {
        // Filter by selected category, or pick one randomly
        let catPool = [...ALL_Q]
        if (settings.categories && settings.categories.length > 0) {
          catPool = catPool.filter(q => q.categories.some(c => settings.categories.includes(c)))
        } else {
          // Pick a random category
          const allCats = [...new Set(ALL_Q.flatMap(q => q.categories))]
          const randomCat = allCats[Math.floor(Math.random() * allCats.length)]
          catPool = ALL_Q.filter(q => q.categories.includes(randomCat))
          settings.rushCategory = randomCat
        }
        biblePool = shuffleArray(catPool).slice(0, Math.min(10, catPool.length)).map(q => ({
          ...q, bibleMode: 'catrush',
        }))
        // Category Rush uses timed MC format
        const state = {
          mode: 'timed', questions: biblePool, confirmBeforeSubmit: false,
          idx: 0, score: 0, answers: [], startTime: Date.now(),
          isCatRush: true, rushCategory: settings.rushCategory,
        }
        setGameState(state)
        saveActiveGame(state)
        setResumeData(null)
        setScreen('game')
        saveSettings(settings)
        return
      }

      if (biblePool.length === 0) return alert('Not enough data for this mode!')

      const state = {
        mode, questions: biblePool, confirmBeforeSubmit: false,
        idx: 0, score: 0, answers: [], startTime: Date.now(),
      }
      setGameState(state)
      saveActiveGame(state)
      setResumeData(null)
      setScreen('game')
      saveSettings(settings)
      return
    }

    let pool = [...ALL_Q]

    // Filter by category
    if (settings.categories && settings.categories.length > 0) {
      pool = pool.filter(q => q.categories.some(c => settings.categories.includes(c)))
    }
    // Filter by range
    if (settings.range !== 'all') {
      const [a, b] = settings.range.split('-').map(Number)
      pool = pool.filter(q => q.n >= a && q.n <= b)
    }
    // Missed-only mode
    if (settings.mode === 'missed') {
      const missedNums = getMissed()
      pool = ALL_Q.filter(q => missedNums.includes(q.n))
      if (pool.length === 0) return alert('No missed questions to review!')
      settings.mode = 'mc'
    }
    // Fill in the Blank: only questions with verses
    if (settings.mode === 'fillin') {
      pool = pool.filter(q => q.verses && q.verses.length > 0)
      if (pool.length === 0) return alert('No questions with verses available!')
      if (settings.shuffle) pool = shuffleArray(pool)
    }
    // Level Up mode: pick questions from weak categories first
    else if (settings.mode === 'levelup') {
      if (settings.categories && settings.categories.length > 0) {
        pool = pool.filter(q => q.categories.some(c => settings.categories.includes(c)))
      }
      pool = getWeightedQuestions(pool)
      settings.mode = 'mc'
      settings.isLevelUp = true
    }
    // Mock Exam: use all 240 in order
    else if (settings.isMockExam) {
      pool = [...ALL_Q]
      settings.mode = 'mc'
    }
    // Difficulty weighting
    else if (settings.mode === 'hard') {
      pool = getWeightedQuestions(pool)
      settings.mode = 'mc'
    } else if (settings.shuffle) {
      pool = shuffleArray(pool)
    }
    pool = pool.slice(0, Math.min(settings.numQuestions, pool.length))

    const state = {
      mode: settings.mode,
      questions: pool,
      confirmBeforeSubmit: settings.confirmBeforeSubmit,
      idx: 0, score: 0, answers: [],
      startTime: Date.now(),
      isLevelUp: settings.isLevelUp || false,
      isMockExam: settings.isMockExam || false,
    }
    setGameState(state)
    saveActiveGame(state)
    setResumeData(null)
    setScreen('game')
    saveSettings(settings)
  }, [])

  const resumeGame = useCallback(() => {
    if (resumeData) {
      setGameState(resumeData)
      setScreen('game')
      setResumeData(null)
    }
  }, [resumeData])

  const dismissResume = useCallback(() => {
    clearActiveGame()
    setResumeData(null)
  }, [])

  const onGameProgress = useCallback((state) => {
    saveActiveGame(state)
  }, [])



  const endGame = useCallback((answers, score) => {
    clearActiveGame()
    const elapsed = gameState ? Math.round((Date.now() - gameState.startTime) / 1000) : 0

    // Record per-question stats + missed bank (only for milk question modes)
    const isBibleMode = ['guessbook', 'whosaid', 'scenario', 'quotecomplete', 'virtuous'].includes(gameState?.mode)
    answers.forEach(a => {
      if (!isBibleMode && a.q.n) {
        recordQuestionResult(a.q.n, a.correct)
        if (!a.correct) addMissed(a.q.n)
        else removeMissed(a.q.n)
      }
      // Level Up: update category mastery
      if (gameState?.isLevelUp && a.q.categories) {
        a.q.categories.forEach(cat => updateLevelUp(cat, a.correct))
      }
    })

    // Track daily progress
    addDailyProgress(answers.length)

    // Mark QOTD as answered
    if (gameState?.isQOTD && answers.length > 0) {
      markQOTDAnswered(answers[0].correct)
    }

    // Save session
    const sessionMode = gameState?.isMockExam ? 'mock' : gameState?.isLevelUp ? 'levelup' : gameState?.mode || 'mc'
    saveSessions({
      mode: sessionMode,
      score, total: answers.length,
      pct: answers.length > 0 ? Math.round((score / answers.length) * 100) : 0,
      timeSeconds: elapsed,
    })

    // Update streak
    updateStreak()

    // Award XP
    awardXP(score, answers.length)
    flushStorage()

    setGameState(prev => ({ ...prev, answers, score, timeSeconds: elapsed }))
    setScreen('results')
  }, [gameState, awardXP])

  const goHome = useCallback(() => { setScreen('home'); setGameState(null) }, [])
  const goStats = useCallback(() => setScreen('stats'), [])
  const goMemory = useCallback(() => setScreen('memory'), [])
  const goLeaderboard = useCallback(() => setScreen('leaderboard'), [])
  const goProfile = useCallback(() => setScreen('profile'), [])
  const goDuel = useCallback(() => setScreen('duel'), [])
  const goAdmin = useCallback(() => setScreen('admin'), [])
  const handleLogout = useCallback(async () => { await logOut(); goHome() }, [goHome])

  const onSurvivalEnd = useCallback((score) => {
    setSurvivalBest(score)
    addDailyProgress(score)
    saveSessions({ mode: 'survival', score, total: score, pct: 100, timeSeconds: 0 })
    updateStreak()
    awardXP(score, score)
    flushStorage()
    goHome()
  }, [awardXP, goHome])

  const onSpeedEnd = useCallback((points, correct, total) => {
    setSpeedBest(correct)
    addDailyProgress(total)
    saveSessions({ mode: 'speed', score: correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0, timeSeconds: 60 })
    updateStreak()
    awardXP(correct, total)
    flushStorage()
    goHome()
  }, [awardXP, goHome])

  const onMatchEnd = useCallback((score) => {
    addDailyProgress(score)
    saveSessions({ mode: 'match', score, total: score, pct: 100, timeSeconds: 0 })
    updateStreak()
    awardXP(score, score)
    flushStorage()
    goHome()
  }, [awardXP, goHome])

  const startQOTD = useCallback((question) => {
    const state = {
      mode: 'mc',
      questions: [question],
      confirmBeforeSubmit: true,
      idx: 0, score: 0, answers: [],
      startTime: Date.now(),
      isQOTD: true,
    }
    setGameState(state)
    saveActiveGame(state)
    setScreen('game')
  }, [])

  if (authLoading) {
    return (
      <>
        <ParticleBackground theme={theme} />
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary, rgba(255,255,255,0.6))' }}>Loading...</p>
        </div>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <ParticleBackground theme={theme} />
        <LoginScreen />
      </>
    )
  }

  return (
    <>
      <ParticleBackground theme={theme} />
      {screen === 'home' && (
        <HomeScreen
          onStart={startGame}
          onStats={goStats}
          onMemoryGame={goMemory}
          onQOTD={startQOTD}
          resumeData={resumeData}
          onResume={resumeGame}
          onDismissResume={dismissResume}
          theme={theme}
          setTheme={setTheme}
          allQuestions={ALL_Q}
          user={user}
          onLeaderboard={goLeaderboard}
          onProfile={goProfile}
          onDuel={goDuel}
          onAdmin={user && ADMIN_EMAILS.includes(user.email) ? goAdmin : undefined}
        />
      )}
      {screen === 'game' && gameState && (
        <GameScreen
          gameState={gameState}
          allRefs={UNIQUE_REFS}
          onEnd={endGame}
          onQuit={goHome}
          onProgress={onGameProgress}
          theme={theme}
        />
      )}
      {screen === 'results' && gameState && (
        <ResultsScreen gameState={gameState} onHome={goHome} theme={theme} />
      )}
      {screen === 'stats' && (
        <StatsScreen onBack={goHome} theme={theme} allQuestions={ALL_Q} />
      )}
      {screen === 'memory' && (
        <MemoryGameScreen onBack={goHome} />
      )}
      {screen === 'survival' && (
        <SurvivalScreen questions={ALL_Q} onEnd={onSurvivalEnd} onBack={goHome} />
      )}
      {screen === 'speed' && (
        <SpeedRoundScreen questions={ALL_Q} onEnd={onSpeedEnd} onBack={goHome} />
      )}
      {screen === 'match' && (
        <ScriptureMatchScreen matches={SCRIPTURE_MATCHES} onEnd={onMatchEnd} onBack={goHome} />
      )}
      {screen === 'leaderboard' && (
        <LeaderboardScreen onBack={goHome} currentUid={user?.uid} />
      )}
      {screen === 'profile' && user && (
        <ProfileScreen onBack={goHome} user={user} onLogout={handleLogout} />
      )}
      {screen === 'duel' && user && (
        <DuelScreen onBack={goHome} user={user} allQuestions={ALL_Q} />
      )}
      {screen === 'admin' && user && (
        <AdminScreen onBack={goHome} currentUid={user.uid} userEmail={user.email} />
      )}
    </>
  )
}
