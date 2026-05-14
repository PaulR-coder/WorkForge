import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'var(--purple)', admin: 'var(--amber)', dispatcher: '#5ba3f5', tech: 'var(--green)', readonly: 'var(--text3)',
}

export default async function TeamPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, initials: true, company: true, specialty: true, active: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Team</h1>
        <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>{users.filter(u => u.active).length} active users</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {users.map(u => {
          const rc = ROLE_COLORS[u.role] ?? 'var(--text3)'
          return (
            <div key={u.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, opacity: u.active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: rc, color: '#080c1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  {u.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)' }}>{u.specialty || u.company}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${rc}18`, color: rc, border: `1px solid ${rc}33`, textTransform: 'capitalize' }}>
                  {u.role}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text4)' }}>{u.email}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
