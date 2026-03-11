import { useRef, useState, useCallback } from 'react'
import { Share2, Download, Check, X } from 'lucide-react'

export default function ShareCard({ score, total, pct, mode, onClose }) {
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)

  const grade = pct >= 95 ? 'EXCELLENT' : pct >= 85 ? 'WELL DONE' : pct >= 70 ? 'GOOD WORK' : pct >= 50 ? 'KEEP STUDYING' : 'STUDY HARDER'
  const gradeColor = pct >= 70 ? '#00FF88' : pct >= 50 ? '#00D4FF' : '#FF3366'

  const generateCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    const w = 600, h = 340
    canvas.width = w
    canvas.height = h

    // Background
    const bg = ctx.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, '#030810')
    bg.addColorStop(1, '#0A1628')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // Border glow
    ctx.strokeStyle = 'rgba(0,212,255,0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(2, 2, w - 4, h - 4)

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(0,212,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i < w; i += 30) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke() }
    for (let i = 0; i < h; i += 30) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke() }

    // Score circle
    const cx = 150, cy = 170, r = 70
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0,212,255,0.15)'; ctx.lineWidth = 8; ctx.stroke()
    
    // Score arc
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (pct / 100) * Math.PI * 2
    ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, endAngle)
    ctx.strokeStyle = gradeColor; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke()

    // Percentage text
    ctx.fillStyle = '#E0F0FF'
    ctx.font = '700 36px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`${pct}%`, cx, cy + 8)

    // Grade
    ctx.fillStyle = gradeColor
    ctx.font = '700 11px monospace'
    ctx.fillText(grade, cx, cy + 30)

    // Right side text
    const rx = 360
    ctx.textAlign = 'left'
    
    // Title
    ctx.fillStyle = '#00D4FF'
    ctx.font = '700 20px monospace'
    ctx.fillText('240 MILK QUESTIONS', rx, 80)

    // Mode
    ctx.fillStyle = '#6B8FAD'
    ctx.font = '500 12px monospace'
    ctx.fillText(`MODE: ${mode?.toUpperCase() || 'QUIZ'}`, rx, 108)

    // Score detail
    ctx.fillStyle = '#E0F0FF'
    ctx.font = '500 16px monospace'
    ctx.fillText(`${score} / ${total} correct`, rx, 150)

    // Separator
    ctx.strokeStyle = 'rgba(0,212,255,0.2)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(rx, 170); ctx.lineTo(rx + 200, 170); ctx.stroke()

    // Branding
    ctx.fillStyle = '#00D4FF'
    ctx.font = '700 14px monospace'
    ctx.fillText('CyberJudah.io', rx, 200)
    ctx.fillStyle = '#3A5570'
    ctx.font = '400 11px monospace'
    ctx.fillText('Scripture Trivia', rx, 220)

    // Date
    ctx.fillStyle = '#3A5570'
    ctx.font = '400 10px monospace'
    ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), rx, 280)

    return canvas
  }, [pct, score, total, mode, grade, gradeColor])

  const handleDownload = () => {
    const canvas = generateCanvas()
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `CyberJudah-Score-${pct}pct.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleShare = async () => {
    const canvas = generateCanvas()
    if (!canvas) return
    
    const text = `I scored ${pct}% on 240 Milk Questions! ${score}/${total} correct.\n\nTest your scripture knowledge at CyberJudah.io`
    
    if (navigator.share) {
      try {
        canvas.toBlob(async (blob) => {
          const file = new File([blob], 'score.png', { type: 'image/png' })
          await navigator.share({ text, files: [file] })
        })
      } catch {
        // Fallback to clipboard
        await navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } else {
      await navigator.clipboard?.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Render preview
  const previewRef = useCallback((node) => {
    if (!node) return
    canvasRef.current = node
    // Draw immediately
    setTimeout(() => generateCanvas(), 50)
  }, [generateCanvas])

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()} className="animate-in">
        <button onClick={onClose} style={s.closeBtn}><X size={16} /></button>
        <div style={s.cardTitle}>SHARE YOUR SCORE</div>
        <canvas ref={previewRef} style={s.canvas} />
        <div style={s.actions}>
          <button onClick={handleDownload} style={s.btn}>
            <Download size={15} /> Save Image
          </button>
          <button onClick={handleShare} style={{ ...s.btn, ...s.btnPrimary }}>
            {copied ? <><Check size={15} /> Copied!</> : <><Share2 size={15} /> Share</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20, backdropFilter: 'blur(6px)' },
  modal: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, maxWidth: 420, width: '100%', position: 'relative' },
  closeBtn: { position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 4 },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan)', marginBottom: 16, textAlign: 'center' },
  canvas: { width: '100%', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 },
  actions: { display: 'flex', gap: 10 },
  btn: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '11px 16px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' },
  btnPrimary: { background: 'linear-gradient(135deg, var(--cyan), var(--cyan-dim))', border: 'none', color: 'var(--bg)' },
}
