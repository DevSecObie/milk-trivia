import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('App error:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 480, margin: '60px auto', padding: '40px 20px', textAlign: 'center', fontFamily: "'Rajdhani', sans-serif" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: 20, color: '#FF3366', marginBottom: 12 }}>SOMETHING WENT WRONG</h2>
          <p style={{ color: '#6B8FAD', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            The app encountered an unexpected error. This usually fixes itself by reloading.
          </p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700, fontFamily: "'Orbitron', monospace", letterSpacing: 2, color: '#030810', background: '#00D4FF', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            RELOAD APP
          </button>
          <button onClick={() => { localStorage.clear(); window.location.reload() }} style={{ display: 'block', margin: '16px auto 0', padding: '8px 16px', fontSize: 12, color: '#6B8FAD', background: 'none', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 6, cursor: 'pointer' }}>
            Clear data & reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
