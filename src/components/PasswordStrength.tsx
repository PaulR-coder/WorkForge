'use client'

export function getStrength(password: string) {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { label: 'Weak',   color: 'var(--red)',        pct: 1 }
  if (score === 2) return { label: 'Fair',   color: 'var(--amber)',      pct: 2 }
  if (score === 3) return { label: 'Good',   color: 'var(--blue-light)', pct: 3 }
  return              { label: 'Strong', color: 'var(--green)',       pct: 4 }
}

const SEGMENT_COLORS: Record<number, string[]> = {
  1: ['var(--red)',        '', '', ''],
  2: ['var(--amber)',      'var(--amber)',      '', ''],
  3: ['var(--blue-light)', 'var(--blue-light)', 'var(--blue-light)', ''],
  4: ['var(--green)',      'var(--green)',       'var(--green)',       'var(--green)'],
}

export default function PasswordStrength({ password }: { password: string }) {
  const s = getStrength(password)
  if (!s) return null
  const colors = SEGMENT_COLORS[s.pct]
  return (
    <div style={{ marginTop: -10, marginBottom: 14 }} aria-live="polite" aria-label={`Password strength: ${s.label}`}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {colors.map((c, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 3,
              background: c || 'var(--bg4)',
              transition: 'background .25s',
            }}
          />
        ))}
      </div>
      <div style={{
        fontSize: 10,
        color: s.color,
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.03em',
      }}>
        {s.label}
      </div>
    </div>
  )
}
