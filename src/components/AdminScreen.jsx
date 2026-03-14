import { useState, useEffect } from 'react'
import { getAllUsers } from '../lib/firestoreService'

const ADMIN_EMAILS = ['obediyah.ben.israel@gmail.com', 'oisrae1@wgu.edu']

export default function AdminScreen({ onBack, currentUid, userEmail }) {
  if (!ADMIN_EMAILS.includes(userEmail)) {
    return <div style={s.wrapper}><p style={s.loadingText}>Access denied.</p><button onClick={onBack} style={s.backBtn}>← Back</button></div>
  }
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('xp')
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    getAllUsers().then(u => { setUsers(u); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.uid || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))

  if (loading) return <div style={s.wrapper}><p style={s.loadingText}>Loading users...</p></div>

  if (selectedUser) return <UserDetail user={selectedUser} onBack={() => setSelectedUser(null)} />

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <button onClick={onBack} style={s.backBtn}>← Back</button>
        <h1 style={s.title}>👑 Admin Dashboard</h1>
      </div>

      {/* Stats overview */}
      <div style={s.statsRow}>
        <div style={s.statCard}><p style={s.statNum}>{users.length}</p><p style={s.statLabel}>Total Users</p></div>
        <div style={s.statCard}><p style={s.statNum}>{users.reduce((s, u) => s + (u.totalAnswered || 0), 0)}</p><p style={s.statLabel}>Questions Answered</p></div>
        <div style={s.statCard}><p style={s.statNum}>{users.filter(u => (u.sessions || []).some(s => { const d = new Date(s.date); return d.toDateString() === new Date().toDateString() })).length}</p><p style={s.statLabel}>Active Today</p></div>
      </div>

      {/* Search + Sort */}
      <div style={s.controls}>
        <input style={s.searchInput} type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={s.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="xp">XP</option>
          <option value="totalAnswered">Questions</option>
          <option value="level">Level</option>
          <option value="survivalBest">Survival Best</option>
        </select>
      </div>

      {/* User list */}
      <div style={s.userList}>
        {filtered.map((u, i) => (
          <button key={u.uid} style={s.userRow} onClick={() => setSelectedUser(u)}>
            <div style={s.userRank}>{i + 1}</div>
            <div style={s.userInfo}>
              <p style={s.userName}>{u.displayName || 'Anonymous'} {u.uid === currentUid ? '(you)' : ''}</p>
              <p style={s.userMeta}>Level {u.level || 1} · {u.title || 'Beginner'} · {u.totalAnswered || 0} questions</p>
            </div>
            <div style={s.userXP}>{u.xp || 0} XP</div>
          </button>
        ))}
        {filtered.length === 0 && <p style={s.empty}>No users found</p>}
      </div>
    </div>
  )
}

function UserDetail({ user, onBack }) {
  const sessions = user.sessions || []
  const streak = user.streak || { current: 0, best: 0 }
  const achievements = user.achievements || []
  const missed = user.missed || []
  const recentSessions = sessions.slice(-10).reverse()

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <button onClick={onBack} style={s.backBtn}>← Back</button>
        <h1 style={s.title}>{user.displayName || 'Anonymous'}</h1>
      </div>

      {/* User stats grid */}
      <div style={s.detailGrid}>
        <div style={s.detailCard}><p style={s.detailNum}>{user.xp || 0}</p><p style={s.detailLabel}>Total XP</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{user.level || 1}</p><p style={s.detailLabel}>Level</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{user.title || 'Beginner'}</p><p style={s.detailLabel}>Rank</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{user.totalAnswered || 0}</p><p style={s.detailLabel}>Answered</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{user.totalCorrect || 0}</p><p style={s.detailLabel}>Correct</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{user.totalAnswered ? Math.round((user.totalCorrect || 0) / user.totalAnswered * 100) : 0}%</p><p style={s.detailLabel}>Accuracy</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{streak.current}</p><p style={s.detailLabel}>Streak</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{streak.best}</p><p style={s.detailLabel}>Best Streak</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{user.survivalBest || 0}</p><p style={s.detailLabel}>Survival Best</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{user.speedBest || 0}</p><p style={s.detailLabel}>Speed Best</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{achievements.length}</p><p style={s.detailLabel}>Achievements</p></div>
        <div style={s.detailCard}><p style={s.detailNum}>{missed.length}</p><p style={s.detailLabel}>Missed Qs</p></div>
      </div>

      {/* Recent sessions */}
      <h3 style={s.sectionTitle}>Recent Sessions ({sessions.length} total)</h3>
      <div style={s.sessionList}>
        {recentSessions.map((sess, i) => (
          <div key={i} style={s.sessionRow}>
            <span style={s.sessionMode}>{sess.mode}</span>
            <span>{sess.score}/{sess.total} ({sess.pct}%)</span>
            <span style={s.sessionDate}>{sess.date ? new Date(sess.date).toLocaleDateString() : ''}</span>
          </div>
        ))}
        {recentSessions.length === 0 && <p style={s.empty}>No sessions yet</p>}
      </div>
    </div>
  )
}

const s = {
  wrapper: { maxWidth: 800, margin: '0 auto', padding: '20px 16px', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 14px', color: 'var(--text-primary, #fff)', cursor: 'pointer', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #fff)', margin: 0 },
  loadingText: { color: 'var(--text-secondary, rgba(255,255,255,0.6))', textAlign: 'center', marginTop: 60 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 },
  statCard: { background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' },
  statNum: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #fff)', margin: 0 },
  statLabel: { fontSize: 11, color: 'var(--text-secondary, rgba(255,255,255,0.5))', margin: '4px 0 0' },
  controls: { display: 'flex', gap: 10, marginBottom: 14 },
  searchInput: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary, #fff)', fontSize: 14, outline: 'none' },
  sortSelect: { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary, #fff)', fontSize: 14 },
  userList: { display: 'flex', flexDirection: 'column', gap: 6 },
  userRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'inherit', transition: 'background 0.15s' },
  userRank: { width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-primary, #fff)', flexShrink: 0 },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #fff)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userMeta: { fontSize: 12, color: 'var(--text-secondary, rgba(255,255,255,0.5))', margin: '2px 0 0' },
  userXP: { fontSize: 14, fontWeight: 600, color: 'var(--accent, #6366f1)', flexShrink: 0 },
  empty: { color: 'var(--text-secondary)', textAlign: 'center', padding: 20, fontSize: 14 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 },
  detailCard: { background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' },
  detailNum: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #fff)', margin: 0, wordBreak: 'break-word' },
  detailLabel: { fontSize: 10, color: 'var(--text-secondary, rgba(255,255,255,0.5))', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: 'var(--text-primary, #fff)', margin: '0 0 10px' },
  sessionList: { display: 'flex', flexDirection: 'column', gap: 4 },
  sessionRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', fontSize: 13, color: 'var(--text-primary, #fff)' },
  sessionMode: { textTransform: 'capitalize', fontWeight: 500 },
  sessionDate: { color: 'var(--text-secondary, rgba(255,255,255,0.5))' },
}
