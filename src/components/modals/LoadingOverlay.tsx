/**
 * ================================================================
 * 파일명       : LoadingOverlay.tsx
 * 목적         : 전체 화면 로딩 오버레이
 * 설명         : 
 *   - 자동정렬 등 장시간 작업 시 표시
 *   - 진행률 표시 지원
 * ================================================================
 */

interface LoadingOverlayProps {
  current: number;
  total: number;
  taskTitle?: string;
}

export function LoadingOverlay({ current, total, taskTitle }: LoadingOverlayProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="loading-overlay">
      {/* 스피너 */}
      <div className="loading-spinner-large" />

      {/* 제목 */}
      <h2 className="loading-title">📍 자동정렬 진행 중...</h2>

      {/* 진행률 바 */}
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${percentage}%` }} />
      </div>

      {/* 진행률 텍스트 */}
      <p className="progress-text">
        {current} / {total} ({percentage}%)
      </p>

      {/* 현재 처리 중인 태스크 */}
      {taskTitle && (
        <p className="progress-task">"{taskTitle}" 분석 중...</p>
      )}
    </div>
  );
}

