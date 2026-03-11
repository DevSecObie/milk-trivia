import { useState, useEffect, useCallback } from 'react'
import { Trophy, ChevronLeft, RefreshCw, Send } from 'lucide-react'

export default function Leaderboard({ onBack }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [myName, setMyName] = useState('')
  const [error, setError] = useState(null)

  const loadLeaderboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Load from shared persistent storage
      if (window.storage) {
        const result = await window.storage.get('leaderboard_data', true)
        if (result && result.value) {
          const data = JSON.parse(result.value)
          setEntries(data.sort((a, b) => b.pct - a.pct || b.score - a.score))
        }
      }
      // Load saved username
      if (window.storage) {
        try {
          const nameResult = await window.storage.get('my_leaderboard_name')
          if (nameResult && nameResult.value) setMyName(nameResult.value)
        } catch { /* no name saved */ }
      }
    } catch (e) {
      setError('Could not load leaderboard')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadLeaderboard() }, [loadLeaderboard])

  const submitScore = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      // Get best local score
      const sessions = JSON.parse(localStorage.getItem('cj_sessions') || '[]')
      const scored = sessions.filter(s => s.mode !== 'flash')
      if (scored.length === 0) {
        setError('Complete a quiz first!')
        setSubmitting(false)
        return
      }
      const best = scored.reduce((a, b) => (b.pct > a.pct ? b : a))
      
      const entry = {
        name: name.trim(),
        score: best.score,
        total: best.total,
        pct: best.pct,
        mode: best.mode,
        date: new Date().toISOString(),
        id: Date.now().toString(36)
      }

      if (window.storage) {
        let current = []
        try {
          const result = await window.storage.get('leaderboard_data', true)
          if (result && result.value) current = JSON.parse(result.value)
        } catch { /* empty */ }

        // Remove previous entry by same name, keep latest
        current = current.filter(e => e.name.toLowerCase() !== name.trim().toLowerCase())
        current.push(entry)
        current.sort((a, b) => b.pct - a.pct || b.score - a.score)
        current = current.slice(0, 50) // Keep top 50

        await window.storage.set('leaderboard_data', JSON.stringify(current), true)
        await window.storage.set('my_leaderboard_name', name.trim())
        setMyName(name.trim())
        setEntries(current)
      }
      setName('')
    } catch (e) {
      setError('Failed to submit score')
    }
    setSubmitting(false)
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={s.container} className="animate-in">
      <button onClick={onBack} style={s.backBtn}><ChevronLeft size={16} /> Back</button>
      <h1 style={s.title}><Trophy size={22} /> LEADERBOARD</h1>

      {/* Submit Score */}
      <div style={s.submitCard}>
        <div style={s.submitLabel}>Submit Your Best Score</div>
        <div style={s.submitRow}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitScore()}
            placeholder={myName || "Your name..."}
            maxLength={20}
            style={s.input}
          />
          <button onClick={submitScore} disabled={submitting || !name.trim()} style={s.submitBtn}>
            <Send size={14} /> {submitting ? '...' : 'Submit'}
          </button>
        </div>
        {error && <div style={s.error}>{error}</div>}
        <div style={s.hint}>Your highest scored session will be submitted. Data is shared with all users.</div>
      </div>

      {/* Leaderboard */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={s.cardTitle}>TOP SCORES</div>
          <button onClick={loadLeaderboard} style={s.refreshBtn}><RefreshCw size={12} /></button>
        </div>

        {loading ? (
          <div style={s.loadingText}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={s.emptyText}>No scores yet. Be the first!</div>
        ) : (
          <div>
            {entries.map((entry, i) => (
              <div key={entry.id || i} style={{ ...s.entry, ...(entry.name === myName ? s.entryMine : {}) }}>
                <div style={s.rank}>{i < 3 ? medals[i] : `${i + 1}`}</div>
                <div style={s.entryName}>{entry.name}</div>
                <div style={{ ...s.entryPct, color: entry.pct >= 70 ? 'var(--green)' : entry.pct >= 50 ? 'var(--cyan)' : 'var(--red)' }}>
                  {entry.pct}%
                </div>
                <div style={s.entryDetail}>{entry.score}/{entry.total}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  container: { maxWidth: 640, margin: '0 auto', padding: '24px 20px 80px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--cyan)', background: 'var(--cyan-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 20 },
  title: { fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: 800, color: '#FFD700', letterSpacing: 2, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 },
  submitCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', marginBottom: 20, backdropFilter: 'blur(8px)' },
  submitLabel: { fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 10 },
  submitRow: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none' },
  submitBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--bg)', whiteSpace: 'nowrap' },
  hint: { fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' },
  error: { fontSize: 11, color: 'var(--red)', marginTop: 6 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', backdropFilter: 'blur(8px)' },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)' },
  refreshBtn: { padding: '6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)' },
  loadingText: { textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 },
  emptyText: { textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 },
  entry: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(0,212,255,0.06)' },
  entryMine: { background: 'var(--cyan-subtle)', margin: '0 -18px', padding: '10px 18px', borderRadius: 4 },
  rank: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', minWidth: 28, textAlign: 'center' },
  entryName: { flex: 1, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  entryPct: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, minWidth: 44, textAlign: 'right' },
  entryDetail: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', minWidth: 40, textAlign: 'right' },
}
