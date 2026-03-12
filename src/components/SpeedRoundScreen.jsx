import { useState, useEffect, useRef } from 'react'
import { X, Zap } from 'lucide-react'
import { isSoundOn } from '../lib/storage'
import { playCorrect, playIncorrect, playClick } from '../lib/sounds'

function shuffleArray(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

export default function SpeedRoundScreen({ questions, onEnd, onBack }) {
  const allQ = useRef(shuffleArray([...questions]))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [timeLeft, setTimeLeft] = useState(60)
  const [options, setOptions] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const timerRef = useRef(null)
  const allAnswers = useRef(questions.filter(q => !q.isScripture && q.a.length < 60).map(q => q.a))

  const q = allQ.current[idx % allQ.current.length]

  // Timer
  useEffect(() => {
    if (gameOver) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0.1) {
          clearInterval(timerRef.current)
          setGameOver(true)
          return 0
        }
        return Math.round((t - 0.1) * 10) / 10
      })
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [gameOver])

  // Generate options
  useEffect(() => {
    if (gameOver) return
    setSubmitted(false); setCorrect(null)
    const cur = allQ.current[idx % allQ.current.length]
    const wrong = shuffleArray(allAnswers.current.filter(a => a !== cur.a)).slice(0, 3)
    setOptions(shuffleArray([cur.a, ...wrong]))
  }, [idx, gameOver])

  const sfx = (fn) => { if (isSoundOn()) fn() }

  const handleSelect = (opt) => {
    if (submitted || gameOver) return
    sfx(playClick)
    const isRight = opt === q.a
    setSubmitted(true)
    setCorrect(isRight)
    setTotalAnswered(t => t + 1)
    sfx(isRight ? playCorrect : playIncorrect)

    if (isRight) {
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak > bestStreak) setBestStreak(newStreak)
      const mult = newStreak >= 10 ? 4 : newStreak >= 5 ? 3 : newStreak >= 3 ? 2 : 1
      setMultiplier(mult)
      setScore(s => s + (10 * mult))
      setTotalCorrect(c => c + 1)
    } else {
      setStreak(0)
      setMultiplier(1)
    }

    // Auto-advance after brief delay
    setTimeout(() => {
      if (!gameOver) setIdx(i => i + 1)
    }, 400)
  }

  const timerPct = (timeLeft / 60) * 100
  const timerColor = timeLeft <= 10 ? 'var(--red)' : timeLeft <= 20 ? 'var(--accent)' : 'var(--cyan)'

  if (gameOver) {
    return (
      <div style={st.container} className="animate-in">
        <div style={st.gameOverCard}>
          <Zap size={48} style={{ color: 'var(--accent)', marginBottom: 16 }} />
          <h2 style={st.goTitle}>TIME'S UP!</h2>
          <div style={st.goScore}>{score}</div>
          <div style={st.goLabel}>points</div>
          <div style={st.goStats}>
            <div style={st.goStat}><span style={st.goStatVal}>{totalCorrect}/{totalAnswered}</span><span style={st.goStatLbl}>correct</span></div>
            <div style={st.goStat}><span style={st.goStatVal}>{bestStreak}</span><span style={st.goStatLbl}>best streak</span></div>
            <div style={st.goStat}><span style={st.goStatVal}>x{multiplier}</span><span style={st.goStatLbl}>max mult</span></div>
          </div>
          <button onClick={() => onEnd(score, totalCorrect, totalAnswered)} style={st.btnP}>DONE</button>
        </div>
      </div>
    )
  }

  return (
    <div style={st.container}>
      <div style={st.topBar}>
        <div style={st.topL}>
          <div style={{ ...st.timer, color: timerColor }}>{Math.ceil(timeLeft)}s</div>
          {multiplier > 1 && <div style={st.multBadge}>x{multiplier}</div>}
        </div>
        <div style={st.scoreDisp}>{score} pts</div>
        <button onClick={() => { clearInterval(timerRef.current); setGameOver(true) }} style={st.quitBtn}><X size={16} /></button>
      </div>

      <div style={st.timerBar}><div style={{ ...st.timerFill, width: `${timerPct}%`, background: timerColor }} /></div>

      {streak >= 3 && (
        <div style={st.streakBanner}>
          <Zap size={14} /> {streak} streak! x{multiplier} multiplier
        </div>
      )}

      <div key={idx} className="animate-in">
        <div style={st.mTag}>SPEED ROUND</div>
        <h2 style={st.qTxt}>{q.n}) {q.q}</h2>
        <div style={st.optGrid}>
          {options.map((opt, i) => {
            const isC = opt === q.a, isSel = opt === submitted && correct !== null
            let ss = {}
            if (submitted && opt === q.a) ss = st.optOk
            else if (submitted) ss = { opacity: 0.35 }
            return (
              <button key={i} onClick={() => handleSelect(opt)} disabled={submitted} style={{ ...st.opt, ...ss }}>
                <span style={st.optTxt}>{opt}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const st = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 20px 80px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  topL: { display: 'flex', alignItems: 'center', gap: 8 },
  timer: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: 1 },
  multBadge: { padding: '3px 10px', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)', background: 'rgba(251,191,36,0.15)', color: 'var(--accent)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.3)' },
  scoreDisp: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  quitBtn: { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer' },
  timerBar: { width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2, transition: 'width 0.1s linear' },
  streakBanner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)', letterSpacing: 1 },
  mTag: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--accent)', marginBottom: 8 },
  qTxt: { fontFamily: 'var(--font-body)', fontSize: 'clamp(16px,4vw,22px)', fontWeight: 600, lineHeight: 1.45, color: 'var(--text)', marginBottom: 20 },
  optGrid: { display: 'flex', flexDirection: 'column', gap: 6 },
  opt: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', minHeight: 48, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', textAlign: 'left', width: '100%', transition: 'all 0.15s', cursor: 'pointer', backdropFilter: 'blur(8px)', lineHeight: 1.4 },
  optOk: { borderColor: 'var(--green)', background: 'var(--green-subtle)' },
  optTxt: { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 },
  btnP: { width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 15px rgba(0,212,255,0.15)', cursor: 'pointer', marginTop: 20 },
  gameOverCard: { textAlign: 'center', padding: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backdropFilter: 'blur(10px)' },
  goTitle: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: 3, marginBottom: 8 },
  goScore: { fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 800, color: 'var(--text)', lineHeight: 1 },
  goLabel: { fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 },
  goStats: { display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 },
  goStat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  goStatVal: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--cyan)' },
  goStatLbl: { fontSize: 11, color: 'var(--text-muted)' },
}
