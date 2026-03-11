import { useState, useMemo } from 'react'
import { BarChart3, Flame, Trophy, Trash2, ChevronLeft, TrendingUp, Target, Clock } from 'lucide-react'
import { getSessions, clearSessions, getStreak, getMissedQuestions, clearMissedQuestions } from '../utils/storage'

// Tiny inline sparkline chart (no dependency needed)
function MiniChart({ data, color = 'var(--cyan)', height = 60 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 280
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = height - ((v - min) / range) * (height - 10) - 5
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w
        const y = height - ((v - min) / range) * (height - 10) - 5
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />
      })}
    </svg>
  )
}

export default function StatsScreen({ onBack }) {
  const sessions = getSessions()
  const streak = getStreak()
  const missed = getMissedQuestions()
  const [showConfirm, setShowConfirm] = useState(null) // 'sessions' | 'missed'

  const stats = useMemo(() => {
    if (sessions.length === 0) return null
    const scored = sessions.filter(s => s.mode !== 'flash')
    const totalQuestions = scored.reduce((a, s) => a + s.total, 0)
    const totalCorrect = scored.reduce((a, s) => a + s.score, 0)
    const avgPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
    const bestPct = scored.length > 0 ? Math.max(...scored.map(s => s.pct)) : 0
    const totalTime = sessions.reduce((a, s) => a + (s.timeTakenSec || 0), 0)
    const pctOverTime = scored.map(s => s.pct)
    
    // Recent 7 vs previous 7 trend
    let trend = null
    if (scored.length >= 4) {
      const half = Math.floor(scored.length / 2)
      const recent = scored.slice(-half)
      const older = scored.slice(0, half)
      const recentAvg = recent.reduce((a, s) => a + s.pct, 0) / recent.length
      const olderAvg = older.reduce((a, s) => a + s.pct, 0) / older.length
      trend = Math.round(recentAvg - olderAvg)
    }

    return { totalSessions: sessions.length, totalQuestions, totalCorrect, avgPct, bestPct, totalTime, pctOverTime, trend }
  }, [sessions])

  const missedList = useMemo(() => {
    return Object.entries(missed)
      .map(([n, count]) => ({ n: parseInt(n), count }))
      .sort((a, b) => b.count - a.count)
  }, [missed])

  const handleClear = (type) => {
    if (type === 'sessions') { clearSessions(); }
    if (type === 'missed') { clearMissedQuestions(); }
    setShowConfirm(null)
    // Force re-render
    window.location.reload()
  }

  const formatTime = (sec) => {
    if (!sec) return '0m'
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div style={s.container} className="animate-in">
      <button onClick={onBack} style={s.backBtn}><ChevronLeft size={16} /> Back</button>
      <h1 style={s.title}><BarChart3 size={22} /> STUDY STATS</h1>

      {/* Streak Banner */}
      <div style={s.streakBanner}>
        <Flame size={28} style={{ color: streak.current > 0 ? '#FF8800' : 'var(--text-muted)' }} />
        <div>
          <div style={s.streakNum}>{streak.current} Day{streak.current !== 1 ? 's' : ''}</div>
          <div style={s.streakLabel}>
            {streak.current > 0 ? 'Current Streak' : 'No active streak'}
            {streak.best > 0 && ` · Best: ${streak.best}`}
          </div>
        </div>
      </div>

      {!stats ? (
        <div style={s.empty}>
          <Target size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={s.emptyText}>No sessions recorded yet. Complete a quiz to start tracking your progress!</p>
        </div>
      ) : (<>
        {/* Overview Cards */}
        <div style={s.statGrid}>
          <div style={s.statBox}>
            <div style={{ ...s.statNum, color: 'var(--cyan)' }}>{stats.totalSessions}</div>
            <div style={s.statLabel}>SESSIONS</div>
          </div>
          <div style={s.statBox}>
            <div style={{ ...s.statNum, color: 'var(--green)' }}>{stats.avgPct}%</div>
            <div style={s.statLabel}>AVG SCORE</div>
          </div>
          <div style={s.statBox}>
            <div style={{ ...s.statNum, color: '#FFD700' }}>{stats.bestPct}%</div>
            <div style={s.statLabel}>BEST</div>
          </div>
          <div style={s.statBox}>
            <div style={{ ...s.statNum, color: 'var(--cyan-dim)' }}>{formatTime(stats.totalTime)}</div>
            <div style={s.statLabel}>STUDY TIME</div>
          </div>
        </div>

        {/* Trend */}
        {stats.trend !== null && (
          <div style={{ ...s.trendBanner, borderColor: stats.trend >= 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,51,102,0.2)' }}>
            <TrendingUp size={16} style={{ color: stats.trend >= 0 ? 'var(--green)' : 'var(--red)' }} />
            <span style={{ color: stats.trend >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 13 }}>
              {stats.trend >= 0 ? '+' : ''}{stats.trend}% trend
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              (recent half vs earlier half)
            </span>
          </div>
        )}

        {/* Progress Chart */}
        {stats.pctOverTime.length >= 2 && (
          <div style={s.card}>
            <div style={s.cardTitle}>SCORE OVER TIME</div>
            <MiniChart data={stats.pctOverTime} color="var(--cyan)" height={70} />
          </div>
        )}

        {/* Session History */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={s.cardTitle}>SESSION HISTORY</div>
            <button onClick={() => setShowConfirm('sessions')} style={s.clearBtn}><Trash2 size={12} /> Clear</button>
          </div>
          <div style={s.sessionList}>
            {sessions.slice().reverse().slice(0, 20).map((sess, i) => (
              <div key={i} style={s.sessionItem}>
                <div style={s.sessDate}>{new Date(sess.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div style={s.sessMode}>{sess.mode?.toUpperCase()}</div>
                <div style={{ ...s.sessPct, color: (sess.pct || 0) >= 70 ? 'var(--green)' : (sess.pct || 0) >= 50 ? 'var(--cyan)' : 'var(--red)' }}>
                  {sess.mode === 'flash' ? '—' : `${sess.pct}%`}
                </div>
                <div style={s.sessDetail}>{sess.score}/{sess.total}</div>
                {sess.timeTakenSec > 0 && <div style={s.sessTime}><Clock size={10} /> {formatTime(sess.timeTakenSec)}</div>}
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* Missed Questions Summary */}
      {missedList.length > 0 && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={s.cardTitle}>MOST MISSED ({missedList.length})</div>
            <button onClick={() => setShowConfirm('missed')} style={s.clearBtn}><Trash2 size={12} /> Clear</button>
          </div>
          <div style={s.missedList}>
            {missedList.slice(0, 15).map(({ n, count }) => (
              <div key={n} style={s.missedItem}>
                <span style={s.missedNum}>Q{n}</span>
                <div style={s.missedBar}>
                  <div style={{ ...s.missedFill, width: `${Math.min(count / Math.max(...missedList.map(m => m.count)), 1) * 100}%` }} />
                </div>
                <span style={s.missedCount}>×{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={s.overlay} onClick={() => setShowConfirm(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()} className="animate-in">
            <h3 style={s.modalTitle}>Clear {showConfirm === 'sessions' ? 'Session History' : 'Missed Questions'}?</h3>
            <p style={s.modalText}>This cannot be undone.</p>
            <div style={s.modalActions}>
              <button onClick={() => setShowConfirm(null)} style={s.modalCancel}>Cancel</button>
              <button onClick={() => handleClear(showConfirm)} style={s.modalConfirm}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  container: { maxWidth: 640, margin: '0 auto', padding: '24px 20px 80px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--cyan)', background: 'var(--cyan-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 20 },
  title: { fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: 800, color: 'var(--cyan)', letterSpacing: 2, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 },
  streakBanner: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--bg-card)', border: '1px solid rgba(255,136,0,0.2)', borderRadius: 'var(--radius)', marginBottom: 20, backdropFilter: 'blur(10px)' },
  streakNum: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text)' },
  streakLabel: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  empty: { textAlign: 'center', padding: '40px 20px' },
  emptyText: { fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 },
  statBox: { textAlign: 'center', padding: '16px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(8px)' },
  statNum: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 },
  statLabel: { fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', marginTop: 4, letterSpacing: 1.5 },
  trendBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid', borderRadius: 'var(--radius-sm)', marginBottom: 20 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', marginBottom: 20, backdropFilter: 'blur(8px)' },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 14 },
  clearBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--red)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.2)', borderRadius: 4 },
  sessionList: {},
  sessionItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(0,212,255,0.06)', fontSize: 12 },
  sessDate: { fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 50 },
  sessMode: { fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: 1, color: 'var(--text-secondary)', minWidth: 50, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, textAlign: 'center' },
  sessPct: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, minWidth: 42, textAlign: 'right' },
  sessDetail: { fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 },
  sessTime: { fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  missedList: {},
  missedItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' },
  missedNum: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--red)', minWidth: 36 },
  missedBar: { flex: 1, height: 6, background: 'rgba(255,51,102,0.1)', borderRadius: 3, overflow: 'hidden' },
  missedFill: { height: '100%', background: 'var(--red)', borderRadius: 3, transition: 'width 0.3s' },
  missedCount: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28, maxWidth: 340, width: '100%' },
  modalTitle: { fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text)', marginBottom: 8, letterSpacing: 1 },
  modalText: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 },
  modalActions: { display: 'flex', gap: 10 },
  modalCancel: { flex: 1, padding: '10px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' },
  modalConfirm: { flex: 1, padding: '10px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', background: 'var(--red)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff' },
}
