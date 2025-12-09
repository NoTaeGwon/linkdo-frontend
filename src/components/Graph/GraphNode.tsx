/**
 * ================================================================
 * 파일명       : GraphNode.tsx
 * 목적         : 그래프 내 개별 노드(태스크) 렌더링 컴포넌트
 * 설명         : 
 *   - SVG circle로 노드 시각화 (우선순위에 따른 크기)
 *   - 드래그 앤 드롭으로 노드 위치 이동
 *   - 선택/강조/블러 상태에 따른 스타일 변화
 *   - 연결 모드 시 시각적 피드백 제공
 *   - 화면 경계에서 자동 팬 기능
 * ================================================================
 */

import { useCallback, useRef, useEffect } from 'react';
import type { TaskNode } from '../../types';
import { PRIORITY_RADIUS } from '../../types';
import { CATEGORY_COLORS, STATUS_STYLES } from '../../data/sampleData';

interface GraphNodeProps {
  node: TaskNode;
  isSelected: boolean;
  isHighlighted: boolean;
  isBlurred: boolean;
  isLinkingSource?: boolean;  // 연결 모드에서 시작 노드
  isLinkingTarget?: boolean;  // 연결 모드에서 대상 후보
  zoom: number;
  pan: { x: number; y: number };
  containerSize: { width: number; height: number };
  onSelect: (nodeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDrag: (nodeId: string, x: number, y: number) => void;
  onDragEnd: (nodeId: string) => void;
  onAutoPan?: (dx: number, dy: number) => void;
}

export function GraphNode({
  node,
  isSelected,
  isHighlighted,
  isBlurred,
  isLinkingSource = false,
  isLinkingTarget = false,
  zoom,
  pan,
  containerSize,
  onSelect,
  onDragStart,
  onDrag,
  onDragEnd,
  onAutoPan,
}: GraphNodeProps) {
  const isDragging = useRef(false);
  const svgRef = useRef<SVGGElement>(null);
  
  // 최신 콜백 함수를 참조하기 위한 ref
  const onAutoPanRef = useRef(onAutoPan);
  const onDragRef = useRef(onDrag);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  
  // 콜백이 변경될 때마다 ref 업데이트
  useEffect(() => {
    onAutoPanRef.current = onAutoPan;
    onDragRef.current = onDrag;
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [onAutoPan, onDrag, zoom, pan]);

  const radius = PRIORITY_RADIUS[node.priority];
  const fillColor = CATEGORY_COLORS[node.category || 'planning'] || '#6366f1';
  const statusStyle = STATUS_STYLES[node.status];

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 드래그 시작 여부를 추적 (마우스가 실제로 움직였을 때만 true)
      let hasMoved = false;
      const startX = e.clientX;
      const startY = e.clientY;
      const moveThreshold = 3; // 3px 이상 움직여야 드래그로 인식

      let autoPanInterval: number | null = null;

      // 자동 팬 시작/정지 함수
      const startAutoPan = (dx: number, dy: number) => {
        if (autoPanInterval) return; // 이미 실행 중이면 스킵
        
        autoPanInterval = window.setInterval(() => {
          if (!isDragging.current || !onAutoPanRef.current) {
            stopAutoPan();
            return;
          }
          onAutoPanRef.current(dx, dy);
        }, 16);
      };

      const stopAutoPan = () => {
        if (autoPanInterval) {
          clearInterval(autoPanInterval);
          autoPanInterval = null;
        }
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        // 이동 거리 계산
        const dx = Math.abs(moveEvent.clientX - startX);
        const dy = Math.abs(moveEvent.clientY - startY);
        
        // 아직 드래그가 시작되지 않았고, 이동 거리가 임계값 미만이면 무시
        if (!hasMoved && dx < moveThreshold && dy < moveThreshold) {
          return;
        }
        
        // 처음으로 드래그가 시작됨
        if (!hasMoved) {
          hasMoved = true;
          isDragging.current = true;
          onDragStart(node.id);
        }

        const svg = svgRef.current?.ownerSVGElement;
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        
        // SVG 내 상대 좌표 계산
        const relativeX = moveEvent.clientX - rect.left;
        const relativeY = moveEvent.clientY - rect.top;
        
        // 최신 zoom과 pan 값 사용 (ref에서 가져옴)
        const currentZoom = zoomRef.current;
        const currentPan = panRef.current;
        
        // zoom과 pan을 고려하여 실제 노드 좌표 계산
        const adjustedX = (relativeX - currentPan.x) / currentZoom;
        const adjustedY = (relativeY - currentPan.y) / currentZoom;
        
        onDragRef.current(node.id, adjustedX, adjustedY);

        // 화면 경계 감지 및 자동 팬 (containerSize가 유효할 때만)
        if (containerSize.width > 0 && containerSize.height > 0) {
          const edgeThreshold = 80; // 경계로부터 80px 이내
          const panSpeed = 8;
          
          let dx = 0;
          let dy = 0;
          
          // 왼쪽/오른쪽 경계 체크
          if (relativeX < edgeThreshold) {
            dx = panSpeed; // 왼쪽 경계 → 오른쪽으로 팬
          } else if (relativeX > containerSize.width - edgeThreshold) {
            dx = -panSpeed; // 오른쪽 경계 → 왼쪽으로 팬
          }
          
          // 위쪽/아래쪽 경계 체크
          if (relativeY < edgeThreshold) {
            dy = panSpeed; // 위쪽 경계 → 아래로 팬
          } else if (relativeY > containerSize.height - edgeThreshold) {
            dy = -panSpeed; // 아래쪽 경계 → 위로 팬
          }
          
          // 경계에 있으면 자동 팬 시작, 아니면 정지
          if (dx !== 0 || dy !== 0) {
            stopAutoPan(); // 방향이 바뀌었을 수 있으므로 먼저 정지
            startAutoPan(dx, dy);
          } else {
            stopAutoPan();
          }
        } else {
          stopAutoPan();
        }
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        
        // 실제로 드래그가 시작되었을 때만 종료 처리
        if (hasMoved) {
          onDragEnd(node.id);
        }
        
        // 자동 팬 정리
        stopAutoPan();
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [node.id, containerSize, onDragStart, onDragEnd]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // 드래그 중이 아닐 때만 선택
      if (!isDragging.current) {
        e.stopPropagation();
        onSelect(node.id);
      }
    },
    [node.id, onSelect]
  );

  const x = node.x ?? 0;
  const y = node.y ?? 0;

  return (
    <g
      ref={svgRef}
      transform={`translate(${x}, ${y})`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      style={{
        cursor: isLinkingTarget ? 'crosshair' : 'pointer',
        opacity: isBlurred ? 0.15 : 1,
        filter: isBlurred ? 'blur(2px)' : 'none',
        transition: 'opacity 0.3s ease, filter 0.3s ease',
      }}
    >
      {/* 연결 모드: 시작 노드 표시 (펄스 애니메이션) */}
      {isLinkingSource && (
        <circle
          r={radius + 12}
          fill="none"
          stroke="#6366f1"
          strokeWidth={3}
          opacity={0.8}
          style={{
            animation: 'pulse-ring 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* 연결 모드: 대상 노드 후보 표시 (점선 테두리) */}
      {isLinkingTarget && (
        <circle
          r={radius + 6}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="6,4"
          opacity={0.9}
        />
      )}

      {/* 선택/강조 시 외부 글로우 */}
      {(isSelected || isHighlighted) && !isLinkingSource && !isLinkingTarget && (
        <circle
          r={radius + 8}
          fill="none"
          stroke={isSelected ? '#fff' : fillColor}
          strokeWidth={isSelected ? 3 : 2}
          opacity={0.6}
          className="glow-ring"
        />
      )}

      {/* 메인 원 */}
      <circle
        r={radius}
        fill={fillColor}
        stroke={statusStyle.stroke}
        strokeWidth={3}
        strokeDasharray={statusStyle.strokeDasharray}
        style={{
          filter: isSelected
            ? 'drop-shadow(0 0 12px rgba(255,255,255,0.5))'
            : isHighlighted
            ? `drop-shadow(0 0 8px ${fillColor})`
            : 'none',
        }}
      />

      {/* 우선순위 표시 (critical일 때) */}
      {node.priority === 'critical' && (
        <text
          y={-radius - 12}
          textAnchor="middle"
          fill="#ef4444"
          fontSize="18"
          fontWeight="bold"
        >
          ⚠
        </text>
      )}

      {/* 제목 */}
      <text
        y={5}
        textAnchor="middle"
        fill="#fff"
        fontSize={radius > 35 ? 12 : 10}
        fontWeight="600"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {node.title.length > 10
          ? node.title.substring(0, 9) + '…'
          : node.title}
      </text>

      {/* 상태 배지 */}
      <g transform={`translate(${radius - 8}, ${-radius + 8})`}>
        <circle
          r={8}
          fill={
            node.status === 'done'
              ? '#22c55e'
              : node.status === 'in-progress'
              ? '#f59e0b'
              : '#64748b'
          }
          stroke="#1e293b"
          strokeWidth={2}
        />
        <text
          textAnchor="middle"
          y={4}
          fill="#fff"
          fontSize="10"
          style={{ pointerEvents: 'none' }}
        >
          {node.status === 'done' ? '✓' : node.status === 'in-progress' ? '●' : '○'}
        </text>
      </g>
    </g>
  );
}

