import { useState } from 'react'
import { ArrowLeft, LogOut, Award, Shield, Gauge, Trophy, Flame, Target, Edit2, Check, Trash2, KeyRound, Share2 } from 'lucide-react'
import { getXP, RANKS, checkAchievements, getSurvivalBest, getSpeedBest, getStreak, getSessions } from '../lib/storage'
import { setDisplayName, deleteAccount, resetPassword } from '../lib/authService'
import { deleteUserData } from '../lib/firestoreService'
import { saveUserData } from '../lib/firestoreService'

export default function ProfileScreen({ onBack, user, onLogout }) {
  const xp = getXP()
  const nextRank = RANKS.find(r => r.xpNeeded > xp.total)
  const xpPct = nextRank ? Math.round(((xp.total - (RANKS[xp.level - 1]?.xpNeeded || 0)) / (nextRank.xpNeeded - (RANKS[xp.level - 1]?.xpNeeded || 0))) * 100) : 100
  const achievements = checkAchievements()
  const survivalBest = getSurvivalBest()
  const speedBest = getSpeedBest()
  const streak = getStreak()
  const sessions = getSessions()
  const totalAnswered = sessions.reduce((s, x) => s + x.total, 0)
  const totalCorrect = sessions.reduce((s, x) => s + x.score, 0)

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(user?.displayName || '')

  const handleSaveName = async () => {
    if (nameInput.trim() && user) {
      await setDisplayName(nameInput.trim())
      await saveUserData(user.uid, { displayName: nameInput.trim() })
      setEditing(false)
    }
  }

  return (
    <div style={st.container} className="animate-in">
      <div style={st.topBar}>
        <button onClick={onBack} style={st.backBtn}><ArrowLeft size={16} /> Back</button>
        <button onClick={onLogout} style={st.logoutBtn}><LogOut size={14} /> Sign Out</button>
      </div>

      {/* Profile Card */}
      <div style={st.profileCard}>
        <div style={st.avatar}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" style={st.avatarImg} />
          ) : (
            <div style={st.avatarPlaceholder}>{(user?.displayName || 'A')[0].toUpperCase()}</div>
          )}
        </div>
        <div style={st.nameRow}>
          {editing ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={nameInput} onChange={e => setNameInput(e.target.value)} style={st.nameInput} placeholder="Enter name" autoFocus />
              <button onClick={handleSaveName} style={st.saveBtn}><Check size={14} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={st.displayName}>{user?.displayName || 'Anonymous'}</h2>
              <button onClick={() => setEditing(true)} style={st.editBtn}><Edit2 size={12} /></button>
            </div>
          )}
        </div>
        <div style={st.rankBadge}>Lv.{xp.level} {xp.title}</div>
      </div>

      {/* XP Progress */}
      <div style={st.card}>
        <div style={st.cardLabel}>EXPERIENCE</div>
        <div style={st.xpRow}>
          <Award size={20} style={{ color: 'var(--accent)' }} />
          <div style={{ flex: 1 }}>
            <div style={st.xpVal}>{xp.total} XP</div>
            <div style={st.xpBar}><div style={{ ...st.xpFill, width: `${xpPct}%` }} /></div>
            <div style={st.xpNext}>{nextRank ? `${nextRank.xpNeeded - xp.total} XP to ${nextRank.title}` : 'Max rank!'}</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={st.statsGrid}>
        <div style={st.statCard}>
          <Target size={18} style={{ color: 'var(--cyan)' }} />
          <div style={st.statVal}>{totalAnswered}</div>
          <div style={st.statLbl}>answered</div>
        </div>
        <div style={st.statCard}>
          <Check size={18} style={{ color: 'var(--green)' }} />
          <div style={st.statVal}>{totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}%</div>
          <div style={st.statLbl}>accuracy</div>
        </div>
        <div style={st.statCard}>
          <Flame size={18} style={{ color: 'var(--accent)' }} />
          <div style={st.statVal}>{streak.best}</div>
          <div style={st.statLbl}>best streak</div>
        </div>
        <div style={st.statCard}>
          <Shield size={18} style={{ color: 'var(--red)' }} />
          <div style={st.statVal}>{survivalBest}</div>
          <div style={st.statLbl}>survival</div>
        </div>
        <div style={st.statCard}>
          <Gauge size={18} style={{ color: 'var(--accent)' }} />
          <div style={st.statVal}>{speedBest}</div>
          <div style={st.statLbl}>speed best</div>
        </div>
        <div style={st.statCard}>
          <Trophy size={18} style={{ color: 'var(--cyan)' }} />
          <div style={st.statVal}>{sessions.length}</div>
          <div style={st.statLbl}>games</div>
        </div>
      </div>

      {/* All Ranks */}
      <div style={st.card}>
        <div style={st.cardLabel}>RANK PROGRESSION</div>
        <div style={st.rankGrid}>
          {RANKS.map(r => {
            const reached = xp.level >= r.level
            return (
              <div key={r.level} style={{ ...st.rankItem, opacity: reached ? 1 : 0.3 }}>
                <div style={{ ...st.rankLvl, color: reached ? 'var(--accent)' : 'var(--text-muted)' }}>{r.level}</div>
                <div style={st.rankName}>{r.title}</div>
                <div style={st.rankXp}>{r.xpNeeded} XP</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Achievements */}
      <div style={st.card}>
        <div style={st.cardLabel}>ACHIEVEMENTS ({achievements.unlocked.length}/{achievements.all.length})</div>
        <div style={st.achGrid}>
          {achievements.all.map(a => {
            const unlocked = achievements.unlocked.includes(a.id)
            return (
              <div key={a.id} style={{ ...st.achCard, opacity: unlocked ? 1 : 0.3 }}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <div style={st.achName}>{a.name}</div>
                <div style={st.achDesc}>{a.desc}</div>
              </div>
            )
          })}
        </div>
      </div>
    
      {/* Share Stats */}
      <div style={st.card}>
        <div style={st.cardLabel}>SHARE</div>
        <button onClick={() => {
          const text = `🥛 Milk Trivia Stats\n📊 Level ${xp.level} ${xp.title}\n⭐ ${xp.total} XP\n✅ ${totalAnswered} questions answered (${totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}% accuracy)\n🔥 ${streak.best} day best streak\n🏆 ${achievements.unlocked.length}/${achievements.all.length} achievements\n\nTest your knowledge: https://milktrivia.com`
          if (navigator.share) {
            navigator.share({ title: 'Milk Trivia Stats', text }).catch(() => {})
          } else {
            navigator.clipboard.writeText(text).then(() => alert('Stats copied to clipboard!'))
          }
        }} style={st.shareBtn}><Share2 size={14} /> Share My Stats</button>
      </div>

      {/* Account Management */}
      <div style={st.card}>
        <div style={st.cardLabel}>ACCOUNT</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {user?.providerData?.[0]?.providerId === 'password' && (
            <button onClick={async () => {
              try { await resetPassword(user.email); alert('Password reset email sent!') }
              catch (e) { alert(e.message) }
            }} style={st.accountBtn}><KeyRound size={14} /> Change Password</button>
          )}
          <button onClick={async () => {
            if (!confirm('Are you sure you want to delete your account? This cannot be undone. All your progress will be lost.')) return
            if (!confirm('FINAL WARNING: This will permanently delete your account and all data. Type OK to confirm.')) return
            try {
              await deleteUserData(user.uid)
              await deleteAccount()
              alert('Account deleted.')
            } catch (e) {
              alert('Failed to delete account: ' + e.message + '. You may need to sign in again first.')
            }
          }} style={st.deleteBtn}><Trash2 size={14} /> Delete Account</button>
        </div>
      </div>

    </div>
  )
}

const st = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 16px 80px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-sec)', cursor: 'pointer' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-display)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer' },
  profileCard: { textAlign: 'center', padding: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 16, backdropFilter: 'blur(10px)' },
  avatar: { marginBottom: 12 },
  avatarImg: { width: 64, height: 64, borderRadius: '50%', border: '3px solid var(--accent)' },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #D97706)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff' },
  nameRow: { marginBottom: 8 },
  displayName: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: 1 },
  editBtn: { width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer' },
  nameInput: { padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--cyan)', borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none' },
  saveBtn: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cyan)', border: 'none', borderRadius: 6, color: 'var(--bg)', cursor: 'pointer' },
  rankBadge: { display: 'inline-block', padding: '4px 14px', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--accent)', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 16 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 },
  cardLabel: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan-dim)', marginBottom: 12 },
  xpRow: { display: 'flex', alignItems: 'center', gap: 12 },
  xpVal: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  xpBar: { width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  xpFill: { height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--accent), #D97706)', transition: 'width 0.5s' },
  xpNext: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 },
  statCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', gap: 4 },
  statVal: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text)' },
  statLbl: { fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: 1, textTransform: 'uppercase' },
  rankGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
  rankItem: { padding: '8px 6px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' },
  rankLvl: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800 },
  rankName: { fontSize: 10, fontWeight: 600, color: 'var(--text)', marginTop: 2 },
  rankXp: { fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  achGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
  achCard: { padding: '10px 6px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' },
  achName: { fontSize: 10, fontWeight: 700, color: 'var(--text)', marginTop: 4, fontFamily: 'var(--font-display)' },
  achDesc: { fontSize: 8, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 },
  shareBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  accountBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  deleteBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,51,51,0.3)', background: 'rgba(255,51,51,0.08)', color: '#ff4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}
