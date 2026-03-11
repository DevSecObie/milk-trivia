import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronDown, ArrowRight, Send } from 'lucide-react'
import questions from '../data/questions.json'
import { playCorrect, playIncorrect } from '../utils/sounds'

function shuffleArray(arr) {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }; return a
}
const ALL_REFS = [...new Set(questions.flatMap(q => q.refs || []))]
const ALL_ANSWERS_SHORT = questions.filter(q => !q.isScripture && q.a.length < 60).map(q => q.a)

function VerseBlock({ verses, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!verses || verses.length === 0) return null
  return (
    <div style={vs.block}>
      <button onClick={() => setOpen(!open)} style={vs.header}>
        <span>📜 Full Scripture ({verses.length} passage{verses.length > 1 ? 's' : ''})</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>
      {open && <div style={vs.list}>{verses.map((v, i) => (
        <div key={i} style={vs.item}><div style={vs.ref}>{v.ref}</div><div style={vs.text}>{v.text}</div></div>
      ))}</div>}
    </div>
  )
}
const vs = {
  block: { marginTop: 16, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' },
  header: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--cyan-subtle)', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'var(--font-mono)' },
  list: { background: 'var(--bg-card)' },
  item: { padding: '12px 14px', borderTop: '1px solid rgba(0,212,255,0.06)' },
  ref: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--cyan)', marginBottom: 4 },
  text: { fontSize: 13, lineHeight: 1.65, color: 'var(--text)', fontStyle: 'italic' },
}

function Feedback({ correct, answer }) {
  if (correct === null) return null
  const isGood = correct
  return (
    <div style={{ ...fb.base, background: isGood ? 'var(--green-subtle)' : 'var(--red-subtle)', borderColor: isGood ? 'var(--green-dim)' : 'var(--red-dim)', color: isGood ? 'var(--green)' : 'var(--red)' }}>
      <span style={fb.icon}>{isGood ? '✓' : '✗'}</span>
      <div>
        <div style={fb.label}>{isGood ? 'Correct!' : 'Incorrect'}</div>
        {!isGood && answer && <div style={fb.answer}>Answer: {answer}</div>}
      </div>
    </div>
  )
}
const fb = {
  base: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid', marginTop: 14, fontSize: 14 },
  icon: { fontSize: 18, fontWeight: 700, lineHeight: 1, marginTop: 1 },
  label: { fontWeight: 600, marginBottom: 2 },
  answer: { fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 4, lineHeight: 1.5, color: 'var(--text)' },
}

