'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

type MonthData = { month: string; revenue: number }
type StatusData = { status: string; count: number; color: string }

function DollarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>
        ${payload[0].value.toLocaleString()}
      </div>
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--text4)', textTransform: 'capitalize', marginBottom: 2 }}>
        {payload[0].name.replace('_', ' ')}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: payload[0].payload.color }}>
        {payload[0].value} job{payload[0].value !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

export function RevenueBarChart({ data }: { data: MonthData[] }) {
  if (data.every(d => d.revenue === 0)) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text4)', fontSize: 12 }}>
        No revenue data yet
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text4)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text4)' }} axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
        <Tooltip content={<DollarTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
        <Bar dataKey="revenue" fill="#f59e0b" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function JobsDonutChart({ data }: { data: StatusData[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text4)', fontSize: 12 }}>
        No jobs yet
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(d => (
          <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>
              {d.status.replace('_', ' ')}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', marginLeft: 'auto' }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
