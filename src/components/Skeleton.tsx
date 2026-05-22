export function Skeleton({
  width,
  height = 14,
  radius = 6,
  style,
}: {
  width?: string | number
  height?: number
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <>
      <div style={{
        width: width ?? '100%',
        height,
        borderRadius: radius,
        background: 'var(--bg4)',
        animation: 'shimmer 1.8s ease infinite',
        flexShrink: 0,
        ...style,
      }} />
      <style>{`
        @keyframes shimmer {
          0%,100% { opacity: .4; }
          50%      { opacity: .7; }
        }
      `}</style>
    </>
  )
}

export function BoardSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(4, 82vw)' : 'repeat(4, 1fr)',
        gap: 10,
        flex: 1,
        overflowX: isMobile ? 'auto' : 'hidden',
      }}>
        {[3, 2, 2, 1].map((count, ci) => (
          <div key={ci} style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--bg4)',
                flexShrink: 0,
              }} />
              <Skeleton width={70} height={10} />
            </div>
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from({ length: count }).map((_, ji) => (
                <div key={ji} style={{
                  background: 'var(--bg3)',
                  borderRadius: 9,
                  padding: 10,
                  border: '1px solid var(--border)',
                }}>
                  <Skeleton width="65%" height={12} radius={4} style={{ marginBottom: 7 }} />
                  <Skeleton width="45%" height={9} radius={4} style={{ marginBottom: 10 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton width={48} height={20} radius={10} />
                    <Skeleton width={24} height={20} radius={4} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          0%,100% { opacity: .4; }
          50%      { opacity: .7; }
        }
      `}</style>
    </>
  )
}

export function DrawerSkeleton() {
  return (
    <>
      <div style={{ flex: 1, padding: '0 18px', overflowY: 'auto' }}>
        {/* Title area */}
        <div style={{ padding: '16px 0 14px', borderBottom: '1px solid var(--border)' }}>
          <Skeleton width="55%" height={18} radius={5} style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton width={72} height={22} radius={11} />
            <Skeleton width={88} height={22} radius={11} />
          </div>
        </div>
        {/* Detail rows */}
        {[120, 80, 60, 100].map((h, i) => (
          <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <Skeleton width={80} height={9} radius={4} style={{ marginBottom: 12 }} />
            <Skeleton height={h} radius={8} />
          </div>
        ))}
        {/* Action buttons row */}
        <div style={{ padding: '16px 0', display: 'flex', gap: 8 }}>
          <Skeleton width={100} height={34} radius={8} />
          <Skeleton width={100} height={34} radius={8} />
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0%,100% { opacity: .4; }
          50%      { opacity: .7; }
        }
      `}</style>
    </>
  )
}
