import { useState } from 'react'
import { BookCheck, Keyboard, BookOpen, Timer, Download, ChevronDown, Shuffle, BarChart2, Flame, AlertCircle, Sun, Moon, Volume2, VolumeX, Zap, Target, Trophy, TrendingUp, Clock, Star, TextCursorInput, Brain, HelpCircle, MessageCircle, Scale, Quote, Rocket, Heart, Gauge, Link2, Crown, Award, Shield, User, LogIn, Swords } from 'lucide-react'
import { getStreak, getMissed, getSessions, isSoundOn, setSoundPref, getSettings, getDailyGoal, setDailyGoal, getDailyProgress, getQOTD, getLevelUpProgress, getXP, RANKS, getSurvivalBest, getSpeedBest } from '../lib/storage'
import { signInWithGoogle } from '../lib/authService'
import { CATEGORY_LABELS, getAllCategoryKeys } from '../data/categories'
import ChristIcon from './ChristIcon'

function CatIcon({ icon }) {
  if (icon === 'christ-svg') return <ChristIcon size={14} />
  return <span>{icon}</span>
}

const modes = [
  { id: 'mc', icon: BookCheck, label: 'Multiple Choice', desc: 'Select the correct scripture(s)', group: 'milk' },
  { id: 'type', icon: Keyboard, label: 'Type It', desc: 'Type references from memory', group: 'milk' },
  { id: 'flash', icon: BookOpen, label: 'Flashcards', desc: 'Study at your own pace', group: 'milk' },
  { id: 'timed', icon: Timer, label: 'Timed Quiz', desc: '15-second timer', group: 'milk' },
  { id: 'missed', icon: AlertCircle, label: 'Review Missed', desc: 'Drill your weak spots', group: 'milk' },
  { id: 'hard', icon: Zap, label: 'Hardest First', desc: 'Most-missed questions first', group: 'milk' },
  { id: 'fillin', icon: TextCursorInput, label: 'Fill in Blank', desc: 'Complete the missing word', group: 'milk' },
  { id: 'survival', icon: Shield, label: 'Survival', desc: 'One wrong = game over', group: 'milk' },
  { id: 'speed', icon: Gauge, label: 'Speed Round', desc: '60s arcade mode', group: 'milk' },
  { id: 'levelup', icon: TrendingUp, label: 'Level Up', desc: 'Master categories step by step', group: 'milk' },
  { id: 'mock', icon: Trophy, label: 'Mock Exam', desc: 'Full 240-question test', group: 'milk' },
  { id: 'guessbook', icon: HelpCircle, label: 'Guess the Book', desc: 'Which book is this from?', group: 'bible' },
  { id: 'whosaid', icon: MessageCircle, label: 'Who Said It?', desc: 'Identify the speaker', group: 'bible' },
  { id: 'scenario', icon: Scale, label: 'Scenario', desc: 'What scripture should be applied?', group: 'bible' },
  { id: 'quotecomplete', icon: Quote, label: 'Quote Complete', desc: 'Finish the verse', group: 'bible' },
  { id: 'catrush', icon: Rocket, label: 'Category Rush', desc: 'Topical speed round', group: 'bible' },
  { id: 'memory', icon: Brain, label: 'Bible Memory', desc: 'Learn book order', group: 'bible' },
  { id: 'match', icon: Link2, label: 'Scripture Match', desc: 'Connect verses to refs', group: 'bible' },
  { id: 'virtuous', icon: Crown, label: 'Virtuous Woman', desc: 'Proverbs 31 & Titus 2', group: 'bible' },
  { id: 'virtuous_fillin', icon: TextCursorInput, label: 'Sisters Fill In', desc: 'Complete the verse', group: 'bible' },
  { id: 'virtuous_scenario', icon: Heart, label: 'Sisters Scenario', desc: 'Godly woman situations', group: 'bible' },
]
const ranges = [
  { value: 'all', label: 'All (1–240)' },
  { value: '1-50', label: '1–50' }, { value: '51-100', label: '51–100' },
  { value: '101-150', label: '101–150' }, { value: '151-200', label: '151–200' },
  { value: '201-240', label: '201–240' },
]
const counts = [10, 20, 30, 50, 100, 240]

