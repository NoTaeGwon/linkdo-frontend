/**
 * ================================================================
 * 파일명       : Legend.tsx
 * 목적         : 그래프 범례 컴포넌트
 * 설명         : 
 *   - 우선순위별 노드 크기 표시
 *   - 상태별 아이콘 표시
 * ================================================================
 */

export function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>
        우선순위 (원 크기)
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
        {[
          { label: 'Low', size: 12 },
          { label: 'Medium', size: 18 },
          { label: 'High', size: 24 },
          { label: 'Critical', size: 32 },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: item.size,
                height: item.size,
                borderRadius: '50%',
                background: '#6366f1',
              }}
            />
            <span style={{ color: '#64748b', fontSize: '10px' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
        상태
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        {[
          { label: '완료', color: '#22c55e', icon: '✓' },
          { label: '진행중', color: '#f59e0b', icon: '●' },
          { label: '대기', color: '#64748b', icon: '○' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: item.color, fontSize: '14px' }}>{item.icon}</span>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

