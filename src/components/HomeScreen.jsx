import { useState } from 'react'
import { BookCheck, Keyboard, BookOpen, Timer, Download, ChevronDown, Shuffle, BarChart2, Flame, AlertCircle, Sun, Moon, Volume2, VolumeX, Zap, Target, Trophy, TrendingUp, Clock, Star, TextCursorInput, Brain, HelpCircle, MessageCircle, Scale, Quote, Rocket } from 'lucide-react'
import { getStreak, getMissed, getSessions, isSoundOn, setSoundPref, getSettings, getDailyGoal, setDailyGoal, getDailyProgress, getQOTD, getLevelUpProgress } from '../lib/storage'
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
  { id: 'guessbook', icon: HelpCircle, label: 'Guess the Book', desc: 'Which book is this from?', group: 'bible' },
  { id: 'whosaid', icon: MessageCircle, label: 'Who Said It?', desc: 'Identify the speaker', group: 'bible' },
  { id: 'scenario', icon: Scale, label: 'Scenario', desc: 'Which law applies?', group: 'bible' },
  { id: 'quotecomplete', icon: Quote, label: 'Quote Complete', desc: 'Finish the verse', group: 'bible' },
  { id: 'catrush', icon: Rocket, label: 'Category Rush', desc: 'Topical speed round', group: 'bible' },
  { id: 'memory', icon: Brain, label: 'Bible Memory', desc: 'Learn book order', group: 'bible' },
  { id: 'levelup', icon: TrendingUp, label: 'Level Up', desc: 'Master categories step by step', group: 'milk' },
  { id: 'mock', icon: Trophy, label: 'Mock Exam', desc: 'Full 240-question test', group: 'milk' },
]
const ranges = [
  { value: 'all', label: 'All (1–240)' },
  { value: '1-50', label: '1–50' }, { value: '51-100', label: '51–100' },
  { value: '101-150', label: '101–150' }, { value: '151-200', label: '151–200' },
  { value: '201-240', label: '201–240' },
]
const counts = [10, 20, 30, 50, 100, 240]

