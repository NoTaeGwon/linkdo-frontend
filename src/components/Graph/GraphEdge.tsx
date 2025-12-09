/**
 * ================================================================
 * 파일명       : GraphEdge.tsx
 * 목적         : 그래프 내 엣지(연결선) 렌더링 컴포넌트
 * 설명         : 
 *   - SVG line으로 노드 간 연결 시각화
 *   - 연관도(weight)에 따른 투명도 조절
 *   - 선택된 노드와 연결된 엣지 강조 표시
 *   - 그라데이션 효과로 방향성 표현
 * ================================================================
 */

import type { TaskNode, TaskEdge } from '../../types';
import { getOpacityByWeight } from '../../types';
import { CATEGORY_COLORS } from '../../data/sampleData';

interface GraphEdgeProps {
  edge: TaskEdge;
  isHighlighted: boolean;
  isBlurred: boolean;
}

export function GraphEdge({ edge, isHighlighted, isBlurred }: GraphEdgeProps) {
  const source = edge.source as TaskNode;
  const target = edge.target as TaskNode;

  if (!source.x || !source.y || !target.x || !target.y) {
    return null;
  }

  const opacity = isBlurred ? 0.05 : getOpacityByWeight(edge.weight);
  
  // 연관도에 따른 선 굵기
  const strokeWidth = 1 + edge.weight * 3;

  // 소스 노드의 카테고리 색상 사용
  const strokeColor =
    CATEGORY_COLORS[source.category || 'planning'] || '#6366f1';

  // 그라데이션 ID
  const gradientId = `edge-gradient-${source.id}-${target.id}`;

  return (
    <g
      style={{
        opacity: isBlurred ? 0.1 : 1,
        filter: isBlurred ? 'blur(1px)' : 'none',
        transition: 'opacity 0.3s ease, filter 0.3s ease',
      }}
    >
      {/* 그라데이션 정의 */}
      <defs>
        <linearGradient
          id={gradientId}
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor={CATEGORY_COLORS[source.category || 'planning']}
            stopOpacity={opacity}
          />
          <stop
            offset="100%"
            stopColor={CATEGORY_COLORS[target.category || 'planning']}
            stopOpacity={opacity * 0.6}
          />
        </linearGradient>
      </defs>

      {/* 메인 선 */}
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={isHighlighted ? '#fff' : `url(#${gradientId})`}
        strokeWidth={isHighlighted ? strokeWidth + 1 : strokeWidth}
        strokeLinecap="round"
        style={{
          filter: isHighlighted
            ? 'drop-shadow(0 0 4px rgba(255,255,255,0.5))'
            : 'none',
        }}
      />

      {/* 화살표 (방향 표시) */}
      <ArrowHead
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        color={isHighlighted ? '#fff' : strokeColor}
        opacity={isHighlighted ? 1 : opacity}
        targetRadius={35}
      />
    </g>
  );
}

// 화살표 머리 컴포넌트
function ArrowHead({
  x1,
  y1,
  x2,
  y2,
  color,
  opacity,
  targetRadius,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  opacity: number;
  targetRadius: number;
}) {
  // 방향 벡터 계산
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return null;

  // 정규화된 방향 벡터
  const nx = dx / length;
  const ny = dy / length;

  // 화살표 위치 (타겟 원 가장자리에서 약간 떨어진 곳)
  const arrowX = x2 - nx * (targetRadius + 5);
  const arrowY = y2 - ny * (targetRadius + 5);

  // 화살표 크기
  const arrowSize = 8;

  // 화살표 포인트 계산
  const angle = Math.atan2(dy, dx);
  const arrowAngle = Math.PI / 6; // 30도

  const point1X = arrowX - arrowSize * Math.cos(angle - arrowAngle);
  const point1Y = arrowY - arrowSize * Math.sin(angle - arrowAngle);
  const point2X = arrowX - arrowSize * Math.cos(angle + arrowAngle);
  const point2Y = arrowY - arrowSize * Math.sin(angle + arrowAngle);

  return (
    <polygon
      points={`${arrowX},${arrowY} ${point1X},${point1Y} ${point2X},${point2Y}`}
      fill={color}
      opacity={opacity}
    />
  );
}

