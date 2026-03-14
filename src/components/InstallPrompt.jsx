import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show after 30 seconds of engagement
      setTimeout(() => setShow(true), 30000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show || !deferredPrompt) return null

  return (
    <div style={s.banner}>
      <div style={s.content}>
        <span style={s.icon}>🥛</span>
        <div>
          <p style={s.title}>Install Milk Trivia</p>
          <p style={s.desc}>Add to home screen for the best experience</p>
        </div>
      </div>
      <div style={s.buttons}>
        <button style={s.installBtn} onClick={async () => {
          deferredPrompt.prompt()
          await deferredPrompt.userChoice
          setDeferredPrompt(null)
          setShow(false)
        }}>Install</button>
        <button style={s.dismissBtn} onClick={() => setShow(false)}>Later</button>
      </div>
    </div>
  )
}

const s = {
  banner: { position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 1000, background: 'var(--bg-card, rgba(0,0,0,0.9))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 16px', backdropFilter: 'blur(10px)' },
  content: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  icon: { fontSize: 28 },
  title: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #fff)', margin: 0 },
  desc: { fontSize: 12, color: 'var(--text-secondary, rgba(255,255,255,0.5))', margin: '2px 0 0' },
  buttons: { display: 'flex', gap: 8 },
  installBtn: { flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  dismissBtn: { padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text-secondary, rgba(255,255,255,0.5))', fontSize: 13, cursor: 'pointer' },
}
