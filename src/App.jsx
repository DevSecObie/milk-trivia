import { useState, useCallback, useEffect } from 'react'
import questions from './data/questions.json'
import ParticleBackground from './components/ParticleBackground'
import HomeScreen from './components/HomeScreen'
import GameScreen from './components/GameScreen'
import ResultsScreen from './components/ResultsScreen'
import StatsScreen from './components/StatsScreen'
import Leaderboard from './components/Leaderboard'
import SettingsBar from './components/SettingsBar'
import {
  saveQuizProgress, loadQuizProgress, clearQuizProgress,
  saveSession, recordStudyDay, addMissedQuestions, recordAnswer,
  getMissedQuestions, weightedShuffle,
  getTheme, setTheme as storeTheme,
  getSoundEnabled, setSoundEnabled as storeSoundEnabled,
  getCategories, ALL_CATEGORIES,
} from './utils/storage'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const UNIQUE_REFS = [...new Set(questions.flatMap(q => q.refs || []))]

export default function App() {
  const [screen, setScreen] = useState('home')
  const [gameState, setGameState] = useState(null)
  const [theme, setThemeState] = useState(getTheme)
  const [soundOn, setSoundOnState] = useState(getSoundEnabled)

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Check for saved progress on mount
  useEffect(() => {
    const saved = loadQuizProgress()
    if (saved && saved.questions && saved.questions.length > 0) {
      setGameState(saved)
      setScreen('game')
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    storeTheme(next)
  }, [theme])

  const toggleSound = useCallback(() => {
    const next = !soundOn
    setSoundOnState(next)
    storeSoundEnabled(next)
  }, [soundOn])

  const startGame = useCallback((settings) => {
    let pool = [...questions]

    // Category filter
    if (settings.categories && settings.categories.length > 0 && settings.categories.length < ALL_CATEGORIES.length) {
      const catSet = new Set(settings.categories)
      pool = pool.filter(q => {
        const qCats = getCategories(q.n)
        return qCats.some(c => catSet.has(c))
      })
    }

    // Range filter
    if (settings.range !== 'all') {
      const [a, b] = settings.range.split('-').map(Number)
      pool = pool.filter(q => q.n >= a && q.n <= b)
    }

    // "Review Missed" mode
    if (settings.reviewMissed) {
      const missed = getMissedQuestions()
      const missedNums = new Set(Object.keys(missed).map(Number))
      pool = pool.filter(q => missedNums.has(q.n))
      if (pool.length === 0) {
        alert('No missed questions to review! Keep studying.')
        return
      }
    }

    // Difficulty-weighted shuffle vs random shuffle
    if (settings.weightedShuffle) {
      pool = weightedShuffle(pool)
    } else if (settings.shuffle) {
      pool = shuffleArray(pool)
    }

    pool = pool.slice(0, Math.min(settings.numQuestions, pool.length))

    const state = {
      mode: settings.mode,
      questions: pool,
      confirmBeforeSubmit: settings.confirmBeforeSubmit,
      score: 0,
      answers: [],
      startTime: Date.now(),
      currentIdx: 0,
    }
    setGameState(state)
    saveQuizProgress(state)
    setScreen('game')
  }, [])

  const onProgressUpdate = useCallback((progressState) => {
    saveQuizProgress(progressState)
    setGameState(progressState)
  }, [])

  const endGame = useCallback((answers, score) => {
    clearQuizProgress()
    const elapsed = gameState?.startTime ? Math.round((Date.now() - gameState.startTime) / 1000) : 0
    const total = answers.length || gameState?.questions?.length || 0
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    const mode = gameState?.mode || 'mc'

    const missedNums = answers.filter(a => !a.correct).map(a => a.q.n)
    saveSession({
      date: new Date().toISOString(),
      mode, score, total, pct,
      timeTakenSec: elapsed,
      range: 'all',
    })

    if (missedNums.length > 0) addMissedQuestions(missedNums)
    answers.forEach(a => recordAnswer(a.q.n, a.correct))
    recordStudyDay()

    setGameState(prev => ({ ...prev, answers, score, timeTakenSec: elapsed }))
    setScreen('results')
  }, [gameState])

  const goHome = useCallback(() => {
    clearQuizProgress()
    setScreen('home')
    setGameState(null)
  }, [])

  return (
    <>
      <ParticleBackground theme={theme} />
      <SettingsBar theme={theme} onThemeToggle={toggleTheme} soundOn={soundOn} onSoundToggle={toggleSound} />
      {screen === 'home' && (
        <HomeScreen
          onStart={startGame}
          onStats={() => setScreen('stats')}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      )}
      {screen === 'game' && gameState && (
        <GameScreen
          gameState={gameState}
          allRefs={UNIQUE_REFS}
          onEnd={endGame}
          onQuit={goHome}
          onProgressUpdate={onProgressUpdate}
          soundOn={soundOn}
        />
      )}
      {screen === 'results' && gameState && (
        <ResultsScreen gameState={gameState} onHome={goHome} onPlayAgain={() => setScreen('home')} />
      )}
      {screen === 'stats' && <StatsScreen onBack={goHome} />}
      {screen === 'leaderboard' && <Leaderboard onBack={goHome} />}
    </>
  )
}
