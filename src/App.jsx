import { useState, useCallback, useEffect } from 'react'
import questions from './data/questions.json'
import { getCategories } from './data/categories'
import ParticleBackground from './components/ParticleBackground'
import HomeScreen from './components/HomeScreen'
import GameScreen from './components/GameScreen'
import ResultsScreen from './components/ResultsScreen'
import StatsScreen from './components/StatsScreen'
import MemoryGameScreen from './components/MemoryGameScreen'
import { getActiveGame, clearActiveGame, saveActiveGame, getTheme, setThemePref, getSettings, saveSettings, getMissed, getWeightedQuestions, updateStreak, saveSessions, recordQuestionResult, addMissed, removeMissed } from './lib/storage'

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setThemePref(theme)
  }, [theme])

  // Check for active (resumable) game on mount
  const [resumeData, setResumeData] = useState(null)
  useEffect(() => {
    const active = getActiveGame()
    if (active && active.questions && active.idx < active.questions.length) {
      setResumeData(active)
    }
  }, [])

  const startGame = useCallback((settings) => {
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
    // Difficulty weighting
    if (settings.mode === 'hard') {
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

    // Record per-question stats + missed bank
    answers.forEach(a => {
      recordQuestionResult(a.q.n, a.correct)
      if (!a.correct) addMissed(a.q.n)
      else removeMissed(a.q.n)
    })

    // Save session
    saveSessions({
      mode: gameState?.mode || 'mc',
      score, total: answers.length,
      pct: answers.length > 0 ? Math.round((score / answers.length) * 100) : 0,
      timeSeconds: elapsed,
    })

    // Update streak
    updateStreak()

    setGameState(prev => ({ ...prev, answers, score, timeSeconds: elapsed }))
    setScreen('results')
  }, [gameState])

  const goHome = useCallback(() => { setScreen('home'); setGameState(null) }, [])
  const goStats = useCallback(() => setScreen('stats'), [])
  const goMemory = useCallback(() => setScreen('memory'), [])

  return (
    <>
      <ParticleBackground theme={theme} />
      {screen === 'home' && (
        <HomeScreen
          onStart={startGame}
          onStats={goStats}
          onMemoryGame={goMemory}
          resumeData={resumeData}
          onResume={resumeGame}
          onDismissResume={dismissResume}
          theme={theme}
          setTheme={setTheme}
          allQuestions={ALL_Q}
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
        <StatsScreen onBack={goHome} theme={theme} />
      )}
      {screen === 'memory' && (
        <MemoryGameScreen onBack={goHome} />
      )}
    </>
  )
}
