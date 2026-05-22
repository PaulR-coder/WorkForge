'use client'

import { useState, useRef, useCallback, useId } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type DocType = 'job' | 'estimate' | 'invoice'
type Confidence = 'high' | 'medium' | 'low'
type FileStatus = 'analyzing' | 'extracted' | 'creating' | 'created' | 'error'

type LineItem = { id: string; description: string; hours?: number | null; qty?: number | null; unitPrice: number; total: number }

type JobData    = { client: string; phone: string; address: string; jobType: string; description: string; priority: string; notes: string }
type EstData    = { client: string; clientEmail: string; jobType: string; description: string; lineItems: LineItem[]; notes: string }
type InvData    = { client: string; clientEmail: string; labor: number; parts: number; surcharge: number; notes: string }
type AnyData    = JobData | EstData | InvData

type ImportFile = {
  id: string
  name: string
  size: number
  status: FileStatus
  confidence?: Confidence
  editType: DocType
  editData: AnyData
  createdRecord?: { id: string; type: string; url: string; label: string }
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultData(type: DocType, base: Record<string, unknown> = {}): AnyData {
  const client = String(base.client ?? '')
  const description = String(base.description ?? '')
  const notes = String(base.notes ?? '')
  if (type === 'job') return {
    client, phone: String(base.phone ?? ''), address: String(base.address ?? ''),
    jobType: String(base.jobType ?? ''), description,
    priority: String(base.priority ?? 'normal'), notes,
  }
  if (type === 'estimate') return {
    client, clientEmail: String(base.clientEmail ?? ''), jobType: String(base.jobType ?? ''),
    description, lineItems: Array.isArray(base.lineItems) ? base.lineItems as LineItem[] : [], notes,
  }
  return {
    client, clientEmail: String(base.clientEmail ?? ''),
    labor: Number(base.labor) || 0, parts: Number(base.parts) || 0,
    surcharge: Number(base.surcharge) || 0, notes,
  }
}

function fmt(n: number) { return `$${n.toFixed(2)}` }

function confidenceBadge(c: Confidence) {
  if (c === 'high')   return { bg: '#dcfce7', color: '#15803d', label: '✓ High confidence' }
  if (c === 'medium') return { bg: '#fef9c3', color: '#a16207', label: '~ Medium confidence' }
  return                     { bg: '#fee2e2', color: '#b91c1c', label: '! Low confidence' }
}

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '7px 10px',
  border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b',
  background: '#fff', outline: 'none',
}

const numStyle: React.CSSProperties = {
  ...inputStyle, width: 100,
}

// ── Job form ──────────────────────────────────────────────────────────────────

function JobForm({ data, onChange }: { data: JobData; onChange: (d: JobData) => void }) {
  const set = (k: keyof JobData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...data, [k]: e.target.value })
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FieldRow label="Client">
          <input style={inputStyle} value={data.client} onChange={set('client')} placeholder="Client name" />
        </FieldRow>
        <FieldRow label="Phone">
          <input style={inputStyle} value={data.phone} onChange={set('phone')} placeholder="Phone number" />
        </FieldRow>
      </div>
      <FieldRow label="Address">
        <input style={inputStyle} value={data.address} onChange={set('address')} placeholder="Service address" />
      </FieldRow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FieldRow label="Job Type">
          <input style={inputStyle} value={data.jobType} onChange={set('jobType')} placeholder="e.g. AC Repair" />
        </FieldRow>
        <FieldRow label="Priority">
          <select style={inputStyle} value={data.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </FieldRow>
      </div>
      <FieldRow label="Description">
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={data.description} onChange={set('description')} placeholder="Work to be done..." />
      </FieldRow>
      <FieldRow label="Notes">
        <input style={inputStyle} value={data.notes} onChange={set('notes')} placeholder="Special instructions..." />
      </FieldRow>
    </>
  )
}

// ── Estimate form ─────────────────────────────────────────────────────────────

