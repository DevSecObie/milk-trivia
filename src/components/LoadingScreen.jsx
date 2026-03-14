export default function LoadingScreen() {
  return (
    <div style={s.wrapper}>
      <div style={s.content}>
        <span style={s.icon}>🥛</span>
        <div style={s.spinner} />
        <p style={s.text}>Loading your progress...</p>
      </div>
    </div>
  )
}

const s = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  content: { textAlign: 'center' },
  icon: { fontSize: 48, display: 'block', marginBottom: 16 },
  spinner: {
    width: 32, height: 32, margin: '0 auto 12px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid var(--accent, #6366f1)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: { fontSize: 14, color: 'var(--text-secondary, rgba(255,255,255,0.5))' },
}