export default function HomeScreen({ onStart, onStats, onMemoryGame, onQOTD, resumeData, onResume, onDismissResume, theme, setTheme, allQuestions }) {
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
  const streak = getStreak()
  const missedCount = getMissed().length
  const sessions = getSessions()
  const totalStudied = sessions.reduce((s, x) => s + x.total, 0)
  const dailyProgress = getDailyProgress()
  const qotd = getQOTD(allQuestions.length)
  const qotdQuestion = allQuestions.find(q => q.n === qotd.questionNum)
  const levelUpProgress = getLevelUpProgress()

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
  const isDark = theme === 'dark'

  return (
    <div style={s.container} className="animate-in">
      {/* Top controls */}
      <div style={s.topControls}>
        <button onClick={onStats} style={s.iconBtn}><BarChart2 size={18} /></button>
        <div style={s.topRight}>
          <button onClick={toggleSound} style={s.iconBtn}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} style={s.iconBtn}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>

      {/* Header */}
      <header style={s.header}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="CyberJudah" style={s.logo} />
        <h1 style={s.title}>240 Milk Questions</h1>
        <p style={s.subtitle}>CyberJudah.io — Scripture Trivia</p>
      </header>

      {/* Streak & Stats bar */}
      <div style={s.streakBar}>
        <div style={s.streakItem}>
          <Flame size={16} style={{ color: streak.current > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
          <span style={s.streakNum}>{streak.current}</span>
          <span style={s.streakLabel}>day streak</span>
        </div>
        <div style={s.streakDivider} />
        <div style={s.streakItem}>
          <Target size={16} style={{ color: 'var(--cyan)' }} />
          <span style={s.streakNum}>{totalStudied}</span>
          <span style={s.streakLabel}>answered</span>
        </div>
        <div style={s.streakDivider} />
        <div style={s.streakItem}>
          <AlertCircle size={16} style={{ color: missedCount > 0 ? 'var(--red)' : 'var(--green)' }} />
          <span style={s.streakNum}>{missedCount}</span>
          <span style={s.streakLabel}>missed</span>
        </div>
      </div>

      {/* Daily Study Goal */}
      <div style={s.goalCard}>
        <div style={s.goalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} style={{ color: goalMet ? 'var(--accent)' : 'var(--cyan)' }} />
            <span style={s.goalTitle}>DAILY GOAL</span>
          </div>
          <button onClick={() => setShowGoalPicker(!showGoalPicker)} style={s.goalEditBtn}>{dailyGoalVal}q/day</button>
        </div>
        <div style={s.goalBarOuter}>
          <div style={{ ...s.goalBarFill, width: `${goalPct}%`, background: goalMet ? 'var(--green)' : 'var(--cyan)' }} />
        </div>
        <div style={s.goalText}>
          {goalMet
            ? `Goal reached! ${dailyProgress.count} questions today`
            : `${dailyProgress.count} / ${dailyGoalVal} questions today`}
        </div>
        {showGoalPicker && (
          <div style={s.goalPicker}>
            {[10, 20, 30, 50, 100].map(v => (
              <button key={v} onClick={() => handleGoalChange(v)} style={{ ...s.pill, ...(dailyGoalVal === v ? s.pillActive : {}) }}>{v}</button>
            ))}
          </div>
        )}
      </div>

      {/* Question of the Day */}
      {qotdQuestion && (
        <div style={s.qotdCard}>
          <div style={s.qotdHeader}>
            <Clock size={14} style={{ color: 'var(--accent)' }} />
            <span style={s.qotdLabel}>QUESTION OF THE DAY</span>
            {qotd.answered && (
              <span style={{ ...s.qotdBadge, background: qotd.correct ? 'var(--green-subtle)' : 'var(--red-subtle)', color: qotd.correct ? 'var(--green)' : 'var(--red)', borderColor: qotd.correct ? 'var(--green)' : 'var(--red)' }}>
                {qotd.correct ? '✓ Correct' : '✗ Missed'}
              </span>
            )}
          </div>
          <p style={s.qotdQ}>Q{qotdQuestion.n}) {qotdQuestion.q}</p>
          {!qotd.answered ? (
            <button onClick={() => onQOTD(qotdQuestion)} style={s.qotdBtn}>Answer Now</button>
          ) : (
            <div style={s.qotdAns}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)' }}>{qotdQuestion.a}</span>
            </div>
          )}
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
        style={{ ...s.startBtn, ...(modes.find(m => m.id === mode)?.group === 'bible' ? { background: 'linear-gradient(135deg, var(--accent), #D97706)', boxShadow: '0 0 25px rgba(251,191,36,0.2)' } : {}) }}>
        {mode === 'memory' ? 'START BIBLE MEMORY' : mode === 'mock' ? 'START MOCK EXAM' : mode === 'levelup' ? 'START LEVEL UP' : mode === 'catrush' ? 'START CATEGORY RUSH' : 'START GAME'}
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
  header: { textAlign: 'center', marginBottom: 20 },
  logo: { width: 100, height: 100, borderRadius: 14, marginBottom: 12, filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.3))' },
  title: { fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 5vw, 30px)', fontWeight: 800, color: 'var(--cyan)', letterSpacing: 2, lineHeight: 1.2, textShadow: '0 0 30px rgba(0,212,255,0.2)' },
  subtitle: { fontSize: 14, color: 'var(--text-sec)', fontWeight: 500, marginTop: 4, letterSpacing: 1 },
  streakBar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 20, backdropFilter: 'blur(10px)' },
  streakItem: { display: 'flex', alignItems: 'center', gap: 5 },
  streakNum: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text)' },
  streakLabel: { fontSize: 11, color: 'var(--text-muted)' },
  streakDivider: { width: 1, height: 20, background: 'var(--border)' },
  resumeBanner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,212,255,0.08)', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-sm)', marginBottom: 18, fontSize: 13, color: 'var(--text)' },
  resumeBtn: { padding: '6px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--cyan)', border: 'none', borderRadius: 6, color: 'var(--bg)', cursor: 'pointer' },
  dismissBtn: { padding: '6px 10px', fontSize: 14, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer' },
  section: { marginBottom: 18 },
  secLabel: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 8 },
  modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  modeCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', transition: 'all 0.2s', outline: 'none', textAlign: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' },
  modeActive: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)', boxShadow: '0 0 15px rgba(0,212,255,0.12)' },
  modeActiveGold: { borderColor: 'var(--accent)', background: 'rgba(251,191,36,0.08)', boxShadow: '0 0 15px rgba(251,191,36,0.12)' },
  modeName: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 600, letterSpacing: 0.8, marginBottom: 1 },
  modeDesc: { fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 },
  catGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  catPill: { padding: '5px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 16, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 18, backdropFilter: 'blur(10px)' },
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
  startBtn: { display: 'flex', width: '100%', justifyContent: 'center', padding: '15px 24px', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 3, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius)', boxShadow: '0 0 25px rgba(0,212,255,0.2)', marginBottom: 10, cursor: 'pointer' },
  dlLink: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--cyan-dim)', background: 'var(--cyan-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' },
  // Daily Goal styles
  goalCard: { padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 14, backdropFilter: 'blur(10px)' },
  goalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalTitle: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)' },
  goalEditBtn: { padding: '3px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', background: 'var(--cyan-subtle)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer' },
  goalBarOuter: { width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  goalBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.5s ease' },
  goalText: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  goalPicker: { display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  // QOTD styles
  qotdCard: { padding: '14px 16px', background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(0,212,255,0.04))', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius)', marginBottom: 14 },
  qotdHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  qotdLabel: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--accent)' },
  qotdBadge: { padding: '2px 8px', fontSize: 10, fontWeight: 600, borderRadius: 10, border: '1px solid', marginLeft: 'auto' },
  qotdQ: { fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.5, marginBottom: 10 },
  qotdBtn: { padding: '8px 18px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--bg)', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  qotdAns: { padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' },
  // Quick action styles
  quickRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  quickBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--text)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', backdropFilter: 'blur(10px)' },
}
