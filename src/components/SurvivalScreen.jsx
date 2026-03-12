import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, Heart, HeartCrack, Zap } from 'lucide-react'
import { isSoundOn } from '../lib/storage'
import { playCorrect, playIncorrect, playClick } from '../lib/sounds'

function shuffleArray(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

export default function SurvivalScreen({ questions, onEnd, onBack }) {
  const allQ = useRef(shuffleArray([...questions]))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(null)
  const [selected, setSelected] = useState(null)
  const [options, setOptions] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [showQuit, setShowQuit] = useState(false)
  const allAnswers = useRef(questions.filter(q => !q.isScripture && q.a.length < 60).map(q => q.a))

  const q = allQ.current[idx % allQ.current.length]

  useEffect(() => {
    if (gameOver) return
    setSubmitted(false); setCorrect(null); setSelected(null)
    const cur = allQ.current[idx % allQ.current.length]
    const wrong = shuffleArray(allAnswers.current.filter(a => a !== cur.a)).slice(0, 3)
    setOptions(shuffleArray([cur.a, ...wrong]))
  }, [idx, gameOver])

  const sfx = (fn) => { if (isSoundOn()) fn() }

  const handleSelect = (opt) => {
    if (submitted || gameOver) return
    sfx(playClick)
    setSelected(opt)
    const isRight = opt === q.a
    setSubmitted(true)
    setCorrect(isRight)
    sfx(isRight ? playCorrect : playIncorrect)
    if (isRight) {
      setScore(s => s + 1)
      setStreak(s => s + 1)
    } else {
      setGameOver(true)
    }
  }

  const nextQuestion = () => {
    if (!submitted || gameOver) return
    setIdx(i => i + 1)
  }

  const difficulty = idx < 10 ? 'EASY' : idx < 20 ? 'MEDIUM' : idx < 30 ? 'HARD' : 'EXTREME'
  const diffColor = idx < 10 ? 'var(--green)' : idx < 20 ? 'var(--cyan)' : idx < 30 ? 'var(--accent)' : 'var(--red)'

  if (gameOver) {
    return (
      <div style={st.container} className="animate-in">
        <div style={st.gameOverCard}>
          <HeartCrack size={48} style={{ color: 'var(--red)', marginBottom: 16 }} />
          <h2 style={st.goTitle}>GAME OVER</h2>
          <div style={st.goScore}>{score}</div>
          <div style={st.goLabel}>questions survived</div>
          <div style={st.goStats}>
            <div style={st.goStat}><span style={st.goStatVal}>{streak}</span><span style={st.goStatLbl}>best streak</span></div>
            <div style={st.goStat}><span style={st.goStatVal}>{difficulty}</span><span style={st.goStatLbl}>reached</span></div>
          </div>
          <div style={st.goLast}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Last question:</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>{q.q}</div>
            <div style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{q.a}</div>
          </div>
          <button onClick={() => onEnd(score)} style={st.btnP}>DONE</button>
        </div>
      </div>
    )
  }

  return (
    <div style={st.container}>
      <div style={st.topBar}>
        <div style={st.topL}>
          <Heart size={16} style={{ color: 'var(--red)' }} />
          <span style={st.lives}>1 LIFE</span>
          <span style={{ ...st.diffBadge, background: diffColor + '22', color: diffColor, borderColor: diffColor }}>{difficulty}</span>
        </div>
        <button onClick={() => setShowQuit(true)} style={st.quitBtn}><X size={16} /> END</button>
      </div>

      <div style={st.scoreRow}>
        <div style={st.scoreBox}>
          <div style={st.scoreVal}>{score}</div>
          <div style={st.scoreLbl}>survived</div>
        </div>
        {streak >= 3 && (
          <div style={st.streakBox}>
            <Zap size={14} style={{ color: 'var(--accent)' }} />
            <span style={st.streakVal}>{streak} streak!</span>
          </div>
        )}
      </div>

      <div key={idx} className="animate-in">
        <div style={st.mTag}>SURVIVAL MODE</div>
        <h2 style={st.qTxt}>{q.n}) {q.q}</h2>
        <div style={st.optGrid}>
          {options.map((opt, i) => {
            const isC = opt === q.a, isSel = opt === selected
            let ss = {}
            if (submitted) {
              if (isC && isSel) ss = st.optOk
              else if (!isC && isSel) ss = st.optBad
              else if (isC && !isSel) ss = st.optMiss
              else ss = { opacity: 0.35 }
            } else if (isSel) ss = st.optSel
            return (
              <button key={i} onClick={() => handleSelect(opt)} disabled={submitted} style={{ ...st.opt, ...ss }}>
                <div style={{ ...st.ind, ...(isSel && !submitted ? st.indA : {}), ...(submitted && isC ? st.indOk : {}), ...(submitted && !isC && isSel ? st.indBad : {}), borderRadius: '50%' }}>
                  {submitted && isC ? '\u2713' : submitted && isSel && !isC ? '\u2717' : isSel ? '\u2713' : ''}
                </div>
                <span style={st.optTxt}>{opt}</span>
              </button>
            )
          })}
        </div>
        {submitted && correct && (
          <div style={st.actionRow}>
            <button onClick={nextQuestion} style={st.btnP}>Next <ArrowRight size={16} /></button>
          </div>
        )}
      </div>

      {showQuit && (
        <div style={st.overlay} onClick={() => setShowQuit(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()} className="animate-in">
            <h3 style={st.mTitle}>End Survival?</h3>
            <p style={st.mText}>You survived {score} questions. Your score will be saved.</p>
            <div style={st.mActions}>
              <button onClick={() => setShowQuit(false)} style={st.mCancel}>Keep Going</button>
              <button onClick={() => onEnd(score)} style={st.mConfirm}>End</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const st = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 20px 80px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  topL: { display: 'flex', alignItems: 'center', gap: 8 },
  lives: { fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--red)', letterSpacing: 1 },
  diffBadge: { padding: '2px 8px', fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, borderRadius: 10, border: '1px solid' },
  quitBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--red)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  scoreRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  scoreBox: { display: 'flex', alignItems: 'baseline', gap: 6 },
  scoreVal: { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text)' },
  scoreLbl: { fontSize: 12, color: 'var(--text-muted)' },
  streakBox: { display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'rgba(251,191,36,0.1)', borderRadius: 12, border: '1px solid rgba(251,191,36,0.2)' },
  streakVal: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' },
  mTag: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--red)', marginBottom: 8 },
  qTxt: { fontFamily: 'var(--font-body)', fontSize: 'clamp(18px,4.5vw,24px)', fontWeight: 600, lineHeight: 1.45, color: 'var(--text)', marginBottom: 24 },
  optGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  opt: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', minHeight: 52, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', textAlign: 'left', width: '100%', transition: 'all 0.2s', cursor: 'pointer', backdropFilter: 'blur(8px)', lineHeight: 1.4 },
  optSel: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)', boxShadow: '0 0 12px rgba(0,212,255,0.1)' },
  optOk: { borderColor: 'var(--green)', background: 'var(--green-subtle)' },
  optBad: { borderColor: 'var(--red)', background: 'var(--red-subtle)' },
  optMiss: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)', opacity: 0.6 },
  ind: { width: 22, height: 22, minWidth: 22, border: '2px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, transition: 'all 0.15s' },
  indA: { borderColor: 'var(--cyan)', background: 'var(--cyan)', color: 'var(--bg)' },
  indOk: { borderColor: 'var(--green)', background: 'var(--green)', color: 'var(--bg)' },
  indBad: { borderColor: 'var(--red)', background: 'var(--red)', color: '#fff' },
  optTxt: { fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 },
  actionRow: { display: 'flex', gap: 10, marginTop: 24 },
  btnP: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 15px rgba(0,212,255,0.15)', cursor: 'pointer' },
  gameOverCard: { textAlign: 'center', padding: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backdropFilter: 'blur(10px)' },
  goTitle: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--red)', letterSpacing: 3, marginBottom: 8 },
  goScore: { fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 800, color: 'var(--text)', lineHeight: 1 },
  goLabel: { fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 },
  goStats: { display: 'flex', justifyContent: 'center', gap: 30, marginBottom: 20 },
  goStat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  goStatVal: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--cyan)' },
  goStatLbl: { fontSize: 11, color: 'var(--text-muted)' },
  goLast: { padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 20, textAlign: 'left' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, maxWidth: 360, width: '100%' },
  mTitle: { fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text)', marginBottom: 6, letterSpacing: 1 },
  mText: { fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.5, marginBottom: 20 },
  mActions: { display: 'flex', gap: 8 },
  mCancel: { flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', cursor: 'pointer' },
  mConfirm: { flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--red)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', cursor: 'pointer' },
}
