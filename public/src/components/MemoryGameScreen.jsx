import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Brain, Zap, Trophy, RotateCcw } from 'lucide-react'
import { generateRound, DIFFICULTY_LEVELS, QUESTION_TYPES } from '../lib/memoryGame'
import { BIBLE_BOOKS, SECTIONS } from '../data/bibleBooks'
import { playCorrect, playIncorrect, playClick, playSuccess } from '../lib/sounds'
import { isSoundOn } from '../lib/storage'
import { useSwipe } from '../lib/useSwipe'

export default function MemoryGameScreen({ onBack }) {
  const [phase, setPhase] = useState('setup') // setup | playing | results
  const [difficulty, setDifficulty] = useState('medium')
  const [roundSize, setRoundSize] = useState(10)
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])
  const [picked, setPicked] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  // Missed questions for re-drill
  const [missedPool, setMissedPool] = useState([])

  const sfx = (fn) => { if (isSoundOn()) fn() }

  const startRound = (missedOnly = false) => {
    let qs
    if (missedOnly && missedPool.length > 0) {
      qs = missedPool.map(m => m.question)
    } else {
      qs = generateRound(roundSize, difficulty)
    }
    setQuestions(qs)
    setIdx(0); setScore(0); setAnswers([]); setPicked(null); setSubmitted(false)
    setStreak(0); setBestStreak(0)
    setPhase('playing')
  }

  const selectOption = (opt) => {
    if (submitted) return
    sfx(playClick)
    setPicked(opt)
  }

  const submitAnswer = () => {
    if (!picked || submitted) return
    const q = questions[idx]
    const isCorrect = picked === q.answer
    setSubmitted(true)
    sfx(isCorrect ? playCorrect : playIncorrect)
    if (isCorrect) {
      setScore(s => s + 1)
      setStreak(s => { const ns = s + 1; if (ns > bestStreak) setBestStreak(ns); return ns })
    } else {
      setStreak(0)
      setMissedPool(prev => [...prev, { question: q, given: picked }])
    }
    setAnswers(prev => [...prev, { q, correct: isCorrect, given: picked }])
  }

  const nextQ = useCallback(() => {
    if (!submitted) return
    if (idx + 1 >= questions.length) {
      if (isSoundOn() && score / questions.length >= 0.7) playSuccess()
      setPhase('results')
      return
    }
    setIdx(idx + 1); setPicked(null); setSubmitted(false)
  }, [submitted, idx, questions.length, score])

  useSwipe(null, submitted ? nextQ : null)

  const q = questions[idx]
  const total = questions.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  // SETUP SCREEN
  if (phase === 'setup') {
    return (
      <div style={s.container} className="animate-in">
        <button onClick={onBack} style={s.backBtn}><ArrowLeft size={16} /> Back</button>
        <div style={s.setupHeader}>
          <Brain size={32} style={{ color: 'var(--cyan)' }} />
          <h1 style={s.setupTitle}>BIBLE MEMORY GAME</h1>
          <p style={s.setupDesc}>Memorize the order of all 80 books — Old Testament, Apocrypha, and New Testament</p>
        </div>

        <div style={s.card}>
          <div style={s.secLabel}>DIFFICULTY</div>
          <div style={s.diffGrid}>
            {DIFFICULTY_LEVELS.map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id)} style={{ ...s.diffCard, ...(difficulty === d.id ? { borderColor: d.color, background: d.color + '11', boxShadow: `0 0 12px ${d.color}22` } : {}) }}>
                <div style={{ ...s.diffLabel, color: difficulty === d.id ? d.color : 'var(--text-sec)' }}>{d.label}</div>
                <div style={s.diffDesc}>{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.secLabel}>ROUND SIZE</div>
          <div style={s.pills}>
            {[5, 10, 15, 20, 30].map(n => (
              <button key={n} onClick={() => setRoundSize(n)} style={{ ...s.pill, ...(roundSize === n ? s.pillActive : {}) }}>{n}</button>
            ))}
          </div>
        </div>

        <button onClick={() => startRound()} style={s.startBtn}>
          <Zap size={18} /> START ROUND
        </button>

        {missedPool.length > 0 && (
          <button onClick={() => startRound(true)} style={s.missedBtn}>
            <RotateCcw size={16} /> Re-drill {missedPool.length} Missed Questions
          </button>
        )}

        {/* Quick reference */}
        <div style={s.card}>
          <div style={s.secLabel}>📖 BOOK ORDER REFERENCE</div>
          {['OT', 'AP', 'NT'].map(sec => (
            <div key={sec} style={{ marginBottom: 12 }}>
              <div style={{ ...s.refSecTitle, color: sec === 'OT' ? '#60A5FA' : sec === 'AP' ? '#C084FC' : '#34D399' }}>{SECTIONS[sec]}</div>
              <div style={s.refBooks}>
                {BIBLE_BOOKS.filter(b => b.section === sec).map(b => (
                  <span key={b.n} style={s.refBook}><span style={s.refNum}>{b.n}</span>{b.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // PLAYING SCREEN
  if (phase === 'playing' && q) {
    return (
      <div style={s.container}>
        <div style={s.topBar}>
          <span style={s.qCount}>{idx + 1}<span style={{ color: 'var(--text-muted)' }}> / {total}</span></span>
          <div style={{ display: 'flex', gap: 8 }}>
            {streak >= 3 && <span style={s.streakBadge}>🔥 {streak}</span>}
            <span style={s.scoreBadge}>{score} ✓</span>
          </div>
        </div>
        <div style={s.pBar}><div style={{ ...s.pFill, width: `${(idx / total) * 100}%` }} /></div>

        <div key={idx} className="animate-in">
          <div style={s.typeTag}>{q.type.toUpperCase().replace(/([A-Z])/g, ' $1').trim()}</div>
          {q.hint && <div style={s.hintTag}>{q.hint}</div>}
          <h2 style={s.questionText}>{q.question}</h2>

          <div style={s.optGrid}>
            {q.options.map((opt, i) => {
              let optStyle = {}
              if (submitted) {
                if (opt === q.answer) optStyle = s.optCorrect
                else if (opt === picked) optStyle = s.optWrong
                else optStyle = { opacity: 0.35 }
              } else if (opt === picked) optStyle = s.optPicked
              return (
                <button key={i} onClick={() => selectOption(opt)} disabled={submitted} style={{ ...s.opt, ...optStyle }}>
                  {opt}
                </button>
              )
            })}
          </div>

          {submitted && (
            <div style={{ ...s.feedback, background: picked === q.answer ? 'var(--green-subtle)' : 'var(--red-subtle)', borderColor: picked === q.answer ? 'var(--green)' : 'var(--red)', color: picked === q.answer ? 'var(--green)' : 'var(--red)' }}>
              {picked === q.answer ? '✓ Correct!' : `✗ The answer is ${q.answer}`}
            </div>
          )}

          <div style={s.actionRow}>
            {!submitted ? (
              <button onClick={submitAnswer} disabled={!picked} style={s.btnP}>Submit</button>
            ) : (
              <button onClick={nextQ} style={s.btnP}>{idx + 1 >= total ? 'See Results' : 'Next'} <ArrowRight size={16} /></button>
            )}
          </div>
          {submitted && <div style={s.swipeHint}>Swipe right for next →</div>}
        </div>
      </div>
    )
  }

  // RESULTS SCREEN
  return (
    <div style={s.container} className="animate-in">
      <div style={s.resultsHeader}>
        <Trophy size={36} style={{ color: pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--cyan)' : 'var(--red)' }} />
        <div style={s.resPct}>{pct}%</div>
        <div style={s.resLabel}>{score} / {total} correct</div>
        {bestStreak >= 3 && <div style={s.resStreak}>🔥 Best streak: {bestStreak}</div>}
      </div>

      {/* Missed questions review */}
      {answers.filter(a => !a.correct).length > 0 && (
        <div style={s.card}>
          <div style={s.secLabel}>MISSED QUESTIONS</div>
          {answers.filter(a => !a.correct).map((a, i) => (
            <div key={i} style={s.missedItem}>
              <div style={s.missedQ}>{a.q.question}</div>
              <div style={s.missedWrong}>Your answer: {a.given}</div>
              <div style={s.missedRight}>Correct: {a.q.answer}</div>
            </div>
          ))}
        </div>
      )}

      <div style={s.resActions}>
        <button onClick={() => startRound()} style={s.btnP}><RotateCcw size={16} /> New Round</button>
        {answers.filter(a => !a.correct).length > 0 && (
          <button onClick={() => startRound(true)} style={s.btnSecondary}><Zap size={16} /> Re-drill Missed</button>
        )}
      </div>
      <button onClick={() => setPhase('setup')} style={s.backLink}>← Back to Setup</button>
    </div>
  )
}

const s = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 16px 80px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--cyan)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 16 },
  setupHeader: { textAlign: 'center', marginBottom: 24 },
  setupTitle: { fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 4.5vw, 26px)', fontWeight: 800, color: 'var(--cyan)', letterSpacing: 2, marginTop: 8 },
  setupDesc: { fontSize: 14, color: 'var(--text-sec)', marginTop: 6 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 16, backdropFilter: 'blur(10px)' },
  secLabel: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 10 },
  diffGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  diffCard: { padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' },
  diffLabel: { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing: 1 },
  diffDesc: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  pills: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pill: { padding: '6px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', border: '1px solid var(--border)', borderRadius: 16, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' },
  pillActive: { background: 'var(--cyan)', borderColor: 'var(--cyan)', color: 'var(--bg)' },
  startBtn: { display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '15px 24px', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 2, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius)', marginBottom: 12, cursor: 'pointer' },
  missedBtn: { display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--red)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 16, cursor: 'pointer' },
  refSecTitle: { fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 },
  refBooks: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  refBook: { fontSize: 11, color: 'var(--text-sec)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 4 },
  refNum: { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 },
  // Playing
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  qCount: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  streakBadge: { fontFamily: 'var(--font-mono)', fontSize: 12, background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.2)', padding: '3px 8px', borderRadius: 10 },
  scoreBadge: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', background: 'var(--green-subtle)', padding: '3px 10px', borderRadius: 12 },
  pBar: { width: '100%', height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 24, overflow: 'hidden' },
  pFill: { height: '100%', background: 'linear-gradient(90deg, var(--cyan-dim), var(--cyan))', borderRadius: 2, transition: 'width 0.4s' },
  typeTag: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 4 },
  hintTag: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 },
  questionText: { fontFamily: 'var(--font-body)', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: 600, lineHeight: 1.4, color: 'var(--text)', marginBottom: 24 },
  optGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  opt: { padding: '14px 16px', minHeight: 48, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 600, color: 'var(--text)', textAlign: 'left', width: '100%', cursor: 'pointer', transition: 'all 0.15s' },
  optPicked: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)' },
  optCorrect: { borderColor: 'var(--green)', background: 'var(--green-subtle)', color: 'var(--green)' },
  optWrong: { borderColor: 'var(--red)', background: 'var(--red-subtle)', color: 'var(--red)' },
  feedback: { padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid', marginTop: 14, fontSize: 14, fontWeight: 600 },
  actionRow: { display: 'flex', gap: 10, marginTop: 20 },
  btnP: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  swipeHint: { textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  // Results
  resultsHeader: { textAlign: 'center', padding: '20px 0 24px' },
  resPct: { fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 900, color: 'var(--text)', marginTop: 8 },
  resLabel: { fontSize: 14, color: 'var(--text-sec)', marginTop: 4 },
  resStreak: { fontSize: 13, color: 'var(--accent)', marginTop: 6, fontWeight: 600 },
  missedItem: { padding: '10px 0', borderBottom: '1px solid var(--border)' },
  missedQ: { fontSize: 13, color: 'var(--text)', marginBottom: 3 },
  missedWrong: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)' },
  missedRight: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', marginTop: 2 },
  resActions: { display: 'flex', gap: 10, marginBottom: 12 },
  btnSecondary: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--cyan)', background: 'var(--cyan-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  backLink: { display: 'block', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', marginTop: 8 },
}