export default function HomeScreen({ onStart, onStats, onMemoryGame, onQOTD, resumeData, onResume, onDismissResume, theme, setTheme, allQuestions, user, onLeaderboard, onProfile, onDuel, onAdmin }) {
  const saved = getSettings()
  const [mode, setMode] = useState(saved.mode || 'mc')
  const [numQ, setNumQ] = useState(saved.numQuestions || 50)
  const [range, setRange] = useState(saved.range || 'all')
  const [shuffleOn, setShuffleOn] = useState(saved.shuffle !== false)
  const [confirm, setConfirm] = useState(saved.confirmBeforeSubmit !== false)
  const [sound, setSound] = useState(isSoundOn())
  const [selectedCats, setSelectedCats] = useState(saved.categories || [])
  const [dailyGoalVal, setDailyGoalVal] = useState(getDailyGoal())
  const [showGoalPicker, setShowGoalPicker] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState(null)
  const streak = getStreak()
  const missedCount = getMissed().length
  const sessions = getSessions()
  const totalStudied = sessions.reduce((s, x) => s + x.total, 0)
  const dailyProgress = getDailyProgress()
  const qotd = getQOTD(allQuestions.length)
  const qotdQuestion = allQuestions.find(q => q.n === qotd.questionNum)
  const levelUpProgress = getLevelUpProgress()
  const xp = getXP()
  const nextRank = RANKS.find(r => r.xpNeeded > xp.total)
  const xpPct = nextRank ? Math.round(((xp.total - (RANKS[xp.level - 1]?.xpNeeded || 0)) / (nextRank.xpNeeded - (RANKS[xp.level - 1]?.xpNeeded || 0))) * 100) : 100
  const survivalBest = getSurvivalBest()
  const speedBest = getSpeedBest()

  const goalPct = Math.min(100, Math.round((dailyProgress.count / dailyGoalVal) * 100))
  const goalMet = dailyProgress.count >= dailyGoalVal

  const toggleCat = (cat) => {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const handleStart = () => {
    onStart({ mode, numQuestions: numQ, range, shuffle: shuffleOn, confirmBeforeSubmit: confirm, categories: selectedCats })
  }

  const handleQuick10 = () => {
    onStart({ mode: 'mc', numQuestions: 10, range: 'all', shuffle: true, confirmBeforeSubmit: false, categories: [] })
  }

  const handleMockExam = () => {
    onStart({ mode: 'mc', numQuestions: 240, range: 'all', shuffle: false, confirmBeforeSubmit: true, categories: [], isMockExam: true })
  }

  const handleLevelUp = () => {
    onStart({ mode: 'levelup', numQuestions: 10, range: 'all', shuffle: true, confirmBeforeSubmit: false, categories: selectedCats.length > 0 ? selectedCats : [] })
  }

  const handleGoalChange = (val) => {
    setDailyGoalVal(val)
    setDailyGoal(val)
    setShowGoalPicker(false)
  }

  const toggleSound = () => { const v = !sound; setSound(v); setSoundPref(v) }
  const handleSignInGoogle = async () => { setSigningIn(true); setAuthError(null); try { await signInWithGoogle() } catch (err) { setAuthError(err.message) } finally { setSigningIn(false) } }
  
  const isDark = theme === 'dark'

  return (
    <div style={s.container} className="animate-in">
      {/* Top controls */}
      <div style={s.topControls}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onStats} style={s.iconBtn}><BarChart2 size={18} /></button>
          <button onClick={onLeaderboard} style={s.iconBtn} title="Leaderboard"><Trophy size={18} /></button>
        </div>
        <div style={s.topRight}>
          {user && <button onClick={onProfile} style={s.iconBtn} title="Profile"><User size={18} /></button>}
          <button onClick={toggleSound} style={s.iconBtn}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} style={s.iconBtn}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>

      {/* Auth / Sign In */}
      {!user ? (
        <div style={s.authCard}>
          <LogIn size={16} style={{ color: 'var(--cyan)' }} />
          <span style={s.authText}>Sign in to compete on leaderboards & duel</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleSignInGoogle} disabled={signingIn} style={s.authBtn}>{signingIn ? 'Signing in...' : 'Google'}</button>
            
          </div>
          {authError && <div style={s.authError}>{authError}</div>}
        </div>
      ) : (
        <div style={s.authCard}>
          <div style={s.userAvatar}>{user.photoURL ? <img src={user.photoURL} alt="" style={s.userAvatarImg} /> : <span>{(user.displayName || 'A')[0].toUpperCase()}</span>}</div>
          <span style={s.authText}>{user.displayName || 'Anonymous'}</span>
          <button onClick={onDuel} style={s.duelNavBtn}><Swords size={14} /> Duel</button>
          {onAdmin && <button onClick={onAdmin} style={s.duelNavBtn}>👑 Admin</button>}
          <button onClick={() => {
            const text = '🥛 Test your Scripture knowledge with Milk Trivia!\nhttps://milk.cyberjudah.io'
            if (navigator.share) navigator.share({ title: 'Milk Trivia', text }).catch(() => {})
            else { navigator.clipboard.writeText(text); alert('Link copied!') }
          }} style={s.duelNavBtn}>📨 Invite</button>
        </div>
      )}

      {/* Header */}
      <header style={s.header}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="CyberJudah" style={s.logo} />
        <h1 style={s.title}>240 Milk Questions</h1>
        <p style={s.subtitle}>CyberJudah.io — Scripture Trivia</p>
      </header>

      {/* Stats + XP + Daily Goal — combined card */}
      <div style={s.comboCard}>
        <div style={s.statsRow}>
          <div style={s.statItem}>
            <Flame size={14} style={{ color: streak.current > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
            <span style={s.statNum}>{streak.current}</span>
            <span style={s.statLabel}>streak</span>
          </div>
          <div style={s.statDivider} />
          <div style={s.statItem}>
            <Target size={14} style={{ color: 'var(--cyan)' }} />
            <span style={s.statNum}>{totalStudied}</span>
            <span style={s.statLabel}>answered</span>
          </div>
          <div style={s.statDivider} />
          <div style={s.statItem}>
            <AlertCircle size={14} style={{ color: missedCount > 0 ? 'var(--red)' : 'var(--green)' }} />
            <span style={s.statNum}>{missedCount}</span>
            <span style={s.statLabel}>missed</span>
          </div>
        </div>

        <div style={s.progressSection}>
          <div style={s.progressRow}>
            <span style={s.progressLabel}><Award size={12} style={{ color: 'var(--accent)', marginRight: 4 }} />Lv{xp.level} {xp.title}</span>
            <span style={s.progressVal}>{xp.total} XP</span>
          </div>
          <div style={s.barOuter}>
            <div style={{ ...s.barFill, width: `${xpPct}%`, background: 'linear-gradient(90deg, var(--accent), #D97706)' }} />
          </div>
        </div>

        <div style={s.progressSection}>
          <div style={s.progressRow}>
            <span style={s.progressLabel}><Star size={12} style={{ color: goalMet ? 'var(--accent)' : 'var(--cyan)', marginRight: 4 }} />Daily Goal</span>
            <button onClick={() => setShowGoalPicker(!showGoalPicker)} style={s.goalEditBtn}>
              {goalMet ? `${dailyProgress.count} done` : `${dailyProgress.count}/${dailyGoalVal}`}
            </button>
          </div>
          <div style={s.barOuter}>
            <div style={{ ...s.barFill, width: `${goalPct}%`, background: goalMet ? 'var(--green)' : 'var(--cyan)' }} />
          </div>
          {showGoalPicker && (
            <div style={s.goalPicker}>
              {[10, 20, 30, 50, 100].map(v => (
                <button key={v} onClick={() => handleGoalChange(v)} style={{ ...s.pill, ...(dailyGoalVal === v ? s.pillActive : {}) }}>{v}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Question of the Day — compact */}
      {qotdQuestion && (
        <div style={s.qotdCard}>
          <div style={s.qotdRow}>
            <Clock size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={s.qotdQ}>Q{qotdQuestion.n}) {qotdQuestion.q.length > 60 ? qotdQuestion.q.slice(0, 57) + '...' : qotdQuestion.q}</span>
            {!qotd.answered ? (
              <button onClick={() => onQOTD(qotdQuestion)} style={s.qotdBtn}>Answer</button>
            ) : (
              <span style={{ ...s.qotdBadge, color: qotd.correct ? 'var(--green)' : 'var(--red)' }}>
                {qotd.correct ? '✓' : '✗'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={s.quickRow}>
        <button onClick={handleQuick10} style={s.quickBtn}>
          <Zap size={16} style={{ color: 'var(--accent)' }} />
          <span>Quick 10</span>
        </button>
        <button onClick={handleMockExam} style={s.quickBtn}>
          <Trophy size={16} style={{ color: 'var(--cyan)' }} />
          <span>Mock Exam</span>
        </button>
      </div>

      {/* Resume banner */}
      {resumeData && (
        <div style={s.resumeBanner}>
          <div>
            <strong>Active quiz in progress</strong>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Question {resumeData.idx + 1} of {resumeData.questions.length} · {resumeData.score} correct</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onResume} style={s.resumeBtn}>Resume</button>
            <button onClick={onDismissResume} style={s.dismissBtn}>✕</button>
          </div>
        </div>
      )}

      {/* Milk Question Modes */}
      <section style={s.section}>
        <div style={s.secLabel}>MILK QUESTIONS</div>
        <div style={s.modeGrid}>
          {modes.filter(m => m.group === 'milk').map(m => {
            const Icon = m.icon; const active = mode === m.id
            const disabled = m.id === 'missed' && missedCount === 0
            let desc = m.desc
            if (m.id === 'missed') desc = `${missedCount} questions`
            if (m.id === 'survival') desc = survivalBest > 0 ? `Best: ${survivalBest}` : 'One wrong = game over'
            if (m.id === 'speed') desc = speedBest > 0 ? `Best: ${speedBest} correct` : '60s arcade mode'
            if (m.id === 'levelup') {
              const totalLevels = Object.values(levelUpProgress)
              const avgLevel = totalLevels.length > 0 ? (totalLevels.reduce((s, l) => s + l.level, 0) / totalLevels.length).toFixed(1) : '0'
              desc = `Avg level: ${avgLevel}`
            }
            return (
              <button key={m.id} onClick={() => !disabled && setMode(m.id)} style={{ ...s.modeCard, ...(active ? s.modeActive : {}), ...(disabled ? { opacity: 0.35, cursor: 'default' } : {}) }}>
                <Icon size={20} style={{ color: active ? 'var(--cyan)' : 'var(--text-muted)', marginBottom: 3 }} />
                <span style={{ ...s.modeName, color: active ? 'var(--cyan)' : 'var(--text-sec)' }}>{m.label}</span>
                <span style={s.modeDesc}>{desc}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Bible Game Modes */}
      <section style={s.section}>
        <div style={s.secLabel}>BIBLE GAMES</div>
        <div style={s.modeGrid}>
          {modes.filter(m => m.group === 'bible').map(m => {
            const Icon = m.icon; const active = mode === m.id
            return (
              <button key={m.id} onClick={() => setMode(m.id)} style={{ ...s.modeCard, ...(active ? s.modeActiveGold : {})}}>
                <Icon size={20} style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 3 }} />
                <span style={{ ...s.modeName, color: active ? 'var(--accent)' : 'var(--text-sec)' }}>{m.label}</span>
                <span style={s.modeDesc}>{m.desc}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Categories */}
      <section style={s.section}>
        <div style={s.secLabel}>FILTER BY CATEGORY <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></div>
        <div style={s.catGrid}>
          {getAllCategoryKeys().map(key => {
            const cat = CATEGORY_LABELS[key]; const active = selectedCats.includes(key)
            return (
              <button key={key} onClick={() => toggleCat(key)} style={{ ...s.catPill, ...(active ? { background: cat.color + '22', borderColor: cat.color, color: cat.color } : {}) }}>
                <CatIcon icon={cat.icon} /> {cat.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Settings */}
      <section style={s.card}>
        <div style={s.secLabel}>⚙ SETTINGS</div>
        <div style={s.row}>
          <label style={s.label}>Questions</label>
          <div style={s.pills}>{counts.map(c => (
            <button key={c} onClick={() => setNumQ(c)} style={{ ...s.pill, ...(numQ === c ? s.pillActive : {}) }}>{c === 240 ? 'ALL' : c}</button>
          ))}</div>
        </div>
        <div style={s.row}>
          <label style={s.label}>Range</label>
          <div style={s.selectWrap}>
            <select value={range} onChange={e => setRange(e.target.value)} style={s.select}>
              {ranges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown size={14} style={s.selectArr} />
          </div>
        </div>
        <div style={s.row}>
          <label style={s.label}><Shuffle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Shuffle</label>
          <Toggle on={shuffleOn} onToggle={() => setShuffleOn(!shuffleOn)} />
        </div>
        <div style={s.row}>
          <label style={s.label}>Confirm before submit</label>
          <Toggle on={confirm} onToggle={() => setConfirm(!confirm)} />
        </div>
      </section>

      <button onClick={mode === 'memory' ? onMemoryGame : mode === 'mock' ? handleMockExam : mode === 'levelup' ? handleLevelUp : handleStart}
        style={{ ...s.startBtn, ...(modes.find(m => m.id === mode)?.group === 'bible' ? { background: 'linear-gradient(135deg, var(--accent), #D97706)', boxShadow: '0 0 25px rgba(251,191,36,0.2)' } : {}), ...(mode === 'survival' ? { background: 'linear-gradient(135deg, var(--red), #DC2626)', boxShadow: '0 0 25px rgba(255,51,102,0.2)' } : {}), ...(mode === 'speed' ? { background: 'linear-gradient(135deg, var(--accent), var(--cyan))', boxShadow: '0 0 25px rgba(251,191,36,0.2)' } : {}) }}>
        {mode === 'memory' ? 'START BIBLE MEMORY' : mode === 'mock' ? 'START MOCK EXAM' : mode === 'levelup' ? 'START LEVEL UP' : mode === 'survival' ? 'START SURVIVAL' : mode === 'speed' ? 'START SPEED ROUND' : mode === 'match' ? 'START SCRIPTURE MATCH' : mode === 'virtuous' ? 'START VIRTUOUS WOMAN' : mode === 'virtuous_fillin' ? 'START SISTERS FILL IN' : mode === 'virtuous_scenario' ? 'START SISTERS SCENARIO' : mode === 'catrush' ? 'START CATEGORY RUSH' : 'START GAME'}
      </button>

      <a href={`${import.meta.env.BASE_URL}240_Milk_Questions.pdf`} download style={s.dlLink}>
        <Download size={15} /> Download 240 Milk Questions PDF
      </a>
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{ ...s.toggle, ...(on ? s.toggleOn : {}) }}>
      <div style={{ ...s.thumb, ...(on ? s.thumbOn : {}) }} />
    </button>
  )
}

const s = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 16px 80px' },
  topControls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 },
  topRight: { display: 'flex', gap: 8 },
  iconBtn: { width: 36, height: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-sec)', cursor: 'pointer', padding: 0, flexShrink: 0 },
  header: { textAlign: 'center', marginBottom: 14 },
  logo: { width: 80, height: 80, borderRadius: 12, marginBottom: 8, filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.3))' },
  title: { fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 5vw, 30px)', fontWeight: 800, color: 'var(--cyan)', letterSpacing: 2, lineHeight: 1.2, textShadow: '0 0 30px rgba(0,212,255,0.2)' },
  subtitle: { fontSize: 14, color: 'var(--text-sec)', fontWeight: 500, marginTop: 4, letterSpacing: 1 },
  // Combined stats + progress card
  comboCard: { padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 10 },
  statsRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 },
  statItem: { display: 'flex', alignItems: 'center', gap: 4 },
  statNum: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--text)' },
  statLabel: { fontSize: 10, color: 'var(--text-muted)' },
  statDivider: { width: 1, height: 16, background: 'var(--border)' },
  progressSection: { marginBottom: 6 },
  progressRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  progressLabel: { display: 'flex', alignItems: 'center', fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-sec)' },
  progressVal: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' },
  barOuter: { width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, transition: 'width 0.5s ease' },
  resumeBanner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,212,255,0.08)', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-sm)', marginBottom: 10, fontSize: 12, color: 'var(--text)' },
  resumeBtn: { padding: '6px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--cyan)', border: 'none', borderRadius: 6, color: 'var(--bg)', cursor: 'pointer' },
  dismissBtn: { padding: '6px 10px', fontSize: 14, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer' },
  section: { marginBottom: 12 },
  secLabel: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 8 },
  modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  modeCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', transition: 'all 0.2s', outline: 'none', textAlign: 'center', cursor: 'pointer' },
  modeActive: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)', boxShadow: '0 0 15px rgba(0,212,255,0.12)' },
  modeActiveGold: { borderColor: 'var(--accent)', background: 'rgba(251,191,36,0.08)', boxShadow: '0 0 15px rgba(251,191,36,0.12)' },
  modeName: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 600, letterSpacing: 0.8, marginBottom: 1 },
  modeDesc: { fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 },
  catGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  catPill: { padding: '5px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 16, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 12 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,212,255,0.04)', gap: 8, flexWrap: 'wrap' },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' },
  pills: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  pill: { padding: '4px 11px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', border: '1px solid var(--border)', borderRadius: 16, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' },
  pillActive: { background: 'var(--cyan)', borderColor: 'var(--cyan)', color: 'var(--bg)' },
  selectWrap: { position: 'relative' },
  select: { appearance: 'none', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 26px 6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' },
  selectArr: { position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
  toggle: { width: 40, height: 22, borderRadius: 11, border: '2px solid var(--border)', background: 'var(--bg-elevated)', position: 'relative', transition: 'all 0.2s', padding: 0, cursor: 'pointer', flexShrink: 0 },
  toggleOn: { background: 'var(--cyan)', borderColor: 'var(--cyan)' },
  thumb: { width: 14, height: 14, borderRadius: '50%', background: 'var(--text-muted)', position: 'absolute', top: 2, left: 2, transition: 'all 0.2s' },
  thumbOn: { left: 20, background: 'var(--bg)' },
  startBtn: { display: 'flex', width: '100%', justifyContent: 'center', padding: '13px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 2, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 20px rgba(0,212,255,0.15)', marginBottom: 8, cursor: 'pointer' },
  dlLink: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--cyan-dim)', background: 'var(--cyan-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' },
  goalEditBtn: { padding: '2px 8px', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer' },
  goalPicker: { display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  // QOTD styles
  qotdCard: { padding: '8px 12px', background: 'linear-gradient(135deg, rgba(251,191,36,0.04), rgba(0,212,255,0.02))', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 'var(--radius-sm)', marginBottom: 10 },
  qotdRow: { display: 'flex', alignItems: 'center', gap: 8 },
  qotdQ: { flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 },
  qotdBtn: { padding: '4px 12px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 0.5, color: 'var(--bg)', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  qotdBadge: { fontSize: 14, fontWeight: 700, flexShrink: 0 },
  // Quick action styles
  quickRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 },
  quickBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--text)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  // Auth styles
  authCard: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 10, flexWrap: 'wrap' },
  authText: { fontSize: 12, fontWeight: 600, color: 'var(--text-sec)', flex: 1, minWidth: 100 },
  authBtn: { padding: '6px 14px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 0.5, color: '#fff', background: 'var(--cyan)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  authBtnSec: { padding: '6px 14px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 0.5, color: 'var(--text-sec)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  authError: { width: '100%', fontSize: 11, color: 'var(--red)', background: 'var(--red-subtle)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,51,102,0.15)', marginTop: 4 },
  userAvatar: { width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff', flexShrink: 0, overflow: 'hidden' },
  userAvatarImg: { width: 28, height: 28, borderRadius: '50%' },
  duelNavBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 0.5, color: 'var(--accent)', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
}
