import { Sun, Moon, Volume2, VolumeX } from 'lucide-react'

export default function SettingsBar({ theme, onThemeToggle, soundOn, onSoundToggle }) {
  return (
    <div style={s.bar}>
      <button onClick={onThemeToggle} style={s.btn} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <button onClick={onSoundToggle} style={s.btn} title={soundOn ? 'Mute sounds' : 'Enable sounds'}>
        {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
    </div>
  )
}

const s = {
  bar: { position: 'fixed', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 50 },
  btn: {
    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text-secondary)', backdropFilter: 'blur(10px)', transition: 'all 0.2s',
  },
}
