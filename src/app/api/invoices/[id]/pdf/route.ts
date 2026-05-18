import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewFinancials')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { job: { include: { tech: { select: { name: true } } } } },
  })
  if (!inv) return Response.json({ error: 'Not found' }, { status: 404 })

  const owner = await prisma.user.findFirst({
    where: { tenantId: inv.tenantId, role: 'admin', active: true },
    select: { email: true, company: true },
  })

  const statusColors: Record<string, string> = {
    draft: '#94a3b8', sent: '#3b82f6', paid: '#22c55e', overdue: '#ef4444',
  }
  const statusColor = statusColors[inv.status] ?? '#94a3b8'

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Invoice ${inv.number}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #fff; color: #1a1a2e; font-size: 13px; }
  .page { max-width: 720px; margin: 0 auto; padding: 48px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #f0f0f0; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-mark { width: 40px; height: 40px; background: #f59e0b; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .brand-name { font-size: 20px; font-weight: 800; color: #f59e0b; }
  .brand-name span { color: #1a1a2e; }
  .brand-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .inv-meta { text-align: right; }
  .inv-number { font-size: 22px; font-weight: 800; color: #1a1a2e; }
  .inv-status { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; color: ${statusColor}; background: ${statusColor}18; border: 1px solid ${statusColor}44; margin-top: 4px; text-transform: capitalize; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; }
  .client-name { font-size: 16px; font-weight: 700; color: #1a1a2e; }
  .client-sub { font-size: 12px; color: #64748b; margin-top: 3px; }
  .divider { height: 1px; background: #f0f0f0; margin: 20px 0; }
  .line-items { width: 100%; border-collapse: collapse; }
  .line-items th { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; text-align: left; background: #f8fafc; border-radius: 6px; }
  .line-items th:last-child { text-align: right; }
  .line-items td { padding: 12px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .line-items td:last-child { text-align: right; font-weight: 600; }
  .total-row { font-size: 16px; font-weight: 800; }
  .total-row td { padding-top: 16px !important; border-bottom: none !important; }
  .total-row td:last-child { color: ${inv.status === 'paid' ? '#22c55e' : '#1a1a2e'}; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <div class="brand-mark">
        <svg viewBox="-44 -44 88 88" width="22" height="22">
          <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#080c1a"/>
        </svg>
      </div>
      <div>
        <div class="brand-name">Work<span>Forge</span></div>
        <div class="brand-sub">Field Operations Platform</div>
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-number">${inv.number}</div>
      <div><span class="inv-status">${inv.status}</span></div>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px">
        Issued: ${inv.createdAt.toLocaleDateString()}<br/>
        Due: ${inv.dueDate.toLocaleDateString()}
        ${inv.paidAt ? `<br/>Paid: ${inv.paidAt.toLocaleDateString()}` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill To</div>
    <div class="client-name">${inv.client}</div>
    ${inv.job ? `<div class="client-sub">${inv.job.type ?? ''} Service${inv.job.tech ? ` · Tech: ${inv.job.tech.name}` : ''}</div>` : ''}
  </div>

  <table class="line-items">
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Labor</td>
        <td>$${inv.labor.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Parts &amp; Materials</td>
        <td>$${inv.parts.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Service Surcharge</td>
        <td>$${inv.surcharge.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td><strong>Total Due</strong></td>
        <td><strong>$${inv.total.toFixed(2)}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>${owner?.company ?? 'WorkForge Field Operations'} · ${owner?.email ?? 'contact@getworkforge.com'}</div>
    <div>Generated ${new Date().toLocaleDateString()}</div>
  </div>
</div>

<div class="no-print" style="position:fixed;bottom:20px;right:20px;display:flex;gap:8px">
  <button onclick="window.print()" style="background:#f59e0b;color:#080c1a;border:none;border-radius:8px;font-size:13px;font-weight:700;padding:10px 18px;cursor:pointer">
    🖨 Print / Save PDF
  </button>
  <button onclick="window.close()" style="background:#1c2438;color:#94a3b8;border:1px solid #283350;border-radius:8px;font-size:13px;padding:10px 18px;cursor:pointer">
    Close
  </button>
</div>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