function EstimateForm({ data, onChange }: { data: EstData; onChange: (d: EstData) => void }) {
  const set = (k: keyof EstData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...data, [k]: e.target.value })

  const subtotal = data.lineItems.reduce((s, i) => s + (i.total || 0), 0)

  function setLine(i: number, field: 'description' | 'total', val: string) {
    const items = data.lineItems.map((item, idx) =>
      idx === i ? { ...item, [field]: field === 'total' ? parseFloat(val) || 0 : val } : item
    )
    onChange({ ...data, lineItems: items })
  }

  function addLine() {
    onChange({ ...data, lineItems: [...data.lineItems, { id: `li${Date.now()}`, description: '', unitPrice: 0, total: 0 }] })
  }

  function removeLine(i: number) {
    onChange({ ...data, lineItems: data.lineItems.filter((_, idx) => idx !== i) })
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FieldRow label="Client">
          <input style={inputStyle} value={data.client} onChange={set('client')} placeholder="Client name" />
        </FieldRow>
        <FieldRow label="Client Email">
          <input style={inputStyle} type="email" value={data.clientEmail} onChange={set('clientEmail')} placeholder="client@email.com" />
        </FieldRow>
      </div>
      <FieldRow label="Job Type">
        <input style={inputStyle} value={data.jobType} onChange={set('jobType')} placeholder="e.g. HVAC Install" />
      </FieldRow>
      <FieldRow label="Description">
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={data.description} onChange={set('description')} placeholder="Scope of work..." />
      </FieldRow>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Line Items</div>
        {data.lineItems.map((item, i) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 28px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input
              style={inputStyle}
              value={item.description}
              onChange={e => setLine(i, 'description', e.target.value)}
              placeholder="Item description"
            />
            <input
              style={{ ...numStyle, width: '100%' }}
              type="number"
              min="0"
              step="0.01"
              value={item.total}
              onChange={e => setLine(i, 'total', e.target.value)}
            />
            <button
              onClick={() => removeLine(i)}
              style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '4px 6px' }}
            >×</button>
          </div>
        ))}
        <button
          onClick={addLine}
          style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: '1px dashed #93c5fd', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', marginTop: 2 }}
        >+ Add line item</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Subtotal</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>{fmt(subtotal)}</span>
      </div>

      <FieldRow label="Notes">
        <input style={inputStyle} value={data.notes} onChange={set('notes')} placeholder="Payment terms or notes..." />
      </FieldRow>
    </>
  )
}

// ── Invoice form ──────────────────────────────────────────────────────────────

function InvoiceForm({ data, onChange }: { data: InvData; onChange: (d: InvData) => void }) {
  const set = (k: keyof InvData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [k]: k === 'labor' || k === 'parts' || k === 'surcharge' ? parseFloat(e.target.value) || 0 : e.target.value })

  const total = data.labor + data.parts + data.surcharge

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FieldRow label="Client">
          <input style={inputStyle} value={data.client} onChange={set('client')} placeholder="Client name" />
        </FieldRow>
        <FieldRow label="Client Email">
          <input style={inputStyle} type="email" value={data.clientEmail} onChange={set('clientEmail')} placeholder="client@email.com" />
        </FieldRow>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FieldRow label="Labor ($)">
          <input style={inputStyle} type="number" min="0" step="0.01" value={data.labor} onChange={set('labor')} />
        </FieldRow>
        <FieldRow label="Parts ($)">
          <input style={inputStyle} type="number" min="0" step="0.01" value={data.parts} onChange={set('parts')} />
        </FieldRow>
        <FieldRow label="Surcharge ($)">
          <input style={inputStyle} type="number" min="0" step="0.01" value={data.surcharge} onChange={set('surcharge')} />
        </FieldRow>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Total</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>{fmt(total)}</span>
      </div>
      <FieldRow label="Notes">
        <input style={inputStyle} value={data.notes} onChange={set('notes')} placeholder="Payment terms..." />
      </FieldRow>
    </>
  )
}

// ── File card ─────────────────────────────────────────────────────────────────

