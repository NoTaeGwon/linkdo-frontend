/**
 * ================================================================
 * 파일명       : ZoomControls.tsx
 * 목적         : 그래프 줌 컨트롤 컴포넌트
 * 설명         : 
 *   - 확대/축소 버튼
 *   - 현재 줌 레벨 표시
 *   - 뷰 리셋 버튼
 * ================================================================
 */

import { MIN_ZOOM, MAX_ZOOM, ZOOM_BUTTON_STEP } from '../../constants';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  const buttonStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <button
        onClick={onZoomIn}
        style={{ ...buttonStyle, fontSize: '18px' }}
        title="확대"
      >
        +
      </button>
      <div
        style={{
          ...buttonStyle,
          color: '#64748b',
          fontSize: '11px',
          cursor: 'default',
        }}
        title="현재 줌 레벨"
      >
        {Math.round(zoom * 100)}%
      </div>
      <button
        onClick={onZoomOut}
        style={{ ...buttonStyle, fontSize: '18px' }}
        title="축소"
      >
        −
      </button>
      <button
        onClick={onReset}
        style={{ ...buttonStyle, fontSize: '14px' }}
        title="뷰 리셋"
      >
        ⟲
      </button>
    </div>
  );
}

// 줌 관련 상수 re-export (편의용)
export { MIN_ZOOM, MAX_ZOOM, ZOOM_BUTTON_STEP };

