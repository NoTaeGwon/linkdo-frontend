/**
 * ================================================================
 * 파일명       : AutoArrangeModal.tsx
 * 목적         : PCA 기반 자동정렬 확인 모달
 * 설명         : 
 *   - 자동정렬 기능 안내
 *   - 실행 확인 UI 제공
 * ================================================================
 */

interface AutoArrangeModalProps {
  onClose: () => void;
  onArrange: () => void;
}

export function AutoArrangeModal({ onClose, onArrange }: AutoArrangeModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>📍 자동정렬</h2>
        <p className="modal-subtitle">
          PCA 기반으로 태스크를 자동 배치합니다
        </p>
        <p className="modal-description">
          의미적으로 유사한 태스크들이 가까운 위치에 배치됩니다
        </p>

        <div className="info-box">
          <div className="info-title">ℹ️ 안내</div>
          <ul className="info-list">
            <li>임베딩 기반 PCA 분석으로 좌표를 계산합니다</li>
            <li>엣지(연결선)는 태스크 생성 시 자동으로 연결됩니다</li>
            <li>기존 연결은 그대로 유지됩니다</li>
          </ul>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            취소
          </button>
          <button className="btn-primary btn-gradient" onClick={onArrange}>
            🔄 자동정렬 실행
          </button>
        </div>
      </div>
    </div>
  );
}

