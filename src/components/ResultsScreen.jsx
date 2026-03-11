import { useState, useEffect } from 'react'
import { Home, ChevronDown, Share2, RotateCcw, Flame } from 'lucide-react'
import ShareCard from './ShareCard'
import { getStreak } from '../utils/storage'
import { playStreak } from '../utils/sounds'

export default function ResultsScreen({ gameState, onHome, onPlayAgain }) {
  const { answers, score, questions, mode, timeTakenSec } = gameState
  const total = answers.length || questions.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const [showReview, setShowReview] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const isFlash = mode === 'flash'
  const streak = getStreak()

  // Play streak sound on load if streak > 1
  useEffect(() => {
    if (streak.current > 1) {
      setTimeout(() => playStreak(), 500)
    }
  }, [])

  let grade = '', gradeColor = 'var(--cyan)'
  if (pct >= 95) { grade = 'EXCELLENT'; gradeColor = 'var(--green)' }
  else if (pct >= 85) { grade = 'WELL DONE'; gradeColor = 'var(--green)' }
  else if (pct >= 70) { grade = 'GOOD WORK'; gradeColor = 'var(--cyan)' }
  else if (pct >= 50) { grade = 'KEEP STUDYING'; gradeColor = 'var(--cyan-dim)' }
  else { grade = 'STUDY HARDER'; gradeColor = 'var(--red)' }

  const strokeColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--cyan)' : 'var(--red)'

  const formatTime = (sec) => {
    if (!sec) return null
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <div style={s.container} className="animate-in">
      {/* Streak celebration */}
      {streak.current > 1 && (
        <div style={s.streakBanner}>
          <Flame size={20} style={{ color: '#FF8800' }} />
          <span style={s.streakText}>{streak.current} Day Streak!</span>
        </div>
      )}

      <div style={s.header}>
        <div style={s.circleWrap}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(0,212,255,0.08)" strokeWidth="6" />
            <circle cx="80" cy="80" r="70" fill="none" stroke={strokeColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 440} 440`} transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${strokeColor})` }} />
          </svg>
          <div style={s.circleInner}>
            <div style={s.pctNum}>{isFlash ? '—' : `${pct}%`}</div>
            <div style={{ ...s.pctLabel, color: gradeColor }}>{isFlash ? 'COMPLETE' : grade}</div>
          </div>
        </div>
      </div>

      {!isFlash && (
        <div style={s.statGrid}>
          <div style={s.statBox}><div style={{ ...s.statNum, color: 'var(--green)' }}>{score}</div><div style={s.statLabel}>CORRECT</div></div>
          <div style={s.statBox}><div style={{ ...s.statNum, color: 'var(--red)' }}>{total - score}</div><div style={s.statLabel}>WRONG</div></div>
          <div style={s.statBox}><div style={{ ...s.statNum, color: 'var(--cyan)' }}>{total}</div><div style={s.statLabel}>TOTAL</div></div>
          {timeTakenSec > 0 && (
            <div style={s.statBox}><div style={{ ...s.statNum, color: 'var(--cyan-dim)' }}>{formatTime(timeTakenSec)}</div><div style={s.statLabel}>TIME</div></div>
          )}
        </div>
      )}

      {/* Share button */}
      {!isFlash && (
        <button onClick={() => setShowShare(true)} style={s.shareBtn}>
          <Share2 size={15} /> SHARE YOUR SCORE
        </button>
      )}

      {answers.length > 0 && !isFlash && (
        <div style={s.card}>
          <button onClick={() => setShowReview(!showReview)} style={s.reviewToggle}>
            <span style={s.reviewTitle}>ANSWER REVIEW</span>
            <ChevronDown size={14} style={{ transform: showReview ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'var(--cyan-dim)' }} />
          </button>
          {showReview && answers.map((a, i) => (
            <div key={i} style={s.reviewItem}>
              <div style={s.reviewQ}>
                <span style={{ color: a.correct ? 'var(--green)' : 'var(--red)', fontWeight: 700, marginRight: 6 }}>{a.correct ? '✓' : '✗'}</span>
                {a.q.n}) {a.q.q}
              </div>
              <div style={{ ...s.reviewAnswer, color: a.correct ? 'var(--green)' : 'var(--red)' }}>Your answer: {a.given}</div>
              {!a.correct && <div style={s.reviewCorrect}>Correct: {a.q.a}</div>}
              {a.q.verses && a.q.verses.length > 0 && (
                <div style={s.reviewVerses}>{a.q.verses.slice(0, 3).map((v, j) => (
                  <div key={j} style={s.reviewVerse}><span style={s.rvRef}>{v.ref}</span> — {v.text.substring(0, 120)}{v.text.length > 120 ? '...' : ''}</div>
                ))}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={s.btnRow}>
        <button onClick={onPlayAgain} style={s.playAgainBtn}><RotateCcw size={16} /> PLAY AGAIN</button>
        <button onClick={onHome} style={s.homeBtn}><Home size={16} /> HOME</button>
      </div>

      {showShare && (
        <ShareCard score={score} total={total} pct={pct} mode={mode} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}

const s = {
  container: { maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' },
  streakBanner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 20 },
  streakText: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#FF8800', letterSpacing: 1 },
  header: { display: 'flex', justifyContent: 'center', marginBottom: 28 },
  circleWrap: { position: 'relative', width: 160, height: 160 },
  circleInner: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  pctNum: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: 'var(--text)' },
  pctLabel: { fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 2, marginTop: 2 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 10, marginBottom: 20 },
  statBox: { textAlign: 'center', padding: '14px 6px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(8px)' },
  statNum: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 },
  statLabel: { fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2, letterSpacing: 1.5 },
  shareBtn: { display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 20px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 2, color: 'var(--cyan)', background: 'var(--cyan-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 20, transition: 'all 0.2s' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24, backdropFilter: 'blur(8px)' },
  reviewToggle: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer' },
  reviewTitle: { fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 2 },
  reviewItem: { padding: '12px 16px', borderTop: '1px solid rgba(0,212,255,0.06)' },
  reviewQ: { fontSize: 13, color: 'var(--text)', marginBottom: 4 },
  reviewAnswer: { fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 2 },
  reviewCorrect: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', marginTop: 2 },
  reviewVerses: { marginTop: 6 },
  reviewVerse: { fontSize: 12, color: 'var(--text)', lineHeight: 1.6, borderLeft: '2px solid var(--cyan-dim)', paddingLeft: 10, marginTop: 6 },
  rvRef: { fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' },
  btnRow: { display: 'flex', gap: 10 },
  playAgainBtn: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px 24px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--cyan)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
  homeBtn: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px 24px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius)', boxShadow: '0 0 20px rgba(0,212,255,0.2)' },
}
