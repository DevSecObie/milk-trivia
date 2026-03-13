import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Swords, Clock, Users, Copy, Check, X, Zap, Share2, Trophy, Shield, Flame, BookOpen, MessageCircle, AlertTriangle, Timer } from 'lucide-react'
import { createDuel, joinDuel, watchDuel, submitDuelAnswer, getOpenDuels, deleteDuel } from '../lib/firestoreService'
import { isSoundOn } from '../lib/storage'
import { playCorrect, playIncorrect, playClick } from '../lib/sounds'
import questions from '../data/questions.json'
import SCENARIOS from '../data/scenarios'
import WHO_SAID_IT from '../data/whoSaidIt'

function shuffleArray(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

// Answer pools for MC mode (same as GameScreen)
const ALL_REFS = [...new Set(questions.flatMap(q => q.refs || []))]
const ALL_ANS = questions.filter(q => !q.isScripture && q.a.length < 60).map(q => q.a)

const TIMER_SECONDS = 20

const DUEL_MODES = [
  { id: 'mc', label: 'Scripture Trivia', desc: 'Classic 240 Milk Questions', icon: BookOpen },
  { id: 'scenario', label: 'Scenario', desc: 'Match real-life situations to scripture', icon: AlertTriangle },
  { id: 'whosaid', label: 'Who Said It?', desc: 'Identify who spoke the biblical quote', icon: MessageCircle },
]

// Build question pool based on mode
function buildDuelPool(mode, allQuestions) {
  if (mode === 'scenario') {
    return shuffleArray(SCENARIOS).slice(0, 10).map((item, i) => ({
      n: i + 1,
      q: item.scenario,
      a: item.correctRef,
      options: shuffleArray([item.correctRef, ...item.wrongRefs]),
      duelMode: 'scenario',
    }))
  }
  if (mode === 'whosaid') {
    return shuffleArray(WHO_SAID_IT).slice(0, 10).map((item, i) => ({
      n: i + 1,
      q: `"${item.quote}"`,
      a: item.speaker,
      options: shuffleArray([item.speaker, ...item.wrong]),
      duelMode: 'whosaid',
    }))
  }
  // Default: mc
  return shuffleArray([...allQuestions]).slice(0, 10).map(q => ({
    n: q.n, q: q.q, a: q.a, isScripture: !!q.isScripture,
    duelMode: 'mc',
  }))
}

export default function DuelScreen({ onBack, user, allQuestions }) {
  const [phase, setPhase] = useState('lobby')
  const [duelId, setDuelId] = useState(null)
  const [duelData, setDuelData] = useState(null)
  const [openDuels, setOpenDuels] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState('mc')

  // Game state
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(null)
  const [selected, setSelected] = useState(null)
  const [options, setOptions] = useState([])
  const [roundStart, setRoundStart] = useState(null)
  const [showVsSplash, setShowVsSplash] = useState(false)
  const [scorePopup, setScorePopup] = useState(null)
  const [streak, setStreak] = useState(0)
  const [prevMyScore, setPrevMyScore] = useState(0)
  const [prevOpScore, setPrevOpScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const unsubRef = useRef(null)
  const timerRef = useRef(null)

  const isHost = duelData?.hostUid === user?.uid
  const myScore = isHost ? duelData?.hostScore : duelData?.guestScore
  const opScore = isHost ? duelData?.guestScore : duelData?.hostScore
  const myName = isHost ? duelData?.hostName : duelData?.guestName
  const opName = isHost ? duelData?.guestName : duelData?.hostName
  const myAnswers = isHost ? (duelData?.hostAnswers || []) : (duelData?.guestAnswers || [])

  const sfx = (fn) => { if (isSoundOn()) fn() }

  // Auto-join from shared link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedDuelId = params.get('duel')
    if (sharedDuelId && phase === 'lobby') {
      window.history.replaceState({}, '', window.location.pathname)
      handleJoin(sharedDuelId)
    }
  }, [])

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
        setShowVsSplash(true)
        setTimeout(() => { setShowVsSplash(false); setPhase('playing') }, 1500)
      }
      if (data.status === 'finished') setPhase('results')
    })
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [duelId])

  // Score change detection for popups
  useEffect(() => {
    if (!duelData || phase !== 'playing') return
    const ms = isHost ? (duelData.hostScore || 0) : (duelData.guestScore || 0)
    const os = isHost ? (duelData.guestScore || 0) : (duelData.hostScore || 0)
    if (ms > prevMyScore) {
      setScorePopup({ text: '+1', color: 'var(--green)', side: 'left' })
      setTimeout(() => setScorePopup(null), 800)
    } else if (os > prevOpScore) {
      setScorePopup({ text: '+1', color: 'var(--red)', side: 'right' })
      setTimeout(() => setScorePopup(null), 800)
    }
    setPrevMyScore(ms)
    setPrevOpScore(os)
  }, [duelData?.hostScore, duelData?.guestScore])

  // Setup round options
  useEffect(() => {
    if (phase !== 'playing' || !duelData) return
    const round = duelData.currentRound
    if (round >= duelData.totalRounds) return
    const q = duelData.questions[round]
    if (!q) return
    setSubmitted(false)
    setCorrect(null)
    setSelected(null)
    setRoundStart(Date.now())
    setTimeLeft(TIMER_SECONDS)

    // If question has pre-built options (scenario, whosaid), use them
    if (q.options) {
      setOptions(q.options)
    } else if (q.isScripture) {
      const wrong = shuffleArray(ALL_REFS.filter(r => r !== q.a)).slice(0, 3)
      setOptions(shuffleArray([q.a, ...wrong]))
    } else {
      const wrong = shuffleArray(ALL_ANS.filter(a => a !== q.a)).slice(0, 3)
      setOptions(shuffleArray([q.a, ...wrong]))
    }
  }, [duelData?.currentRound, phase])

  // 20-second countdown timer
  useEffect(() => {
    if (phase !== 'playing' || !duelData || submitted) {
      clearInterval(timerRef.current)
      return
    }
    const waitingForOther = myAnswers.length > duelData.currentRound
    if (waitingForOther) return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current)
          handleTimeExpired()
          return 0
        }
        return prev - 0.1
      })
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [phase, submitted, duelData?.currentRound, myAnswers.length])

  const handleTimeExpired = async () => {
    if (submitted || !duelData) return
    setSubmitted(true)
    setCorrect(false)
    setStreak(0)
    sfx(playIncorrect)
    const timeMs = TIMER_SECONDS * 1000
    await submitDuelAnswer(duelId, isHost, duelData.currentRound, false, timeMs)
  }

  const handleCreate = async () => {
    setLoading(true); setError(null)
    try {
      const pool = buildDuelPool(selectedMode, allQuestions)
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
      setShowVsSplash(true)
      setTimeout(() => { setShowVsSplash(false); setPhase('playing') }, 1500)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleCancel = async () => {
    if (duelId) await deleteDuel(duelId).catch(() => {})
    if (unsubRef.current) unsubRef.current()
    clearInterval(timerRef.current)
    setDuelId(null); setDuelData(null); setPhase('lobby')
  }

  const handleAnswer = async (opt) => {
    if (submitted || !duelData) return
    clearInterval(timerRef.current)
    sfx(playClick)
    setSelected(opt)
    const q = duelData.questions[duelData.currentRound]
    const isRight = opt === q.a
    setSubmitted(true)
    setCorrect(isRight)
    sfx(isRight ? playCorrect : playIncorrect)
    if (isRight) setStreak(s => s + 1)
    else setStreak(0)
    const timeMs = Date.now() - roundStart
    await submitDuelAnswer(duelId, isHost, duelData.currentRound, isRight, timeMs)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(duelId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const shareDuel = async () => {
    const duelUrl = `${window.location.origin}${window.location.pathname}?duel=${duelId}`
    const shareData = {
      title: '240 Milk Questions — Duel Challenge',
      text: `${user.displayName || 'Someone'} challenged you to a scripture trivia duel! Tap to join:`,
      url: duelUrl,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n${duelUrl}`).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  // Get mode-specific hint text
  const getModeHint = (q) => {
    const mode = q.duelMode || duelData?.questions?.[0]?.duelMode || 'mc'
    if (mode === 'scenario') return 'What scripture should be applied?'
    if (mode === 'whosaid') return 'Who said this?'
    return null
  }

  // VS SPLASH OVERLAY
  if (showVsSplash) {
    return (
      <div style={st.vsOverlay}>
        <div style={st.vsContent}>
          <div className="duel-slide-left" style={st.vsPlayer}>
            <Shield size={28} style={{ color: 'var(--cyan)' }} />
            <div style={st.vsPlayerName}>{myName || 'You'}</div>
          </div>
          <div className="duel-vs-flash" style={st.vsBadge}>
            <Swords size={32} className="duel-swords" style={{ color: 'var(--accent)' }} />
            <div style={st.vsText}>VS</div>
          </div>
          <div className="duel-slide-right" style={st.vsPlayer}>
            <Shield size={28} style={{ color: 'var(--red)' }} />
            <div style={st.vsPlayerName}>{opName || 'Opponent'}</div>
          </div>
        </div>
      </div>
    )
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
          <p style={st.heroDesc}>Challenge another player to 10 rounds. {TIMER_SECONDS}s per question — fastest correct answer wins!</p>
        </div>

        {/* Mode Selection */}
        <div style={st.secLabel}>SELECT GAME MODE</div>
        <div style={st.modeGrid}>
          {DUEL_MODES.map(m => {
            const Icon = m.icon
            const active = selectedMode === m.id
            return (
              <button key={m.id} onClick={() => setSelectedMode(m.id)} style={{
                ...st.modeCard,
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active ? 'rgba(251,191,36,0.08)' : 'var(--bg-card)',
                boxShadow: active ? '0 0 16px rgba(251,191,36,0.15)' : 'none',
              }}>
                <Icon size={20} style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 6 }} />
                <div style={{ ...st.modeLabel, color: active ? 'var(--accent)' : 'var(--text)' }}>{m.label}</div>
                <div style={st.modeDesc}>{m.desc}</div>
                {active && <div style={st.modeCheck}><Check size={10} /></div>}
              </button>
            )
          })}
        </div>

        <button onClick={handleCreate} disabled={loading} style={st.createBtn}>
          <Swords size={16} /> {loading ? 'CREATING...' : 'CREATE DUEL'}
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
          <button onClick={shareDuel} style={st.shareBtn}>
            <Share2 size={14} /> SHARE INVITE
          </button>
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
    const timeElapsed = roundStart ? Math.min(((Date.now() - roundStart) / 1000), TIMER_SECONDS) : 0
    const timerPct = Math.max(0, (timeLeft / TIMER_SECONDS) * 100)
    const timerDanger = timeLeft <= 5
    const hint = getModeHint(q)

    return (
      <div style={st.container}>
        {/* Battle Scoreboard */}
        <div style={st.battleBar} className="duel-pulse-glow">
          <div style={st.battlePlayer}>
            <div style={st.battleAvatar}>
              <Shield size={16} style={{ color: 'var(--cyan)' }} />
            </div>
            <div>
              <div style={st.battleName}>{myName || 'You'}</div>
              <div style={{ position: 'relative' }}>
                <span style={{ ...st.battleScore, color: 'var(--cyan)' }}>{myScore || 0}</span>
                {scorePopup && scorePopup.side === 'left' && (
                  <span className="duel-float-up" style={{ ...st.popup, color: scorePopup.color }}>+1</span>
                )}
              </div>
            </div>
          </div>

          <div style={st.roundCenter}>
            <Swords size={16} style={{ color: 'var(--accent)' }} />
            <div style={st.roundNum}>R{round + 1}/{duelData.totalRounds}</div>
            {streak >= 2 && (
              <div className="duel-streak" style={st.streakBadge}>
                <Flame size={10} /> {streak}x
              </div>
            )}
          </div>

          <div style={{ ...st.battlePlayer, flexDirection: 'row-reverse' }}>
            <div style={{ ...st.battleAvatar, background: 'var(--red-subtle)', borderColor: 'rgba(255,51,102,0.3)' }}>
              <Shield size={16} style={{ color: 'var(--red)' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={st.battleName}>{opName || 'Opponent'}</div>
              <div style={{ position: 'relative' }}>
                <span style={{ ...st.battleScore, color: 'var(--red)' }}>{opScore || 0}</span>
                {scorePopup && scorePopup.side === 'right' && (
                  <span className="duel-float-up" style={{ ...st.popup, color: scorePopup.color }}>+1</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timer Bar */}
        {!waitingForOther && (
          <div style={st.timerBarOuter}>
            <div style={{
              ...st.timerBarFill,
              width: `${timerPct}%`,
              background: timerDanger
                ? 'linear-gradient(90deg, var(--red), var(--red-dim))'
                : 'linear-gradient(90deg, var(--cyan-dim), var(--cyan))',
              transition: submitted ? 'none' : 'width 0.1s linear',
            }} />
            <div style={{
              ...st.timerText,
              color: timerDanger ? 'var(--red)' : 'var(--text-muted)',
            }}>
              <Timer size={10} /> {Math.ceil(timeLeft)}s
            </div>
          </div>
        )}

        {/* Progress Pips */}
        <div style={st.progressPips}>
          {Array.from({ length: duelData.totalRounds }, (_, i) => (
            <div key={i} style={{
              ...st.pip,
              background: i < round ? 'var(--accent)' : i === round ? 'var(--cyan)' : 'var(--border)',
              boxShadow: i === round ? '0 0 8px var(--cyan)' : 'none',
              transform: i === round ? 'scale(1.3)' : 'scale(1)',
            }} />
          ))}
        </div>

        {waitingForOther ? (
          <div style={st.waitRound} className="animate-in">
            <div style={st.waitIcon}>
              <Clock size={28} style={{ color: 'var(--cyan)' }} />
            </div>
            <div style={st.waitTitle}>WAITING FOR OPPONENT</div>
            <div style={st.waitSub}>
              {correct ? 'Great answer! Waiting for your opponent to respond...'
                : correct === false ? 'Opponent is still answering...'
                : 'Waiting for opponent...'}
            </div>
            <div style={st.waitDots}>
              <span style={{ ...st.waitDot, animationDelay: '0s' }} />
              <span style={{ ...st.waitDot, animationDelay: '0.3s' }} />
              <span style={{ ...st.waitDot, animationDelay: '0.6s' }} />
            </div>
          </div>
        ) : (
          <div key={round} className="animate-in">
            <div style={st.mTag}>
              <Swords size={10} style={{ marginRight: 4 }} />
              DUEL — ROUND {round + 1}
            </div>
            {hint && <div style={st.hint}>{hint}</div>}
            <h2 style={st.qTxt}>{q.n}) {q.q}</h2>

            {/* MC-style options with indicators */}
            <div style={st.optGrid}>
              {options.map((opt, i) => {
                const isC = opt === q.a
                const isSel = selected === opt
                let ss = {}
                if (submitted) {
                  if (isC && isSel) ss = st.optOk
                  else if (!isC && isSel) ss = st.optBad
                  else if (isC && !isSel) ss = st.optMiss
                  else ss = { opacity: 0.35 }
                } else if (isSel) ss = st.optSel

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    disabled={submitted}
                    className={submitted && !isC && isSel ? 'duel-shake' : submitted && isC && isSel ? 'duel-scale-in' : ''}
                    style={{ ...st.opt, ...ss }}
                  >
                    <div style={{
                      ...st.ind,
                      ...(isSel && !submitted ? st.indSel : {}),
                      ...(submitted && isC && isSel ? st.indOk : {}),
                      ...(submitted && !isC && isSel ? st.indBad : {}),
                      ...(submitted && isC && !isSel ? st.indMiss : {}),
                    }}>
                      {submitted && isC ? '✓' : submitted && isSel && !isC ? '✗' : ''}
                    </div>
                    <span style={st.optTxt}>{opt}</span>
                  </button>
                )
              })}
            </div>

            {/* Feedback banner */}
            {submitted && (
              <div className={correct ? 'duel-scale-in' : 'duel-shake'} style={{
                ...st.feedbackBanner,
                background: correct ? 'var(--green-subtle)' : 'var(--red-subtle)',
                borderColor: correct ? 'var(--green)' : 'var(--red)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {correct
                    ? <Check size={18} style={{ color: 'var(--green)' }} />
                    : <X size={18} style={{ color: 'var(--red)' }} />
                  }
                  <span style={{ color: correct ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: 1 }}>
                    {!selected ? 'TIME\'S UP!' : correct ? 'CORRECT!' : 'INCORRECT'}
                  </span>
                  {correct && streak >= 2 && (
                    <span className="duel-streak" style={st.streakInline}>
                      <Flame size={12} /> {streak}x STREAK
                    </span>
                  )}
                </div>
                {!correct && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-sec)', fontFamily: 'var(--font-mono)' }}>
                    Answer: {q.a}
                  </div>
                )}
                {selected && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {timeElapsed.toFixed(1)}s
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // RESULTS
  if (phase === 'results' && duelData) {
    const iWon = (myScore || 0) > (opScore || 0)
    const tie = (myScore || 0) === (opScore || 0)
    return (
      <div style={st.container} className="animate-in">
        <div style={st.resultsCard}>
          <div className="duel-swords" style={{ marginBottom: 16 }}>
            {tie ? (
              <Zap size={56} style={{ color: 'var(--accent)' }} />
            ) : iWon ? (
              <Trophy size={56} style={{ color: 'var(--accent)' }} />
            ) : (
              <Shield size={56} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>

          <h2 className="duel-scale-in" style={{
            ...st.heroTitle,
            fontSize: 24,
            color: tie ? 'var(--accent)' : iWon ? 'var(--green)' : 'var(--red)',
            marginBottom: 4,
          }}>
            {tie ? "IT'S A TIE!" : iWon ? 'VICTORY!' : 'DEFEAT'}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
            {tie ? 'Evenly matched!' : iWon ? 'You outdueled your opponent!' : 'Better luck next time!'}
          </div>

          <div style={st.resultBattle}>
            <div className="duel-slide-left" style={{
              ...st.resultCard,
              borderColor: iWon ? 'var(--green)' : tie ? 'var(--accent)' : 'var(--border)',
              boxShadow: iWon ? '0 0 20px rgba(0,255,136,0.15)' : 'none',
            }}>
              <Shield size={20} style={{ color: 'var(--cyan)', marginBottom: 6 }} />
              <div style={st.resultCardName}>{myName || 'You'}</div>
              <div style={{ ...st.resultCardScore, color: iWon ? 'var(--green)' : 'var(--text)' }}>{myScore || 0}</div>
              {iWon && <div style={st.winTag}>WINNER</div>}
            </div>

            <div style={st.resultVsIcon}>
              <Swords size={20} style={{ color: 'var(--accent)' }} />
            </div>

            <div className="duel-slide-right" style={{
              ...st.resultCard,
              borderColor: !iWon && !tie ? 'var(--green)' : tie ? 'var(--accent)' : 'var(--border)',
              boxShadow: !iWon && !tie ? '0 0 20px rgba(0,255,136,0.15)' : 'none',
            }}>
              <Shield size={20} style={{ color: 'var(--red)', marginBottom: 6 }} />
              <div style={st.resultCardName}>{opName || 'Opponent'}</div>
              <div style={{ ...st.resultCardScore, color: !iWon && !tie ? 'var(--green)' : 'var(--text)' }}>{opScore || 0}</div>
              {!iWon && !tie && <div style={st.winTag}>WINNER</div>}
            </div>
          </div>

          <button onClick={onBack} style={st.doneBtn}>DONE</button>
          <button onClick={() => { setPhase('lobby'); setDuelId(null); setDuelData(null); setStreak(0); setPrevMyScore(0); setPrevOpScore(0) }} style={st.rematchBtn}>
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
  // Mode selection
  modeGrid: { display: 'flex', gap: 8, marginBottom: 16 },
  modeCard: { flex: 1, padding: '14px 8px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' },
  modeLabel: { fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 },
  modeDesc: { fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.3 },
  modeCheck: { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  // Create/Join
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
  shareBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: '#fff', background: 'linear-gradient(135deg, var(--accent), #D97706)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginTop: 8, boxShadow: '0 0 20px rgba(251,191,36,0.2)' },
  cancelBtn: { padding: '8px 20px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', background: 'var(--red-subtle)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer' },
  // VS Splash
  vsOverlay: { position: 'fixed', inset: 0, background: 'rgba(3,8,16,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(8px)' },
  vsContent: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 40 },
  vsPlayer: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  vsPlayerName: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: 1 },
  vsBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  vsText: { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: 'var(--accent)', letterSpacing: 4, textShadow: '0 0 20px rgba(251,191,36,0.5)' },
  // Battle Scoreboard
  battleBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 4, backdropFilter: 'blur(10px)' },
  battlePlayer: { display: 'flex', alignItems: 'center', gap: 8 },
  battleAvatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cyan-subtle)', border: '1px solid rgba(0,212,255,0.3)' },
  battleName: { fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 600, color: 'var(--text-sec)', letterSpacing: 0.5 },
  battleScore: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900 },
  roundCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  roundNum: { fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1 },
  popup: { position: 'absolute', top: -8, left: '50%', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, pointerEvents: 'none' },
  streakBadge: { display: 'flex', alignItems: 'center', gap: 2, fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)', padding: '2px 6px', background: 'rgba(251,191,36,0.12)', borderRadius: 8 },
  streakInline: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)', marginLeft: 8 },
  // Timer bar
  timerBarOuter: { position: 'relative', width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: 2 },
  timerText: { position: 'absolute', right: 0, top: 6, display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600 },
  // Progress pips
  progressPips: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16, marginBottom: 14 },
  pip: { width: 8, height: 8, borderRadius: '50%', transition: 'all 0.3s' },
  // Playing
  hint: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', background: 'var(--cyan-subtle)', padding: '5px 12px', borderRadius: 6, marginBottom: 10, display: 'inline-block', border: '1px solid var(--border)' },
  mTag: { display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--accent)', marginBottom: 8 },
  qTxt: { fontFamily: 'var(--font-body)', fontSize: 'clamp(18px,4.5vw,24px)', fontWeight: 600, lineHeight: 1.45, color: 'var(--text)', marginBottom: 24 },
  optGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  opt: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', minHeight: 52, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', textAlign: 'left', width: '100%', transition: 'all 0.2s', cursor: 'pointer', backdropFilter: 'blur(8px)', lineHeight: 1.4 },
  optSel: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)', boxShadow: '0 0 12px rgba(0,212,255,0.1)' },
  optOk: { borderColor: 'var(--green)', background: 'var(--green-subtle)', boxShadow: '0 0 12px rgba(0,255,136,0.15)' },
  optBad: { borderColor: 'var(--red)', background: 'var(--red-subtle)' },
  optMiss: { borderColor: 'var(--cyan)', background: 'var(--cyan-subtle)', opacity: 0.6 },
  ind: { width: 22, height: 22, minWidth: 22, borderRadius: '50%', border: '2px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, transition: 'all 0.15s' },
  indSel: { borderColor: 'var(--cyan)', background: 'var(--cyan)', color: 'var(--bg)' },
  indOk: { borderColor: 'var(--green)', background: 'var(--green)', color: 'var(--bg)' },
  indBad: { borderColor: 'var(--red)', background: 'var(--red)', color: '#fff' },
  indMiss: { borderColor: 'var(--cyan)', background: 'var(--cyan)', color: 'var(--bg)' },
  optTxt: { fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 },
  feedbackBanner: { padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid', marginTop: 16 },
  // Waiting for opponent
  waitRound: { textAlign: 'center', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  waitIcon: { width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cyan-subtle)', border: '1px solid rgba(0,212,255,0.2)', marginBottom: 4 },
  waitTitle: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: 2 },
  waitSub: { fontSize: 13, color: 'var(--text-sec)', maxWidth: 260, lineHeight: 1.4 },
  waitDots: { display: 'flex', gap: 8, marginTop: 8 },
  waitDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse 1.5s infinite' },
  // Results
  resultsCard: { textAlign: 'center', padding: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backdropFilter: 'blur(10px)' },
  resultBattle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '20px 0' },
  resultCard: { flex: 1, textAlign: 'center', padding: '20px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', position: 'relative' },
  resultCardName: { fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--text-sec)', marginBottom: 4 },
  resultCardScore: { fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900 },
  resultVsIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 },
  winTag: { position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', padding: '2px 10px', fontSize: 8, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: '#fff', background: 'var(--green)', borderRadius: 10 },
  doneBtn: { width: '100%', padding: '13px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1.5, color: 'var(--bg)', background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 8 },
  rematchBtn: { display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '10px 24px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, color: 'var(--accent)', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
}
