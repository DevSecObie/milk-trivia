import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Swords, Clock, Users, Copy, Check, X, ArrowRight, Zap } from 'lucide-react'
import { createDuel, joinDuel, watchDuel, submitDuelAnswer, getOpenDuels, deleteDuel } from '../lib/firestoreService'
import { isSoundOn } from '../lib/storage'
import { playCorrect, playIncorrect, playClick } from '../lib/sounds'

function shuffleArray(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

export default function DuelScreen({ onBack, user, allQuestions }) {
  const [phase, setPhase] = useState('lobby') // lobby, waiting, playing, results
  const [duelId, setDuelId] = useState(null)
  const [duelData, setDuelData] = useState(null)
  const [openDuels, setOpenDuels] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  // Game state
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(null)
  const [options, setOptions] = useState([])
  const [roundStart, setRoundStart] = useState(null)
  const unsubRef = useRef(null)

  const scriptureAnswers = useRef(allQuestions.filter(q => q.isScripture).map(q => q.a))
  const nonScriptureAnswers = useRef(allQuestions.filter(q => !q.isScripture && q.a.length < 60).map(q => q.a))

  const isHost = duelData?.hostUid === user?.uid
  const myScore = isHost ? duelData?.hostScore : duelData?.guestScore
  const opScore = isHost ? duelData?.guestScore : duelData?.hostScore
  const myName = isHost ? duelData?.hostName : duelData?.guestName
  const opName = isHost ? duelData?.guestName : duelData?.hostName
  const myAnswers = isHost ? (duelData?.hostAnswers || []) : (duelData?.guestAnswers || [])

  const sfx = (fn) => { if (isSoundOn()) fn() }

  // Load open duels
  useEffect(() => {
    if (phase === 'lobby') {
      getOpenDuels().then(setOpenDuels).catch(() => {})
    }
  }, [phase])

  // Watch duel updates
  useEffect(() => {
    if (!duelId) return
    unsubRef.current = watchDuel(duelId, (data) => {
      setDuelData(data)
      if (data.status === 'playing' && phase === 'waiting') {
        setPhase('playing')
      }
      if (data.status === 'finished') {
        setPhase('results')
      }
    })
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [duelId])

  // Setup round options
  useEffect(() => {
    if (phase !== 'playing' || !duelData) return
    const round = duelData.currentRound
    if (round >= duelData.totalRounds) return
    const q = duelData.questions[round]
    if (!q) return
    setSubmitted(false)
    setCorrect(null)
    setRoundStart(Date.now())
    const answerPool = q.isScripture ? scriptureAnswers.current : nonScriptureAnswers.current
    const wrong = shuffleArray(answerPool.filter(a => a !== q.a)).slice(0, 3)
    setOptions(shuffleArray([q.a, ...wrong]))
  }, [duelData?.currentRound, phase])

  const handleCreate = async () => {
    setLoading(true); setError(null)
    try {
      const pool = shuffleArray([...allQuestions]).slice(0, 10).map(q => ({
        n: q.n, q: q.q, a: q.a, isScripture: !!q.isScripture,
      }))
      const id = await createDuel(user.uid, user.displayName || 'Player 1', pool)
      setDuelId(id)
      setPhase('waiting')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleJoin = async (id) => {
    setLoading(true); setError(null)
    try {
      await joinDuel(id || joinCode, user.uid, user.displayName || 'Player 2')
      setDuelId(id || joinCode)
      setPhase('playing')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleCancel = async () => {
    if (duelId) await deleteDuel(duelId).catch(() => {})
    if (unsubRef.current) unsubRef.current()
    setDuelId(null); setDuelData(null); setPhase('lobby')
  }

  const handleAnswer = async (opt) => {
    if (submitted || !duelData) return
    sfx(playClick)
    const q = duelData.questions[duelData.currentRound]
    const isRight = opt === q.a
    setSubmitted(true)
    setCorrect(isRight)
    sfx(isRight ? playCorrect : playIncorrect)
    const timeMs = Date.now() - roundStart
    await submitDuelAnswer(duelId, isHost, duelData.currentRound, isRight, timeMs)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(duelId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // LOBBY
  if (phase === 'lobby') {
    return (
      <div style={st.container} className="animate-in">
        <div style={st.topBar}>
          <button onClick={onBack} style={st.backBtn}><ArrowLeft size={16} /> Back</button>
          <h2 style={st.title}>Duel Mode</h2>
          <div style={{ width: 60 }} />
        </div>

        <div style={st.heroCard}>
          <Swords size={40} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          <h3 style={st.heroTitle}>MULTIPLAYER DUEL</h3>
          <p style={st.heroDesc}>Challenge another player to 10 rounds of scripture trivia. Fastest correct answer wins each round!</p>
        </div>

        <button onClick={handleCreate} disabled={loading} style={st.createBtn}>
          <Swords size={16} /> CREATE DUEL
        </button>

        <div style={st.divider}><span>OR JOIN</span></div>

        <div style={st.joinRow}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter duel code..." style={st.joinInput} />
          <button onClick={() => handleJoin()} disabled={!joinCode.trim() || loading} style={st.joinBtn}>JOIN</button>
        </div>

        {error && <div style={st.error}>{error}</div>}

        {openDuels.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={st.secLabel}>OPEN DUELS</div>
            {openDuels.map(d => (
              <div key={d.id} style={st.duelRow}>
                <div>
                  <div style={st.duelHost}>{d.hostName}</div>
                  <div style={st.duelCode}>{d.id.slice(0, 8)}...</div>
                </div>
                <button onClick={() => handleJoin(d.id)} style={st.joinSmBtn}>JOIN</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // WAITING
  if (phase === 'waiting') {
    return (
      <div style={st.container} className="animate-in">
        <div style={st.waitCard}>
          <Users size={40} style={{ color: 'var(--cyan)', marginBottom: 12 }} />
          <h3 style={st.heroTitle}>WAITING FOR OPPONENT</h3>
          <p style={st.heroDesc}>Share the code below with your opponent:</p>
          <div style={st.codeBox}>
            <span style={st.code}>{duelId}</span>
            <button onClick={copyCode} style={st.copyBtn}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div style={st.dots}>
            <span style={st.dot} /><span style={st.dot} /><span style={st.dot} />
          </div>
          <button onClick={handleCancel} style={st.cancelBtn}>Cancel</button>
        </div>
      </div>
    )
  }

  // PLAYING
  if (phase === 'playing' && duelData) {
    const round = duelData.currentRound
    if (round >= duelData.totalRounds) return null
    const q = duelData.questions[round]
    const waitingForOther = myAnswers.length > round

    return (
      <div style={st.container}>
        <div style={st.topBar}>
          <div style={st.scoreP1}>
            <span style={st.pName}>{myName || 'You'}</span>
            <span style={st.pScore}>{myScore || 0}</span>
          </div>
          <div style={st.roundBadge}>Round {round + 1}/{duelData.totalRounds}</div>
          <div style={st.scoreP2}>
            <span style={st.pScore}>{opScore || 0}</span>
            <span style={st.pName}>{opName || 'Opponent'}</span>
          </div>
        </div>

        {waitingForOther ? (
          <div style={st.waitRound} className="animate-in">
            <Clock size={24} style={{ color: 'var(--cyan)' }} />
            <div style={st.waitText}>Waiting for opponent...</div>
          </div>
        ) : (
          <div key={round} className="animate-in">
            <div style={st.mTag}>DUEL — ROUND {round + 1}</div>
            <h2 style={st.qTxt}>{q.n}) {q.q}</h2>
            <div style={st.optGrid}>
              {options.map((opt, i) => {
                const isC = opt === q.a
                let ss = {}
                if (submitted && isC) ss = st.optOk
                else if (submitted && !isC) ss = { opacity: 0.35 }
                return (
                  <button key={i} onClick={() => handleAnswer(opt)} disabled={submitted} style={{ ...st.opt, ...ss }}>
                    <span style={st.optTxt}>{opt}</span>
                  </button>
                )
              })}
            </div>
            {submitted && (
              <div style={{ ...st.feedback, background: correct ? 'var(--green-subtle)' : 'var(--red-subtle)', borderColor: correct ? 'var(--green)' : 'var(--red)', color: correct ? 'var(--green)' : 'var(--red)' }}>
                {correct ? 'Correct! Waiting for opponent...' : `Wrong! Answer: ${q.a}`}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // RESULTS
  if (phase === 'results' && duelData) {
    const iWon = myScore > opScore
    const tie = myScore === opScore
    return (
      <div style={st.container} className="animate-in">
        <div style={st.resultsCard}>
          {tie ? (
            <Zap size={48} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          ) : iWon ? (
            <Swords size={48} style={{ color: 'var(--green)', marginBottom: 12 }} />
          ) : (
            <X size={48} style={{ color: 'var(--red)', marginBottom: 12 }} />
          )}
          <h2 style={{ ...st.heroTitle, color: tie ? 'var(--accent)' : iWon ? 'var(--green)' : 'var(--red)' }}>
            {tie ? "IT'S A TIE!" : iWon ? 'YOU WIN!' : 'YOU LOSE'}
          </h2>
          <div style={st.scoreBoard}>
            <div style={st.resultP}>
              <div style={st.resultName}>{myName || 'You'}</div>
              <div style={st.resultScore}>{myScore || 0}</div>
            </div>
            <div style={st.resultVs}>VS</div>
            <div style={st.resultP}>
              <div style={st.resultName}>{opName || 'Opponent'}</div>
              <div style={st.resultScore}>{opScore || 0}</div>
            </div>
          </div>
          <button onClick={onBack} style={st.doneBtn}>DONE</button>
          <button onClick={() => { setPhase('lobby'); setDuelId(null); setDuelData(null) }} style={st.rematchBtn}>
            <Swords size={14} /> NEW DUEL
          </button>
        </div>
      </div>
    )
  }

  return null
}

const st = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px 16px 80px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-sec)', cursor: 'pointer' },
  title: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: 2 },
  heroCard: { textAlign: 'center', padding: 28, background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(0,212,255,0.04))', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius)', marginBottom: 16 },
  heroTitle: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--accent)', letterSpacing: 2, marginBottom: 8 },
  heroDesc: { fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.5 },
  createBtn: { display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 2, color: '#fff', background: 'linear-gradient(135deg, var(--accent), #D97706)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '0 0 20px rgba(251,191,36,0.2)' },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-display)', letterSpacing: 2 },
  joinRow: { display: 'flex', gap: 8 },
  joinInput: { flex: 1, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none' },
  joinBtn: { padding: '10px 20px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--cyan)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--bg)', cursor: 'pointer' },
  error: { marginTop: 10, padding: '8px 12px', fontSize: 12, color: 'var(--red)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: 'var(--radius-sm)' },
  secLabel: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-muted)', marginBottom: 8 },
  duelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 6 },
  duelHost: { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  duelCode: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  joinSmBtn: { padding: '5px 14px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', background: 'var(--cyan-subtle)', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-sm)', color: 'var(--cyan)', cursor: 'pointer' },
  // Waiting
  waitCard: { textAlign: 'center', padding: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backdropFilter: 'blur(10px)' },
  codeBox: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', margin: '16px 0' },
  code: { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--cyan)', wordBreak: 'break-all' },
  copyBtn: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cyan-subtle)', border: '1px solid var(--cyan)', borderRadius: 6, color: 'var(--cyan)', cursor: 'pointer' },
  dots: { display: 'flex', justifyContent: 'center', gap: 8, margin: '16px 0' },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse 1.5s infinite' },
  cancelBtn: { padding: '8px 20px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer' },
  // Playing
  scoreP1: { display: 'flex', alignItems: 'center', gap: 6 },
  scoreP2: { display: 'flex', alignItems: 'center', gap: 6 },
  pName: { fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--text-sec)' },
  pScore: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--accent)' },
  roundBadge: { padding: '4px 12px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-muted)' },
  mTag: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--accent)', marginBottom: 8 },
  qTxt: { fontFamily: 'var(--font-body)', fontSize: 'clamp(16px,4vw,22px)', fontWeight: 600, lineHeight: 1.45, color: 'var(--text)', marginBottom: 20 },
  optGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  opt: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', minHeight: 52, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', textAlign: 'left', width: '100%', transition: 'all 0.2s', cursor: 'pointer', lineHeight: 1.4 },
  optOk: { borderColor: 'var(--green)', background: 'var(--green-subtle)' },
  optTxt: { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 },
  feedback: { padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid', marginTop: 14, fontSize: 13, fontWeight: 600, textAlign: 'center' },
  waitRound: { textAlign: 'center', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  waitText: { fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: 1 },
  // Results
  resultsCard: { textAlign: 'center', padding: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backdropFilter: 'blur(10px)' },
  scoreBoard: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, margin: '20px 0' },
  resultP: { textAlign: 'center' },
  resultName: { fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: 'var(--text-sec)', marginBottom: 4 },
  resultScore: { fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'var(--text)' },
  resultVs: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 2 },
  doneBtn: { width: '100%', padding: '13px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 8 },
  rematchBtn: { display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '10px 24px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--accent)', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
}
