import { useState } from 'react'
import { ArrowLeft, Flame, Trophy, Target, Trash2 } from 'lucide-react'
import { getSessions, getStreak, getMissed, getQuestionStats, clearAllData } from '../lib/storage'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

export default function StatsScreen({ onBack }) {
  const sessions = getSessions()
  const streak = getStreak()
  const missedCount = getMissed().length
  const qStats = getQuestionStats()
  const [showClear, setShowClear] = useState(false)

  const totalAnswered = sessions.reduce((s, x) => s + x.total, 0)
  const totalCorrect = sessions.reduce((s, x) => s + x.score, 0)
  const avgPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const totalTime = sessions.reduce((s, x) => s + (x.timeSeconds || 0), 0)
  const totalMin = Math.round(totalTime / 60)

  // Chart data: last 20 sessions
  const chartData = sessions.slice(-20).map((s, i) => ({
    name: `${i + 1}`,
    score: s.pct,
  }))

  // Most missed questions
  const missedList = Object.entries(qStats)
    .map(([num, st]) => ({ num: parseInt(num), ...st, missRate: st.attempts > 0 ? Math.round((st.wrong / st.attempts) * 100) : 0 }))
    .filter(q => q.wrong > 0)
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 10)

  const handleClear = () => {
    clearAllData()
    setShowClear(false)
    onBack()
  }

  return (
    <div style={s.container} className="animate-in">
      <button onClick={onBack} style={s.backBtn}><ArrowLeft size={16} /> Back</button>

      <h1 style={s.title}>YOUR STATS</h1>

      {/* Summary cards */}
      <div style={s.grid}>
        <div style={s.statCard}>
          <Flame size={20} style={{ color: streak.current > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
          <div style={s.statNum}>{streak.current}</div>
          <div style={s.statLabel}>DAY STREAK</div>
          <div style={s.statSub}>Best: {streak.best}</div>
        </div>
        <div style={s.statCard}>
          <Trophy size={20} style={{ color: 'var(--cyan)' }} />
          <div style={s.statNum}>{avgPct}%</div>
          <div style={s.statLabel}>AVG SCORE</div>
          <div style={s.statSub}>{sessions.length} sessions</div>
        </div>
        <div style={s.statCard}>
          <Target size={20} style={{ color: 'var(--green)' }} />
          <div style={s.statNum}>{totalAnswered}</div>
          <div style={s.statLabel}>ANSWERED</div>
          <div style={s.statSub}>{totalMin} min studied</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div style={s.card}>
          <div style={s.cardTitle}>SCORE OVER TIME</div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#3A5570', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#3A5570', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0A1628', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#6B8FAD' }}
                  itemStyle={{ color: '#00D4FF' }}
                />
                <Area type="monotone" dataKey="score" stroke="#00D4FF" strokeWidth={2} fill="url(#cyanGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Most missed */}
      {missedList.length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>MOST MISSED QUESTIONS</div>
          {missedList.map((q, i) => (
            <div key={q.num} style={s.missedRow}>
              <span style={s.missedNum}>Q{q.num}</span>
              <div style={s.missedBar}>
                <div style={{ ...s.missedFill, width: `${q.missRate}%` }} />
              </div>
              <span style={s.missedPct}>{q.missRate}% missed</span>
              <span style={s.missedCount}>{q.wrong}/{q.attempts}</span>
            </div>
          ))}
        </div>
      )}

      {/* Session history */}
      {sessions.length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>RECENT SESSIONS</div>
          {sessions.slice(-10).reverse().map((sess, i) => (
            <div key={i} style={s.sessRow}>
              <div>
                <span style={s.sessPct}>{sess.pct}%</span>
                <span style={s.sessMode}>{sess.mode}</span>
              </div>
              <div style={s.sessRight}>
                <span>{sess.score}/{sess.total}</span>
                <span style={s.sessDate}>{new Date(sess.date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear data */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        {!showClear ? (
          <button onClick={() => setShowClear(true)} style={s.clearBtn}><Trash2 size={14} /> Clear All Data</button>
        ) : (
          <div style={s.clearConfirm}>
            <span>This will erase all stats, streaks, and missed questions.</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
              <button onClick={() => setShowClear(false)} style={s.clearCancel}>Cancel</button>
              <button onClick={handleClear} style={s.clearYes}>Confirm Clear</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 20px 80px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--cyan)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 20, cursor: 'pointer' },
  title: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--cyan)', letterSpacing: 3, textAlign: 'center', marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 },
  statCard: { textAlign: 'center', padding: '16px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(8px)' },
  statNum: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 4 },
  statLabel: { fontFamily: 'var(--font-display)', fontSize: 8, letterSpacing: 1.5, color: 'var(--text-muted)', marginTop: 2 },
  statSub: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: 16, backdropFilter: 'blur(8px)' },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 14 },
  missedRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 },
  missedNum: { fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text)', minWidth: 35 },
  missedBar: { flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  missedFill: { height: '100%', background: 'var(--red)', borderRadius: 2 },
  missedPct: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', minWidth: 65, textAlign: 'right' },
  missedCount: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', minWidth: 30, textAlign: 'right' },
  sessRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 },
  sessPct: { fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)', marginRight: 8 },
  sessMode: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' },
  sessRight: { display: 'flex', gap: 10, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-sec)' },
  sessDate: { color: 'var(--text-muted)', fontSize: 11 },
  clearBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, color: 'var(--red)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  clearConfirm: { padding: 16, background: 'var(--red-subtle)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text)' },
  clearCancel: { padding: '6px 14px', fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer' },
  clearYes: { padding: '6px 14px', fontSize: 12, background: 'var(--red)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' },
}
