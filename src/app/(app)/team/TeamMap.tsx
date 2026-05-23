'use client'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback } from 'react'

type TechLoc = {
  id: string
  name: string
  initials: string
  role: string
  lat: number
  lng: number
  locatedAt: string
}

type EquipmentPin = {
  id: string
  name: string
  client: string
  icon: string
  lat: number
  lng: number
  locatedAt: string | null
}

function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function dotColor(iso: string): string {
  const min = (Date.now() - new Date(iso).getTime()) / 60_000
  if (min < 15) return '#22c55e'
  if (min < 60) return '#f59e0b'
  return '#64748b'
}

function markerHtml(initials: string, color: string): string {
  return `<div style="width:34px;height:34px;border-radius:50%;background:${color};color:#080c1a;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;border:2px solid rgba(0,0,0,.5);box-shadow:0 2px 10px rgba(0,0,0,.6)">${initials}</div>`
}

function popupHtml(tech: TechLoc): string {
  const color = dotColor(tech.locatedAt)
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:2px 0;min-width:130px">
    <div style="font-size:13px;font-weight:800;color:#f8fafc;margin-bottom:5px">${tech.name}</div>
    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${tech.role}</div>
    <div style="display:flex;align-items:center;gap:5px">
      <span style="width:7px;height:7px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
      <span style="font-size:11px;color:#94a3b8">Last seen ${timeAgo(tech.locatedAt)}</span>
    </div>
  </div>`
}

export default function TeamMap() {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<{ map: any; L: any } | null>(null)
  const markersRef    = useRef<Record<string, any>>({})
  const eqMarkersRef  = useRef<Record<string, any>>({})
  const initialFitRef = useRef(false)
  const [locs, setLocs]         = useState<TechLoc[]>([])
  const [equipment, setEquipment] = useState<EquipmentPin[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [lastPoll, setLastPoll] = useState<number | null>(null)
  const [tick, setTick]         = useState(0)

  // Initialize Leaflet once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, { zoomControl: true }).setView([39.5, -98.35], 4)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright" style="color:#64748b">OpenStreetMap</a> © <a href="https://carto.com/attributions" style="color:#64748b">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      // Correct any sizing mismatch if the container wasn't fully laid out at init time
      setTimeout(() => { if (!cancelled) map.invalidateSize() }, 100)

      mapRef.current = { map, L }
      setMapReady(true)
    })

    return () => {
      cancelled = true
      mapRef.current?.map.remove()
      mapRef.current = null
      eqMarkersRef.current = {}
    }
  }, [])

  // Sync markers whenever locations, mapReady, or tick changes.
  // tick is included so open popups get fresh "X ago" text every 30s.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const { map, L } = mapRef.current
    const remaining = new Set(Object.keys(markersRef.current))

    for (const tech of locs) {
      const color = dotColor(tech.locatedAt)
      const icon  = L.divIcon({
        html: markerHtml(tech.initials, color),
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -20],
      })

      if (markersRef.current[tech.id]) {
        markersRef.current[tech.id].setLatLng([tech.lat, tech.lng])
        markersRef.current[tech.id].setIcon(icon)
        markersRef.current[tech.id].getPopup()?.setContent(popupHtml(tech))
      } else {
        const marker = L.marker([tech.lat, tech.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml(tech), { closeButton: false, className: 'wf-map-popup' })
        markersRef.current[tech.id] = marker
      }
      remaining.delete(tech.id)
    }

    for (const id of remaining) {
      markersRef.current[id].remove()
      delete markersRef.current[id]
    }

    if (locs.length > 0 && !initialFitRef.current) {
      const markerList = Object.values(markersRef.current)
      if (markerList.length === 1) {
        // fitBounds on a single point zooms to max level — use setView instead
        map.setView(markerList[0].getLatLng(), 12)
      } else {
        const group = L.featureGroup(markerList)
        map.fitBounds(group.getBounds().pad(0.4))
      }
      initialFitRef.current = true
    }
  }, [locs, mapReady, tick])

  // Sync equipment markers whenever equipment or mapReady changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const { map, L } = mapRef.current
    const remaining = new Set(Object.keys(eqMarkersRef.current))

    for (const eq of equipment) {
      const equipmentIcon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#f59e0b;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)">${eq.icon || '⚙'}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -18],
      })

      const popupContent = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:2px 0;min-width:140px">
        <div style="font-size:13px;font-weight:800;color:#f8fafc;margin-bottom:4px">${eq.icon || '⚙'} ${eq.name}</div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:2px">Client: ${eq.client}</div>
        ${eq.locatedAt ? `<div style="font-size:10px;color:#64748b;margin-top:4px">Located ${new Date(eq.locatedAt).toLocaleString()}</div>` : ''}
      </div>`

      if (eqMarkersRef.current[eq.id]) {
        eqMarkersRef.current[eq.id].setLatLng([eq.lat, eq.lng])
        eqMarkersRef.current[eq.id].getPopup()?.setContent(popupContent)
      } else {
        const marker = L.marker([eq.lat, eq.lng], { icon: equipmentIcon })
          .addTo(map)
          .bindPopup(popupContent, { closeButton: false, className: 'wf-map-popup' })
        eqMarkersRef.current[eq.id] = marker
      }
      remaining.delete(eq.id)
    }

    for (const id of remaining) {
      eqMarkersRef.current[id].remove()
      delete eqMarkersRef.current[id]
    }
  }, [equipment, mapReady])

  // Poll every 30s — always call setLoading(false) via finally so the
  // loading overlay never gets stuck on API errors or non-200 responses
  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/users/locations')
      if (res.ok) {
        const data = await res.json()
        const users: TechLoc[] = Array.isArray(data) ? data : (data.users ?? [])
        const eqs: EquipmentPin[] = Array.isArray(data) ? [] : (data.equipment ?? [])
        setLocs(users)
        setEquipment(eqs)
        setLastPoll(Date.now())
        setError(false)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [poll])

  // Tick every 30s so roster timestamps and open popup "X ago" text stay fresh
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const onDutyCount = locs.filter(l => (Date.now() - new Date(l.locatedAt).getTime()) < 3_600_000).length

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Team Locations</h2>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>
            {loading
              ? 'Loading…'
              : error
                ? 'Could not load locations'
                : locs.length === 0 && equipment.length === 0
                  ? 'No techs sharing location right now'
                  : `${onDutyCount} of ${locs.length} tech${locs.length !== 1 ? 's' : ''} active${equipment.length > 0 ? ` · ${equipment.length} equipment pin${equipment.length !== 1 ? 's' : ''}` : ''}`}
            {lastPoll && !loading && !error && (
              <span style={{ marginLeft: 8, opacity: 0.6 }}>· updated {timeAgo(new Date(lastPoll).toISOString())}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text4)' }}>
          {[
            { color: '#22c55e', label: '< 15m' },
            { color: '#f59e0b', label: '< 1h' },
            { color: '#64748b', label: 'stale' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', height: 440 }}>
        <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,12,26,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>Loading map…</div>
          </div>
        )}

        {!loading && error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 500, pointerEvents: 'none' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Could not load locations</div>
            <div style={{ fontSize: 11, color: 'var(--text4)' }}>Will retry automatically</div>
          </div>
        )}

        {!loading && !error && locs.length === 0 && equipment.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 500, pointerEvents: 'none' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📍</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>No techs on duty</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center', maxWidth: 240 }}>
              Techs tap &quot;On Duty&quot; in Field View to share their location
            </div>
          </div>
        )}

        {locs.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12, zIndex: 500,
            background: 'rgba(8,12,26,.88)', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10, padding: '8px 12px', backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 180, overflowY: 'auto',
          }}>
            {locs.map(tech => {
              const color = dotColor(tech.locatedAt)
              return (
                <div key={tech.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, color: '#080c1a', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {tech.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>{tech.name}</div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>{timeAgo(tech.locatedAt)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        .wf-map-popup .leaflet-popup-content-wrapper {
          background: #1e293b;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,.6);
          padding: 0;
        }
        .wf-map-popup .leaflet-popup-tip-container { display: none; }
        .wf-map-popup .leaflet-popup-content { margin: 10px 14px; }
        .leaflet-container { background: #0d1117; font-family: inherit; }
        .leaflet-control-attribution { background: rgba(8,12,26,.7) !important; color: #475569 !important; }
        .leaflet-control-attribution a { color: #475569 !important; }
        .leaflet-control-zoom a { background: #1e293b !important; color: #94a3b8 !important; border-color: rgba(255,255,255,.1) !important; }
        .leaflet-control-zoom a:hover { background: #334155 !important; color: #f8fafc !important; }
      `}</style>
    </div>
  )
}
