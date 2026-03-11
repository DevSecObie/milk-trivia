import { useState, useRef } from 'react'
import { Home, ChevronDown, Share2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { playSuccess } from '../lib/sounds'
import { isSoundOn } from '../lib/storage'

export default function ResultsScreen({ gameState, onHome }) {
  const { answers, score, questions, mode, timeSeconds } = gameState
  const total = answers.length || questions.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const [showReview, setShowReview] = useState(false)
  const [sharing, setSharing] = useState(false)
  const shareRef = useRef(null)
  const isFlash = mode === 'flash'

  // Play success sound
  useState(() => { if (isSoundOn() && pct >= 70) playSuccess() }, [])

  let grade = '', gradeColor = 'var(--cyan)'
  if (pct >= 95) { grade = 'EXCELLENT'; gradeColor = '#00FF88' }
  else if (pct >= 85) { grade = 'WELL DONE'; gradeColor = '#00FF88' }
  else if (pct >= 70) { grade = 'GOOD WORK'; gradeColor = '#00D4FF' }
  else if (pct >= 50) { grade = 'KEEP STUDYING'; gradeColor = '#FBBF24' }
  else { grade = 'STUDY HARDER'; gradeColor = '#FF3366' }

  const strokeColor = pct >= 70 ? '#00FF88' : pct >= 50 ? '#00D4FF' : '#FF3366'
  const mins = timeSeconds ? Math.floor(timeSeconds / 60) : 0
  const secs = timeSeconds ? timeSeconds % 60 : 0

  const handleShare = async () => {
    if (!shareRef.current) return
    setSharing(true)
    try {
      const dataUrl = await toPng(shareRef.current, { backgroundColor: '#030810', pixelRatio: 2 })
      const blob = await (await fetch(dataUrl)).blob()
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'score.png', { type: 'image/png' })] })) {
        await navigator.share({ files: [new File([blob], 'milk-questions-score.png', { type: 'image/png' })], text: `I scored ${pct}% on 240 Milk Questions!` })
      } else {
        const a = document.createElement('a'); a.href = dataUrl; a.download = 'milk-questions-score.png'; a.click()
      }
    } catch {}
    setSharing(false)
  }

  return (
    <div style={s.container} className="animate-in">
      {/* Shareable card */}
      <div ref={shareRef} style={s.shareCard}>
        <div style={s.header}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="5" />
            <circle cx="70" cy="70" r="62" fill="none" stroke={strokeColor} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 390} 390`} transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dasharray 1s', filter: `drop-shadow(0 0 6px ${strokeColor})` }} />
          </svg>
          <div style={s.circleInner}>
            <div style={s.pctNum}>{isFlash ? '—' : `${pct}%`}</div>
            <div style={{ ...s.pctLabel, color: gradeColor }}>{isFlash ? 'COMPLETE' : grade}</div>
          </div>
        </div>
        <div style={s.shareBrand}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" style={{ width: 24, height: 24, borderRadius: 4 }} />
          <span style={s.brandText}>CyberJudah.io — 240 Milk Questions</span>
        </div>
      </div>

      {!isFlash && (
        <div style={s.statGrid}>
          <div style={s.statBox}><div style={{ ...s.statNum, color: 'var(--green)' }}>{score}</div><div style={s.statLabel}>CORRECT</div></div>
          <div style={s.statBox}><div style={{ ...s.statNum, color: 'var(--red)' }}>{total - score}</div><div style={s.statLabel}>WRONG</div></div>
          <div style={s.statBox}><div style={{ ...s.statNum, color: 'var(--cyan)' }}>{timeSeconds ? `${mins}:${String(secs).padStart(2, '0')}` : total}</div><div style={s.statLabel}>{timeSeconds ? 'TIME' : 'TOTAL'}</div></div>
        </div>
      )}

      {/* Share button */}
      <button onClick={handleShare} disabled={sharing} style={s.shareBtn}>
        <Share2 size={16} /> {sharing ? 'Generating...' : 'Share Score Card'}
      </button>

      {/* Review */}
      {answers.length > 0 && !isFlash && (
        <div style={s.card}>
          <button onClick={() => setShowReview(!showReview)} style={s.reviewToggle}>
            <span style={s.reviewTitle}>ANSWER REVIEW ({answers.filter(a => !a.correct).length} missed)</span>
            <ChevronDown size={14} style={{ transform: showReview ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'var(--cyan-dim)' }} />
          </button>
          {showReview && answers.map((a, i) => (
            <div key={i} style={s.rItem}>
              <div style={s.rQ}><span style={{ color: a.correct ? 'var(--green)' : 'var(--red)', fontWeight: 700, marginRight: 6 }}>{a.correct ? '✓' : '✗'}</span>{a.q.n}) {a.q.q}</div>
              <div style={{ ...s.rA, color: a.correct ? 'var(--green)' : 'var(--red)' }}>Your answer: {a.given}</div>
              {!a.correct && <div style={s.rCorrect}>Correct: {a.q.a}</div>}
              {a.q.verses && a.q.verses.length > 0 && (
                <div style={s.rVerses}>{a.q.verses.slice(0, 3).map((v, j) => (
                  <div key={j} style={s.rVerse}><span style={s.rRef}>{v.ref}</span> — {v.text.substring(0, 140)}{v.text.length > 140 ? '...' : ''}</div>
                ))}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={onHome} style={s.homeBtn}><Home size={16} /> RETURN HOME</button>
    </div>
  )
}

const s = {
  container: { maxWidth: 640, margin: '0 auto', padding: '24px 20px 80px' },
  shareCard: { textAlign: 'center', padding: '28px 20px 16px', marginBottom: 20, background: 'linear-gradient(180deg, rgba(0,212,255,0.05), rgba(0,0,0,0))', borderRadius: 'var(--radius)', border: '1px solid var(--border)' },
  header: { position: 'relative', display: 'inline-block', marginBottom: 12 },
  circleInner: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  pctNum: { fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, color: 'var(--text)' },
  pctLabel: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginTop: 2 },
  shareBrand: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  brandText: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 },
  statBox: { textAlign: 'center', padding: '12px 6px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' },
  statNum: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 },
  statLabel: { fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--text-muted)', marginTop: 2, letterSpacing: 1.5 },
  shareBtn: { display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--cyan)', background: 'var(--cyan-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 16, cursor: 'pointer' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 20 },
  reviewToggle: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer' },
  reviewTitle: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 2 },
  rItem: { padding: '12px 16px', borderTop: '1px solid var(--border)' },
  rQ: { fontSize: 13, color: 'var(--text)', marginBottom: 4 },
  rA: { fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 2 },
  rCorrect: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', marginTop: 2 },
  rVerses: { marginTop: 8 },
  rVerse: { fontSize: 12, color: 'var(--text)', lineHeight: 1.6, borderLeft: '2px solid var(--cyan-dim)', paddingLeft: 10, marginTop: 6 },
  rRef: { fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' },
  homeBtn: { display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 2, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
}