export default function GameScreen({ gameState, allRefs, onEnd, onQuit, onProgressUpdate, soundOn }) {
  const { mode, questions: gameQuestions, confirmBeforeSubmit } = gameState
  const needsConfirm = confirmBeforeSubmit && mode !== 'timed'

  // Resume from saved progress
  const [idx, setIdx] = useState(gameState.currentIdx || 0)
  const [score, setScore] = useState(gameState.score || 0)
  const [answers, setAnswers] = useState(gameState.answers || [])
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [options, setOptions] = useState([])
  const [typedValue, setTypedValue] = useState('')
  const [timeLeft, setTimeLeft] = useState(15)
  const [showQuit, setShowQuit] = useState(false)
  const timerRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const touchStartRef = useRef(null)

  const q = gameQuestions[idx]
  const total = gameQuestions.length
  const hasScripture = q.isScripture && q.refs && q.refs.length > 0
  const isMultiAnswer = hasScripture && q.refs.length > 1

  // Save progress whenever idx/score/answers change
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate({
        ...gameState,
        currentIdx: idx,
        score,
        answers,
      })
    }
  }, [idx, score, answers.length])

  useEffect(() => {
    setSubmitted(false); setCorrect(null); setSelected(new Set()); setTypedValue('')
    if (mode === 'mc' || mode === 'timed') {
      if (hasScripture) {
        const correctRefs = q.refs; const correctSet = new Set(correctRefs)
        const numWrong = isMultiAnswer ? Math.min(3, 8 - correctRefs.length) : 3
        const wrong = shuffleArray(ALL_REFS.filter(r => !correctSet.has(r))).slice(0, numWrong)
        setOptions(shuffleArray([...correctRefs, ...wrong]))
      } else {
        const wrong = shuffleArray(ALL_ANSWERS_SHORT.filter(a => a !== q.a)).slice(0, 3)
        setOptions(shuffleArray([q.a, ...wrong]))
      }
    }
    if (mode === 'timed') setTimeLeft(15)
    if (mode === 'type') setTimeout(() => inputRef.current?.focus(), 50)
  }, [idx, q])

  useEffect(() => {
    if (mode !== 'timed' || submitted) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) { clearInterval(timerRef.current); doExpired(); return 0 }
        return prev - 0.1
      })
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [idx, submitted])

  // Swipe navigation
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current || !submitted) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    // Only trigger on horizontal swipes (not scrolling)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) { // Swipe left = next
        nextQuestion()
      }
    }
    touchStartRef.current = null
  }, [submitted, idx, total, answers, score])

  const doExpired = () => {
    if (submitted) return
    setSubmitted(true); setCorrect(false)
    if (soundOn) playIncorrect()
    setAnswers(prev => [...prev, { q, correct: false, given: 'Time expired' }])
  }

  const toggleOption = (ref) => {
    if (submitted) return
    if (!isMultiAnswer || !hasScripture) { setSelected(new Set([ref])); if (!needsConfirm) doSubmitMC(new Set([ref])); }
    else { const next = new Set(selected); if (next.has(ref)) next.delete(ref); else next.add(ref); setSelected(next) }
  }

  const doSubmitMC = (sel) => {
    const s = sel || selected
    if (submitted || s.size === 0) return
    clearInterval(timerRef.current)
    const correctSet = hasScripture ? new Set(q.refs) : new Set([q.a])
    const isRight = hasScripture
      ? q.refs.every(r => s.has(r)) && [...s].every(r => correctSet.has(r))
      : s.has(q.a)
    setSubmitted(true); setCorrect(isRight)
    if (isRight) { setScore(sc => sc + 1); if (soundOn) playCorrect() }
    else { if (soundOn) playIncorrect() }
    setAnswers(prev => [...prev, { q, correct: isRight, given: [...s].join(', ') }])
  }

  const submitTyped = () => {
    if (submitted || !typedValue.trim()) return
    const isRight = fuzzyMatch(typedValue.trim(), q.a)
    setSubmitted(true); setCorrect(isRight)
    if (isRight) { setScore(sc => sc + 1); if (soundOn) playCorrect() }
    else { if (soundOn) playIncorrect() }
    setAnswers(prev => [...prev, { q, correct: isRight, given: typedValue.trim() }])
  }

  const nextQuestion = () => { if (idx + 1 >= total) { onEnd(answers, score); return } setIdx(idx + 1) }
  const handleEndTest = () => { clearInterval(timerRef.current); onEnd(answers, score) }

  const renderContent = () => {
    if (mode === 'flash') {
      return (<>
        {submitted && (<div style={st.flashAnswer} className="animate-in">
          <div style={st.flashLabel}>ANSWER</div><div style={st.flashValue}>{q.a}</div>
          <VerseBlock verses={q.verses} defaultOpen={true} />
        </div>)}
        <div style={st.actionRow}>
          {!submitted ? <button onClick={() => setSubmitted(true)} style={st.btnPrimary}>Reveal Answer</button>
            : <button onClick={nextQuestion} style={st.btnPrimary}>{idx + 1 >= total ? 'Finish' : 'Next'} <ArrowRight size={16} /></button>}
        </div>
      </>)
    }

    if (mode === 'type') {
      return (<>
        <input ref={inputRef} type="text" value={typedValue} onChange={e => setTypedValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitTyped()} placeholder={hasScripture ? 'Type scripture reference(s)...' : 'Type your answer...'} disabled={submitted} style={st.input} />
        <Feedback correct={correct} answer={!correct && submitted ? q.a : null} />
        {submitted && <VerseBlock verses={q.verses} />}
        <div style={st.actionRow}>
          {!submitted ? <button onClick={submitTyped} style={st.btnPrimary} disabled={!typedValue.trim()}><Send size={15} /> Submit</button>
            : <button onClick={nextQuestion} style={st.btnPrimary}>{idx + 1 >= total ? 'Finish' : 'Next'} <ArrowRight size={16} /></button>}
        </div>
      </>)
    }

    // MC / TIMED
    const correctSet = hasScripture ? new Set(q.refs) : new Set([q.a])
    return (<>
      {mode === 'timed' && (<div style={st.timerBar}><div style={{ ...st.timerFill, width: `${(timeLeft / 15) * 100}%`, background: timeLeft <= 5 ? 'var(--red)' : 'var(--cyan)' }} /></div>)}
      {isMultiAnswer && !submitted && <div style={st.hint}>Select all that apply</div>}
      <div style={st.optGrid}>
        {options.map((opt, i) => {
          const isC = correctSet.has(opt); const isSel = selected.has(opt)
          let ss = {}
          if (submitted) {
            if (isC && isSel) ss = st.optCorrect
            else if (!isC && isSel) ss = st.optIncorrect
            else if (isC && !isSel) ss = st.optMissed
            else ss = { opacity: 0.35 }
          } else if (isSel) ss = st.optSelected
          return (
            <button key={i} onClick={() => toggleOption(opt)} disabled={submitted} style={{ ...st.opt, ...ss }}>
              <div style={{ ...st.indicator, ...(isSel && !submitted ? st.indActive : {}), ...(submitted && isC && isSel ? st.indCorrect : {}), ...(submitted && !isC && isSel ? st.indIncorrect : {}), borderRadius: isMultiAnswer ? 4 : '50%' }}>
                {submitted && isC ? '✓' : submitted && isSel && !isC ? '✗' : isSel ? '✓' : ''}
              </div>
              <span style={st.optText}>{opt}</span>
            </button>
          )
        })}
      </div>
      <Feedback correct={correct} answer={!correct && submitted ? q.a : null} />
      {submitted && <VerseBlock verses={q.verses} />}
      <div style={st.actionRow}>
        {!submitted && needsConfirm && (
          <button onClick={() => doSubmitMC()} style={st.btnPrimary} disabled={selected.size === 0}><Send size={15} /> Submit</button>
        )}
        {submitted && (
          <button onClick={nextQuestion} style={st.btnPrimary}>{idx + 1 >= total ? 'Finish' : 'Next'} <ArrowRight size={16} /></button>
        )}
      </div>
      {submitted && (
        <div style={st.swipeHint}>Swipe left for next →</div>
      )}
    </>)
  }

  const modeLabels = { mc: isMultiAnswer ? 'MULTIPLE CHOICE — SELECT ALL' : 'MULTIPLE CHOICE', type: 'TYPE YOUR ANSWER', flash: 'FLASHCARD', timed: isMultiAnswer ? 'TIMED — SELECT ALL' : 'TIMED QUIZ' }

  return (
    <div ref={containerRef} style={st.container} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div style={st.topBar}>
        <div style={st.topLeft}>
          <span style={st.qCount}>{idx + 1}<span style={{ color: 'var(--text-muted)' }}> / {total}</span></span>
          {mode !== 'flash' && <span style={st.scoreTag}>{score} ✓</span>}
        </div>
        <button onClick={() => setShowQuit(true)} style={st.quitBtn}><X size={16} /> END</button>
      </div>
      <div style={st.progressOuter}><div style={{ ...st.progressFill, width: `${(idx / total) * 100}%` }} /></div>
      <div key={idx} className="animate-in">
        <div style={st.modeTag}>{modeLabels[mode]}</div>
        <h2 style={st.qText}>{q.n}) {q.q}</h2>
        {renderContent()}
      </div>
      {showQuit && (
        <div style={st.overlay} onClick={() => setShowQuit(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()} className="animate-in">
            <h3 style={st.modalTitle}>End Test?</h3>
            <p style={st.modalText}>You've answered {answers.length} of {total} questions. Your progress is saved.</p>
            <div style={st.modalActions}>
              <button onClick={() => setShowQuit(false)} style={st.modalCancel}>Keep Going</button>
              <button onClick={handleEndTest} style={st.modalConfirm}>End & Results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fuzzyMatch(g, c) {
  const n = s => s.toLowerCase().replace(/[^a-z0-9 :,-]/g, '').replace(/\s+/g, ' ').trim()
  const a = n(g), b = n(c); if (a === b) return true
  const aR = a.split(/[,;]/).map(s => s.trim()).filter(Boolean), bR = b.split(/[,;]/).map(s => s.trim()).filter(Boolean)
  if (bR.length <= 1) return a.includes(b) || b.includes(a)
  let m = 0; for (const cr of bR) { for (const gr of aR) { if (gr.includes(cr) || cr.includes(gr)) { m++; break } } }
  return m >= Math.ceil(bR.length * 0.5)
}

const st = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 20px 80px', touchAction: 'pan-y' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  topLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  qCount: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  scoreTag: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', background: 'var(--green-subtle)', padding: '3px 10px', borderRadius: 12, border: '1px solid rgba(0,255,136,0.15)' },
  quitBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--red)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.2)', borderRadius: 'var(--radius-sm)' },
  progressOuter: { width: '100%', height: 3, background: 'rgba(0,212,255,0.1)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, var(--cyan-dim), var(--cyan))', borderRadius: 2, transition: 'width 0.4s', boxShadow: '0 0 10px var(--cyan-glow)' },
  modeTag: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 10 },
  qText: { fontFamily: 'var(--font-body)', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: 600, lineHeight: 1.45, color: 'var(--text)', marginBottom: 24 },
  hint: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', background: 'var(--cyan-subtle)', padding: '5px 12px', borderRadius: 6, marginBottom: 12, display: 'inline-block', border: '1px solid var(--border)' },
  timerBar: { width: '100%', height: 3, background: 'rgba(0,212,255,0.1)', borderRadius: 2, marginBottom: 18, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2, transition: 'width 0.1s linear', boxShadow: '0 0 8px var(--cyan-glow)' },
  optGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  opt: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', minHeight: 52, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', textAlign: 'left', width: '100%', transition: 'all 0.2s', cursor: 'pointer', margin: 0, lineHeight: 1.4 },
  optSelected: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)', boxShadow: '0 0 12px rgba(0,212,255,0.1)' },
  optCorrect: { borderColor: 'var(--green)', background: 'var(--green-subtle)', boxShadow: '0 0 12px var(--green-glow)' },
  optIncorrect: { borderColor: 'var(--red)', background: 'var(--red-subtle)' },
  optMissed: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)', opacity: 0.6 },
  indicator: { width: 22, height: 22, minWidth: 22, border: '2px solid var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, transition: 'all 0.15s' },
  indActive: { borderColor: 'var(--cyan)', background: 'var(--cyan)', color: 'var(--bg)' },
  indCorrect: { borderColor: 'var(--green)', background: 'var(--green)', color: 'var(--bg)' },
  indIncorrect: { borderColor: 'var(--red)', background: 'var(--red)', color: '#fff' },
  optText: { fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 },
  input: { width: '100%', padding: '13px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 15, outline: 'none' },
  flashAnswer: { padding: 20, background: 'var(--cyan-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 16 },
  flashLabel: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan)', marginBottom: 8 },
  flashValue: { fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text)', lineHeight: 1.6 },
  actionRow: { display: 'flex', gap: 10, marginTop: 24 },
  btnPrimary: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 20px rgba(0,212,255,0.2)' },
  swipeHint: { textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 16, fontFamily: 'var(--font-mono)', opacity: 0.5 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 0 40px rgba(0,212,255,0.1)' },
  modalTitle: { fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text)', marginBottom: 8, letterSpacing: 1 },
  modalText: { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 },
  modalActions: { display: 'flex', gap: 10 },
  modalCancel: { flex: 1, padding: '11px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' },
  modalConfirm: { flex: 1, padding: '11px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--red)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff' },
}
