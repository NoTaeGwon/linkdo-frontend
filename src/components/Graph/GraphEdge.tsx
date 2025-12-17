/**
 * ================================================================
 * 파일명       : GraphEdge.tsx
 * 목적         : 그래프 내 엣지(연결선) 렌더링 컴포넌트
 * 설명         : 
 *   - SVG line으로 노드 간 연결 시각화
 *   - 연관도(weight)에 따른 투명도 조절
 *   - 선택된 노드와 연결된 엣지 강조 표시
 *   - 그라데이션 효과로 연결 표현
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
    </g>
  );
}

