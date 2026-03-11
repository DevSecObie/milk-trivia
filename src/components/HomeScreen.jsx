import { useState } from 'react'
import { BookCheck, Keyboard, BookOpen, Timer, Download, ChevronDown, Shuffle, Shield, BarChart3, Trophy, AlertCircle, Tag, Zap, Flame } from 'lucide-react'
import { getMissedQuestions, getStreak, ALL_CATEGORIES } from '../utils/storage'

const modes = [
  { id: 'mc', icon: BookCheck, label: 'Multiple Choice', desc: 'Select the correct scripture(s)' },
  { id: 'type', icon: Keyboard, label: 'Type It', desc: 'Type references from memory' },
  { id: 'flash', icon: BookOpen, label: 'Flashcards', desc: 'Study at your own pace' },
  { id: 'timed', icon: Timer, label: 'Timed Quiz', desc: '15 seconds per question' },
]
const ranges = [
  { value: 'all', label: 'All (1–240)' },
  { value: '1-50', label: '1–50' }, { value: '51-100', label: '51–100' },
  { value: '101-150', label: '101–150' }, { value: '151-200', label: '151–200' },
  { value: '201-240', label: '201–240' },
]
const counts = [10, 20, 30, 50, 100, 150, 240]

export default function HomeScreen({ onStart, onStats, onLeaderboard }) {
  const [mode, setMode] = useState('mc')
  const [numQuestions, setNumQuestions] = useState(50)
  const [range, setRange] = useState('all')
  const [shuffleOn, setShuffleOn] = useState(true)
  const [confirmBeforeSubmit, setConfirmBeforeSubmit] = useState(true)
  const [reviewMissed, setReviewMissed] = useState(false)
  const [weightedShuffle, setWeightedShuffle] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState([])

  const missed = getMissedQuestions()
  const missedCount = Object.keys(missed).length
  const streak = getStreak()

  const toggleCategory = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const handleStart = () => {
    onStart({
      mode, numQuestions, range, shuffle: shuffleOn, confirmBeforeSubmit,
      reviewMissed, weightedShuffle,
      categories: selectedCategories,
    })
  }

  return (
    <div style={s.container} className="animate-in">
      <header style={s.header}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="CyberJudah" style={s.logo} />
        <div>
          <h1 style={s.title}>240 Milk Questions</h1>
          <p style={s.subtitle}>Scripture Trivia — Powered by CyberJudah.io</p>
        </div>
      </header>

      {/* Streak Banner */}
      {streak.current > 0 && (
        <div style={s.streakPill}>
          <Flame size={14} style={{ color: '#FF8800' }} />
          <span>{streak.current} day streak!</span>
        </div>
      )}

      {/* Quick Actions */}
      <div style={s.quickRow}>
        <button onClick={onStats} style={s.quickBtn}>
          <BarChart3 size={16} style={{ color: 'var(--cyan)' }} />
          <span>Stats</span>
        </button>
        <button onClick={onLeaderboard} style={s.quickBtn}>
          <Trophy size={16} style={{ color: '#FFD700' }} />
          <span>Leaderboard</span>
        </button>
        {missedCount > 0 && (
          <button onClick={() => { setReviewMissed(true); }} style={{ ...s.quickBtn, borderColor: 'rgba(255,51,102,0.3)' }}>
            <AlertCircle size={16} style={{ color: 'var(--red)' }} />
            <span>Review ({missedCount})</span>
          </button>
        )}
      </div>

      {/* Mode Selection */}
      <section style={s.section}>
        <div style={s.sectionLabel}><Shield size={14} /> SELECT MODE</div>
        <div style={s.modeGrid}>
          {modes.map(m => {
            const Icon = m.icon
            const active = mode === m.id
            return (
              <button key={m.id} onClick={() => setMode(m.id)} style={{ ...s.modeCard, ...(active ? s.modeActive : {}) }}>
                <Icon size={22} style={{ color: active ? 'var(--cyan)' : 'var(--text-muted)', marginBottom: 4 }} />
                <span style={{ ...s.modeName, color: active ? 'var(--cyan)' : 'var(--text-secondary)' }}>{m.label}</span>
                <span style={s.modeDesc}>{m.desc}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Settings */}
      <section style={s.card}>
        <div style={s.sectionLabel}>⚙ SETTINGS</div>

        <div style={s.row}>
          <label style={s.label}>Questions</label>
          <div style={s.pills}>
            {counts.map(c => (
              <button key={c} onClick={() => setNumQuestions(c)} style={{ ...s.pill, ...(numQuestions === c ? s.pillActive : {}) }}>
                {c === 240 ? 'ALL' : c}
              </button>
            ))}
          </div>
        </div>

        <div style={s.row}>
          <label style={s.label}>Range</label>
          <div style={s.selectWrap}>
            <select value={range} onChange={e => setRange(e.target.value)} style={s.select}>
              {ranges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown size={14} style={s.selectArrow} />
          </div>
        </div>

        <div style={s.row}>
          <label style={s.label}><Shuffle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Shuffle</label>
          <button onClick={() => { setShuffleOn(!shuffleOn); if (!shuffleOn) setWeightedShuffle(false) }} style={{ ...s.toggle, ...(shuffleOn ? s.toggleOn : {}) }}>
            <div style={{ ...s.thumb, ...(shuffleOn ? s.thumbOn : {}) }} />
          </button>
        </div>

        <div style={s.row}>
          <label style={s.label}><Zap size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Smart Shuffle</label>
          <button onClick={() => { setWeightedShuffle(!weightedShuffle); if (!weightedShuffle) setShuffleOn(true) }} style={{ ...s.toggle, ...(weightedShuffle ? s.toggleOn : {}) }}>
            <div style={{ ...s.thumb, ...(weightedShuffle ? s.thumbOn : {}) }} />
          </button>
        </div>
        <div style={s.hint}>Missed questions appear first when enabled.</div>

        <div style={s.row}>
          <label style={s.label}>Confirm before submit</label>
          <button onClick={() => setConfirmBeforeSubmit(!confirmBeforeSubmit)} style={{ ...s.toggle, ...(confirmBeforeSubmit ? s.toggleOn : {}) }}>
            <div style={{ ...s.thumb, ...(confirmBeforeSubmit ? s.thumbOn : {}) }} />
          </button>
        </div>

        {reviewMissed && (
          <div style={s.row}>
            <label style={s.label}><AlertCircle size={14} style={{ marginRight: 6, verticalAlign: -2, color: 'var(--red)' }} />Review Missed Only</label>
            <button onClick={() => setReviewMissed(!reviewMissed)} style={{ ...s.toggle, ...(reviewMissed ? { ...s.toggleOn, background: 'var(--red)', borderColor: 'var(--red)' } : {}) }}>
              <div style={{ ...s.thumb, ...(reviewMissed ? s.thumbOn : {}) }} />
            </button>
          </div>
        )}
      </section>

      {/* Category Tags */}
      <section style={s.card}>
        <button onClick={() => setShowCategories(!showCategories)} style={s.catToggle}>
          <div style={s.sectionLabel}><Tag size={14} /> CATEGORIES {selectedCategories.length > 0 ? `(${selectedCategories.length})` : '(ALL)'}</div>
          <ChevronDown size={14} style={{ transform: showCategories ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'var(--cyan-dim)' }} />
        </button>
        {showCategories && (
          <div style={s.catGrid}>
            {ALL_CATEGORIES.map(cat => {
              const active = selectedCategories.includes(cat)
              return (
                <button key={cat} onClick={() => toggleCategory(cat)} style={{ ...s.catPill, ...(active ? s.catPillActive : {}) }}>
                  {cat}
                </button>
              )
            })}
            {selectedCategories.length > 0 && (
              <button onClick={() => setSelectedCategories([])} style={s.catClear}>Clear All</button>
            )}
          </div>
        )}
      </section>

      <button onClick={handleStart} style={s.startBtn}>
        <span style={s.startGlow} />
        {reviewMissed ? 'REVIEW MISSED' : 'INITIALIZE TEST'}
      </button>

      <a href={`${import.meta.env.BASE_URL}240_Milk_Questions.pdf`} download style={s.downloadLink}>
        <Download size={15} /> Download 240 Milk Questions PDF
      </a>
    </div>
  )
}

const s = {
  container: { maxWidth: 640, margin: '0 auto', padding: '24px 20px 80px' },
  header: { textAlign: 'center', marginBottom: 24 },
  logo: { width: 120, height: 120, borderRadius: 16, marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.3))' },
  title: { fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 5.5vw, 32px)', fontWeight: 800, color: 'var(--cyan)', letterSpacing: 2, lineHeight: 1.2, textShadow: '0 0 30px rgba(0,212,255,0.3)' },
  subtitle: { fontSize: 15, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 6, letterSpacing: 1 },
  streakPill: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.2)', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)', color: '#FF8800', letterSpacing: 1, marginBottom: 16, width: 'fit-content', margin: '0 auto 16px' },
  quickRow: { display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' },
  quickBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', letterSpacing: 1, backdropFilter: 'blur(8px)', transition: 'all 0.2s' },
  section: { marginBottom: 20 },
  sectionLabel: { fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
  modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  modeCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 10px 14px',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', transition: 'all 0.25s', outline: 'none', textAlign: 'center',
    backdropFilter: 'blur(10px)',
  },
  modeActive: {
    borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)',
    boxShadow: '0 0 20px rgba(0,212,255,0.15), inset 0 0 20px rgba(0,212,255,0.05)',
  },
  modeName: { fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 2 },
  modeDesc: { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '18px 18px 14px', marginBottom: 20,
    backdropFilter: 'blur(10px)',
  },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,212,255,0.06)', gap: 10, flexWrap: 'wrap' },
  label: { fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' },
  pills: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  pill: { padding: '5px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', border: '1px solid var(--border)', borderRadius: 20, background: 'transparent', color: 'var(--text-muted)', transition: 'all 0.15s' },
  pillActive: { background: 'var(--cyan)', borderColor: 'var(--cyan)', color: 'var(--bg)' },
  selectWrap: { position: 'relative' },
  select: { appearance: 'none', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 28px 7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' },
  selectArrow: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
  toggle: { width: 42, height: 22, borderRadius: 11, border: '2px solid var(--border)', background: 'var(--bg-elevated)', position: 'relative', transition: 'all 0.2s', padding: 0, flexShrink: 0 },
  toggleOn: { background: 'var(--cyan)', borderColor: 'var(--cyan)' },
  thumb: { width: 14, height: 14, borderRadius: '50%', background: 'var(--text-muted)', position: 'absolute', top: 2, left: 2, transition: 'all 0.2s' },
  thumbOn: { left: 22, background: 'var(--bg)' },
  hint: { fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' },
  catToggle: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' },
  catGrid: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  catPill: { padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', border: '1px solid var(--border)', borderRadius: 16, background: 'transparent', color: 'var(--text-muted)', transition: 'all 0.15s' },
  catPillActive: { background: 'var(--cyan)', borderColor: 'var(--cyan)', color: 'var(--bg)' },
  catClear: { padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,51,102,0.2)', borderRadius: 16, background: 'var(--red-subtle)', color: 'var(--red)' },
  startBtn: {
    display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center',
    padding: '16px 24px', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)',
    letterSpacing: 3, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))',
    border: 'none', borderRadius: 'var(--radius)', position: 'relative', overflow: 'hidden',
    boxShadow: '0 0 30px rgba(0,212,255,0.25), 0 4px 20px rgba(0,0,0,0.3)',
    marginBottom: 16, transition: 'all 0.3s',
  },
  startGlow: { position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)', animation: 'none' },
  downloadLink: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
    padding: '10px 18px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)',
    color: 'var(--cyan-dim)', background: 'var(--cyan-subtle)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    textDecoration: 'none', transition: 'all 0.2s',
  },
}
