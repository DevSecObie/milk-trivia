import { useState, useEffect } from 'react'
import { ArrowLeft, Trophy, Zap, Shield, Gauge, Crown } from 'lucide-react'
import { getLeaderboard } from '../lib/firestoreService'

const BOARDS = [
  { id: 'xp', label: 'XP', icon: Crown },
  { id: 'totalAnswered', label: 'Questions', icon: Zap },
  { id: 'survivalBest', label: 'Survival', icon: Shield },
  { id: 'speedBest', label: 'Speed', icon: Gauge },
  { id: 'streak', label: 'Streak', icon: Trophy },
]

export default function LeaderboardScreen({ onBack, currentUid }) {
  const [board, setBoard] = useState('xp')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getLeaderboard(board, 50)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [board])

  return (
    <div style={st.container} className="animate-in">
      <div style={st.topBar}>
        <button onClick={onBack} style={st.backBtn}><ArrowLeft size={16} /> Back</button>
        <h2 style={st.title}>Leaderboard</h2>
        <div style={{ width: 60 }} />
      </div>

      <div style={st.tabs}>
        {BOARDS.map(b => {
          const Icon = b.icon
          const active = board === b.id
          return (
            <button key={b.id} onClick={() => setBoard(b.id)} style={{ ...st.tab, ...(active ? st.tabActive : {}) }}>
              <Icon size={14} />
              <span>{b.label}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={st.loading}>Loading...</div>
      ) : data.length === 0 ? (
        <div style={st.empty}>No scores yet. Be the first!</div>
      ) : (
        <div style={st.list}>
          {data.map((entry) => {
            const isMe = entry.uid === currentUid
            const medal = entry.rank === 1 ? '\u{1F947}' : entry.rank === 2 ? '\u{1F948}' : entry.rank === 3 ? '\u{1F949}' : null
            return (
              <div key={entry.uid} style={{ ...st.row, ...(isMe ? st.rowMe : {}), ...(entry.rank <= 3 ? st.rowTop : {}) }}>
                <div style={st.rank}>
                  {medal ? <span style={{ fontSize: 18 }}>{medal}</span> : <span style={st.rankNum}>{entry.rank}</span>}
                </div>
                <div style={st.info}>
                  <div style={st.name}>{entry.displayName || entry.hostName || 'Anonymous'}{isMe && <span style={st.youBadge}>YOU</span>}</div>
                  <div style={st.meta}>Lv.{entry.level || 1} {entry.title || 'Beginner'}</div>
                </div>
                <div style={st.score}>
                  {board === 'xp' && `${entry.xp || 0} XP`}
                  {board === 'totalAnswered' && `${entry.totalAnswered || 0}`}
                  {board === 'survivalBest' && `${entry.survivalBest || 0}`}
                  {board === 'speedBest' && `${entry.speedBest || 0}`}
                  {board === 'streak' && `${entry.streak || 0} days`}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const st = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 16px 80px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-sec)', cursor: 'pointer' },
  title: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: 2 },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' },
  tab: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 0.5, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive: { background: 'var(--cyan-subtle)', borderColor: 'var(--cyan)', color: 'var(--cyan)' },
  loading: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' },
  rowMe: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)' },
  rowTop: { borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.04)' },
  rank: { width: 32, textAlign: 'center', flexShrink: 0 },
  rankNum: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--text-muted)' },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 },
  youBadge: { fontSize: 8, fontWeight: 800, padding: '1px 6px', background: 'var(--cyan)', color: 'var(--bg)', borderRadius: 8, letterSpacing: 1 },
  meta: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  score: { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 },
}
