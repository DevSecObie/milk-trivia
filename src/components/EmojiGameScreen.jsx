import { useState, useEffect, useRef } from 'react'
import { ArrowRight, X, HelpCircle } from 'lucide-react'
import { isSoundOn } from '../lib/storage'
import { playCorrect, playIncorrect, playClick } from '../lib/sounds'

function shuffleArray(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

export default function EmojiGameScreen({ stories, onEnd, onBack }) {
  const allStories = useRef(shuffleArray([...stories]))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(null)
  const [selected, setSelected] = useState(null)
  const [options, setOptions] = useState([])
  const [showHint, setShowHint] = useState(false)
  const [answers, setAnswers] = useState([])

  const total = Math.min(20, allStories.current.length)
  const q = allStories.current[idx]

  useEffect(() => {
    if (idx >= total) return
    setSubmitted(false); setCorrect(null); setSelected(null); setShowHint(false)
    const cur = allStories.current[idx]
    setOptions(shuffleArray([cur.answer, ...cur.wrong]))
  }, [idx])

  const sfx = (fn) => { if (isSoundOn()) fn() }

  const handleSelect = (opt) => {
    if (submitted) return
    sfx(playClick)
    setSelected(opt)
    const isRight = opt === q.answer
    setSubmitted(true)
    setCorrect(isRight)
    sfx(isRight ? playCorrect : playIncorrect)
    if (isRight) setScore(s => s + 1)
    setAnswers(a => [...a, { story: q.answer, correct: isRight }])
  }

  const nextQuestion = () => {
    if (idx + 1 >= total) {
      onEnd(score, total)
      return
    }
    setIdx(i => i + 1)
  }

  if (idx >= total) return null

  return (
    <div style={st.container}>
      <div style={st.topBar}>
        <div style={st.topL}>
          <span style={st.qC}>{idx + 1}<span style={{ color: 'var(--text-muted)' }}> / {total}</span></span>
          <span style={st.sTag}>{score} correct</span>
        </div>
        <button onClick={() => onEnd(score, total)} style={st.quitBtn}><X size={16} /> END</button>
      </div>

      <div style={st.pBar}><div style={{ ...st.pFill, width: `${(idx / total) * 100}%` }} /></div>

      <div key={idx} className="animate-in">
        <div style={st.mTag}>BIBLE EMOJI QUIZ</div>
        <div style={st.emojiBox}>
          <span style={st.emojis}>{q.emojis}</span>
        </div>
        <div style={st.prompt}>Which Bible story do these represent?</div>

        {!showHint && !submitted && (
          <button onClick={() => setShowHint(true)} style={st.hintBtn}>
            <HelpCircle size={14} /> Show Hint
          </button>
        )}
        {showHint && !submitted && (
          <div style={st.hintBox}>Hint: {q.hint}</div>
        )}

        <div style={st.optGrid}>
          {options.map((opt, i) => {
            const isC = opt === q.answer, isSel = opt === selected
            let ss = {}
            if (submitted) {
              if (isC && isSel) ss = st.optOk
              else if (!isC && isSel) ss = st.optBad
              else if (isC && !isSel) ss = st.optMiss
              else ss = { opacity: 0.35 }
            } else if (isSel) ss = st.optSel
            return (
              <button key={i} onClick={() => handleSelect(opt)} disabled={submitted} style={{ ...st.opt, ...ss }}>
                <span style={st.optTxt}>{opt}</span>
              </button>
            )
          })}
        </div>

        {submitted && (
          <div style={{ ...st.feedback, background: correct ? 'var(--green-subtle)' : 'var(--red-subtle)', borderColor: correct ? 'var(--green)' : 'var(--red)', color: correct ? 'var(--green)' : 'var(--red)' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{correct ? '\u2713' : '\u2717'}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{correct ? 'Correct!' : 'Incorrect'}</div>
              {!correct && <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 2 }}>Answer: {q.answer}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{q.ref}</div>
            </div>
          </div>
        )}

        <div style={st.actionRow}>
          {submitted && (
            <button onClick={nextQuestion} style={st.btnP}>
              {idx + 1 >= total ? 'Finish' : 'Next'} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const st = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 20px 80px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  topL: { display: 'flex', alignItems: 'center', gap: 10 },
  qC: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  sTag: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', background: 'var(--green-subtle)', padding: '3px 10px', borderRadius: 12, border: '1px solid rgba(0,255,136,0.15)' },
  quitBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--red)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  pBar: { width: '100%', height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 24, overflow: 'hidden' },
  pFill: { height: '100%', background: 'linear-gradient(90deg, var(--accent), #D97706)', borderRadius: 2, transition: 'width 0.4s' },
  mTag: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--accent)', marginBottom: 12 },
  emojiBox: { textAlign: 'center', padding: '28px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 16 },
  emojis: { fontSize: 'clamp(36px, 10vw, 56px)', filter: 'grayscale(1) contrast(2)', lineHeight: 1.4 },
  prompt: { textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 16 },
  hintBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 12 },
  hintBox: { textAlign: 'center', padding: '6px 12px', fontSize: 12, color: 'var(--accent)', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 12, fontFamily: 'var(--font-mono)' },
  optGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  opt: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', minHeight: 48, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', textAlign: 'left', width: '100%', transition: 'all 0.2s', cursor: 'pointer', lineHeight: 1.4 },
  optSel: { borderColor: 'var(--accent)', background: 'rgba(251,191,36,0.08)', boxShadow: '0 0 12px rgba(251,191,36,0.1)' },
  optOk: { borderColor: 'var(--green)', background: 'var(--green-subtle)' },
  optBad: { borderColor: 'var(--red)', background: 'var(--red-subtle)' },
  optMiss: { borderColor: 'var(--accent)', background: 'rgba(251,191,36,0.08)', opacity: 0.6 },
  optTxt: { fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 },
  feedback: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid', marginTop: 14, fontSize: 14 },
  actionRow: { display: 'flex', gap: 10, marginTop: 24 },
  btnP: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--accent), #D97706)', border: 'none', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 15px rgba(251,191,36,0.15)', cursor: 'pointer' },
}