function FileCard({
  item,
  onUpdate,
  onDiscard,
  onConfirm,
}: {
  item: ImportFile
  onUpdate: (id: string, patch: Partial<ImportFile>) => void
  onDiscard: (id: string) => void
  onConfirm: (id: string) => void
}) {
  const badge = item.confidence ? confidenceBadge(item.confidence) : null

  function setType(t: DocType) {
    onUpdate(item.id, {
      editType: t,
      editData: defaultData(t, item.editData as Record<string, unknown>),
    })
  }

  function setData(d: AnyData) {
    onUpdate(item.id, { editData: d })
  }

  const typeLabel: Record<DocType, string> = { job: '🔧 Work Order', estimate: '📝 Estimate', invoice: '💰 Invoice' }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      {/* Card header */}
      <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>
          {item.name.endsWith('.pdf') ? '📄' : item.name.endsWith('.csv') ? '📊' : '🖼️'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{sizeLabel(item.size)}</div>
        </div>

        {/* Status indicators */}
        {item.status === 'analyzing' && (
          <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Analyzing…
          </div>
        )}
        {item.status === 'creating' && (
          <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>Creating…</div>
        )}
        {item.status === 'created' && (
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✓ Created</div>
        )}
        {item.status === 'error' && (
          <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>⚠ Error</div>
        )}
        {badge && item.status === 'extracted' && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color }}>{badge.label}</span>
        )}

        {item.status !== 'created' && (
          <button
            onClick={() => onDiscard(item.id)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
            title="Discard"
          >×</button>
        )}
      </div>

      {/* Analyzing spinner */}
      {item.status === 'analyzing' && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Reading document with AI…
        </div>
      )}

      {/* Error state */}
      {item.status === 'error' && (
        <div style={{ padding: '16px 20px', background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
          {item.error || 'Something went wrong. Try a different file or format.'}
        </div>
      )}

      {/* Created state */}
      {item.status === 'created' && item.createdRecord && (
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: '#15803d' }}>
            <strong>{item.createdRecord.label}</strong> has been added to WorkForge.
          </div>
          <Link
            href={item.createdRecord.url}
            style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textDecoration: 'none', background: '#eff6ff', padding: '6px 12px', borderRadius: 8, border: '1px solid #bfdbfe' }}
          >
            View →
          </Link>
        </div>
      )}

      {/* Extracted: editable form */}
      {(item.status === 'extracted' || item.status === 'creating') && (
        <div style={{ padding: '16px 20px' }}>
          {/* Type selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>CREATE AS:</span>
            {(['job', 'estimate', 'invoice'] as DocType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1px solid',
                  cursor: 'pointer', transition: 'all 120ms',
                  background: item.editType === t ? '#1e293b' : '#f1f5f9',
                  color: item.editType === t ? '#fff' : '#475569',
                  borderColor: item.editType === t ? '#1e293b' : '#e2e8f0',
                }}
              >
                {typeLabel[t]}
              </button>
            ))}
          </div>

          {/* Form fields */}
          {item.editType === 'job' && (
            <JobForm data={item.editData as JobData} onChange={setData} />
          )}
          {item.editType === 'estimate' && (
            <EstimateForm data={item.editData as EstData} onChange={setData} />
          )}
          {item.editType === 'invoice' && (
            <InvoiceForm data={item.editData as InvData} onChange={setData} />
          )}

          <button
            onClick={() => onConfirm(item.id)}
            disabled={item.status === 'creating'}
            style={{
              width: '100%', padding: '12px 0', marginTop: 4,
              background: item.status === 'creating' ? '#94a3b8' : '#16a34a',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 800, cursor: item.status === 'creating' ? 'wait' : 'pointer',
            }}
          >
            {item.status === 'creating' ? 'Creating…' : `✓ Create ${typeLabel[item.editType]}`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({ onFiles, dragging, onDragOver, onDragLeave, onDrop, inputRef, inputId }: {
  onFiles: (files: FileList) => void
  dragging: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  inputId: string
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? '#f59e0b' : '#cbd5e1'}`,
        borderRadius: 16,
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? '#fffbeb' : '#f8fafc',
        transition: 'all 150ms',
        marginBottom: 24,
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>{dragging ? '📂' : '📥'}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
        {dragging ? 'Drop to import' : 'Drop files here or click to browse'}
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>
        Accepts PDF, images (JPG · PNG · WEBP), or CSV — up to 6 MB each
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.csv,.txt"
        style={{ display: 'none' }}
        onChange={e => e.target.files && onFiles(e.target.files)}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportClient() {
  const [files, setFiles] = useState<ImportFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileMap = useRef<Map<string, File>>(new Map())
  const inputId = useId()

  const updateFile = useCallback((id: string, patch: Partial<ImportFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }, [])

  const analyzeFile = useCallback(async (id: string) => {
    const file = fileMap.current.get(id)
    if (!file) return

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/import/analyze', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) {
        updateFile(id, { status: 'error', error: json.error || 'Analysis failed' })
        return
      }
      const docType: DocType = json.documentType ?? 'job'
      updateFile(id, {
        status: 'extracted',
        confidence: json.confidence,
        editType: docType,
        editData: defaultData(docType, json.data ?? {}),
      })
    } catch {
      updateFile(id, { status: 'error', error: 'Network error — check your connection' })
    }
  }, [updateFile])

  const addFiles = useCallback((fileList: FileList) => {
    const newItems: ImportFile[] = []
    Array.from(fileList).forEach(file => {
      const id = crypto.randomUUID()
      fileMap.current.set(id, file)
      newItems.push({
        id, name: file.name, size: file.size,
        status: 'analyzing',
        editType: 'job',
        editData: defaultData('job'),
      })
    })
    setFiles(prev => [...prev, ...newItems])
    newItems.forEach(item => analyzeFile(item.id))
  }, [analyzeFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const confirmFile = useCallback(async (id: string) => {
    const item = files.find(f => f.id === id)
    if (!item || item.status !== 'extracted') return
    updateFile(id, { status: 'creating' })

    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: item.editType, data: item.editData }),
      })
      const json = await res.json()
      if (!res.ok) {
        updateFile(id, { status: 'extracted', error: json.error || 'Failed to create record' })
        return
      }
      updateFile(id, { status: 'created', createdRecord: json })
    } catch {
      updateFile(id, { status: 'extracted', error: 'Network error — try again' })
    }
  }, [files, updateFile])

  const discardFile = useCallback((id: string) => {
    fileMap.current.delete(id)
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const activeCount = files.filter(f => f.status !== 'created').length
  const createdCount = files.filter(f => f.status === 'created').length

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Import Documents</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Upload contracts, estimates, invoices, or work orders — AI reads them and creates the right records automatically.
        </p>
      </div>

      {/* Drop zone */}
      <DropZone
        onFiles={addFiles}
        dragging={dragging}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        inputRef={inputRef}
        inputId={inputId}
      />

      {/* Stats bar */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 12, color: '#64748b' }}>
          <span>{files.length} file{files.length !== 1 ? 's' : ''} uploaded</span>
          {createdCount > 0 && <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ {createdCount} created</span>}
          {activeCount > 0 && <span>{activeCount} pending</span>}
        </div>
      )}

      {/* File cards */}
      {files.map(item => (
        <FileCard
          key={item.id}
          item={item}
          onUpdate={updateFile}
          onDiscard={discardFile}
          onConfirm={confirmFile}
        />
      ))}

      {/* Empty state */}
      {files.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          What types of files work best:
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 10, lineHeight: 2 }}>
            <li>📄 <strong>PDF estimates or quotes</strong> — extracts line items, client, total</li>
            <li>🖼️ <strong>Photos of work orders</strong> — reads handwriting and printed forms</li>
            <li>💰 <strong>Old invoice PDFs</strong> — pulls amounts into labor/parts/surcharge</li>
            <li>📊 <strong>CSV client or job lists</strong> — imports the primary record</li>
          </ul>
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
