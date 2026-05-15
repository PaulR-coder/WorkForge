'use client'

export function getStrength(password: string) {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { label: 'Weak', color: 'var(--red)', pct: 20 }
  if (score === 2) return { label: 'Fair', color: 'var(--amber)', pct: 45 }
  if (score === 3) return { label: 'Good', color: '#5ba3f5', pct: 70 }
  return { label: 'Strong', color: 'var(--green)', pct: 100 }
}

export default function PasswordStrength({ password }: { password: string }) {
  const s = getStrength(password)
  if (!s) return null
  return (
    <div style={{ marginTop: -10, marginBottom: 14 }} aria-live="polite" aria-label={`Password strength: ${s.label}`}>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 2, transition: 'width .25s, background .25s' }} />
      </div>
      <div style={{ fontSize: 10, color: s.color, fontWeight: 700, marginTop: 3 }}>{s.label}</div>
    </div>
  )
}
