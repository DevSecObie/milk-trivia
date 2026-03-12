import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Check, RotateCcw } from 'lucide-react'
import { isSoundOn } from '../lib/storage'
import { playCorrect, playIncorrect, playClick } from '../lib/sounds'

function shuffleArray(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

export default function ScriptureMatchScreen({ matches, onBack, onEnd }) {
  const [round, setRound] = useState(0)
  const [pairs, setPairs] = useState([])
  const [selectedVerse, setSelectedVerse] = useState(null)
  const [selectedRef, setSelectedRef] = useState(null)
  const [matched, setMatched] = useState(new Set())
  const [wrong, setWrong] = useState(null)
  const [score, setScore] = useState(0)
  const [totalRounds, setTotalRounds] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const allMatches = useRef(shuffleArray([...matches]))

  const PAIRS_PER_ROUND = 5

  useEffect(() => {
    loadRound(0)
  }, [])

  const loadRound = (r) => {
    const start = r * PAIRS_PER_ROUND
    const slice = allMatches.current.slice(start, start + PAIRS_PER_ROUND)
    if (slice.length === 0) { setGameOver(true); return }
    setPairs(slice)
    setMatched(new Set())
    setSelectedVerse(null)
    setSelectedRef(null)
    setWrong(null)
    setRound(r)
  }

  const sfx = (fn) => { if (isSoundOn()) fn() }

  const shuffledRefs = useRef([])
  useEffect(() => {
    shuffledRefs.current = shuffleArray(pairs.map((_, i) => i))
  }, [pairs])

  const handleVerseClick = (i) => {
    if (matched.has(i)) return
    sfx(playClick)
    setSelectedVerse(i)
    setWrong(null)
    if (selectedRef !== null) tryMatch(i, selectedRef)
  }

  const handleRefClick = (i) => {
    if (matched.has(i)) return
    sfx(playClick)
    setSelectedRef(i)
    setWrong(null)
    if (selectedVerse !== null) tryMatch(selectedVerse, i)
  }

  const tryMatch = (vi, ri) => {
    if (vi === ri) {
      // Correct match
      sfx(playCorrect)
      const newMatched = new Set(matched)
      newMatched.add(vi)
      setMatched(newMatched)
      setScore(s => s + 1)
      setSelectedVerse(null)
      setSelectedRef(null)
      // Check if round complete
      if (newMatched.size === pairs.length) {
        setTotalRounds(t => t + 1)
        setTimeout(() => {
          const nextRound = round + 1
          if (nextRound * PAIRS_PER_ROUND >= allMatches.current.length) {
            setGameOver(true)
          } else {
            loadRound(nextRound)
          }
        }, 600)
      }
    } else {
      // Wrong match
      sfx(playIncorrect)
      setWrong({ v: vi, r: ri })
      setTimeout(() => {
        setWrong(null)
        setSelectedVerse(null)
        setSelectedRef(null)
      }, 800)
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000)

  if (gameOver) {
    return (
      <div style={st.container} className="animate-in">
        <div style={st.doneCard}>
          <Check size={48} style={{ color: 'var(--green)', marginBottom: 16 }} />
          <h2 style={st.doneTitle}>COMPLETE!</h2>
          <div style={st.doneScore}>{score}</div>
          <div style={st.doneLbl}>matches made</div>
          <div style={st.doneTime}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</div>
          <div style={st.doneLbl}>time</div>
          <button onClick={() => onEnd(score)} style={st.btnP}>DONE</button>
        </div>
      </div>
    )
  }

  return (
    <div style={st.container}>
      <div style={st.topBar}>
        <button onClick={onBack} style={st.backBtn}><ArrowLeft size={16} /> Back</button>
        <div style={st.scoreDisp}>{score} matched</div>
      </div>

      <div style={st.mTag}>SCRIPTURE MATCH</div>
      <div style={st.hint}>Tap a verse, then tap its matching reference</div>

      <div style={st.matchGrid}>
        <div style={st.col}>
          <div style={st.colLabel}>VERSES</div>
          {pairs.map((p, i) => {
            const isMatched = matched.has(i)
            const isSel = selectedVerse === i
            const isWrong = wrong && wrong.v === i
            return (
              <button key={i} onClick={() => handleVerseClick(i)} disabled={isMatched}
                style={{ ...st.card, ...(isMatched ? st.cardMatched : {}), ...(isSel ? st.cardSel : {}), ...(isWrong ? st.cardWrong : {}) }}>
                <span style={st.cardTxt}>{p.text}</span>
                {isMatched && <Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
        <div style={st.col}>
          <div style={st.colLabel}>REFERENCES</div>
          {shuffledRefs.current.map((ri) => {
            const p = pairs[ri]
            if (!p) return null
            const isMatched = matched.has(ri)
            const isSel = selectedRef === ri
            const isWrong = wrong && wrong.r === ri
            return (
              <button key={ri} onClick={() => handleRefClick(ri)} disabled={isMatched}
                style={{ ...st.refCard, ...(isMatched ? st.cardMatched : {}), ...(isSel ? st.cardSel : {}), ...(isWrong ? st.cardWrong : {}) }}>
                <span style={st.refTxt}>{p.ref}</span>
                {isMatched && <Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const st = {
  container: { maxWidth: 700, margin: '0 auto', padding: '16px 16px 80px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-sec)', cursor: 'pointer' },
  scoreDisp: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--cyan)' },
  mTag: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 4 },
  hint: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 },
  matchGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  col: { display: 'flex', flexDirection: 'column', gap: 6 },
  colLabel: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-muted)', marginBottom: 4, textAlign: 'center' },
  card: { padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, minHeight: 52 },
  refCard: { padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 52 },
  cardSel: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)', boxShadow: '0 0 12px rgba(0,212,255,0.15)' },
  cardMatched: { borderColor: 'var(--green)', background: 'var(--green-subtle)', opacity: 0.6, cursor: 'default' },
  cardWrong: { borderColor: 'var(--red)', background: 'var(--red-subtle)', animation: 'shake 0.3s' },
  cardTxt: { fontSize: 11, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.4 },
  refTxt: { fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--cyan)' },
  doneCard: { textAlign: 'center', padding: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backdropFilter: 'blur(10px)' },
  doneTitle: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--green)', letterSpacing: 3, marginBottom: 8 },
  doneScore: { fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 800, color: 'var(--text)', lineHeight: 1 },
  doneLbl: { fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 },
  doneTime: { fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--cyan)' },
  btnP: { width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 15px rgba(0,212,255,0.15)', cursor: 'pointer', marginTop: 20 },
}
