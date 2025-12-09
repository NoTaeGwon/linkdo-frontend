/**
 * ================================================================
 * 파일명       : MiniMap.tsx
 * 목적         : 전체 그래프 미니맵 컴포넌트
 * 설명         : 
 *   - 전체 노드를 작게 표시
 *   - 현재 뷰포트 영역을 사각형으로 표시
 *   - 미니맵 클릭으로 해당 위치로 이동
 * ================================================================
 */

import { useMemo } from 'react';
import type { TaskNode } from '../../types';
import { CATEGORY_COLORS } from '../../data/sampleData';

interface MiniMapProps {
  nodes: TaskNode[];
  zoom: number;
  pan: { x: number; y: number };
  containerSize: { width: number; height: number };
  onPanChange: (pan: { x: number; y: number }) => void;
}

export function MiniMap({ nodes, zoom, pan, containerSize, onPanChange }: MiniMapProps) {
  const miniMapSize = { width: 150, height: 100 };
  const padding = 20;

  // 전체 노드의 경계 계산
  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 500, minY: 0, maxY: 500 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    // 여유 공간 추가
    const paddingX = (maxX - minX) * 0.2 || 100;
    const paddingY = (maxY - minY) * 0.2 || 100;

    return {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
    };
  }, [nodes]);

  // 전체 맵 크기
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;

  // 미니맵 스케일 계산
  const scale = Math.min(
    (miniMapSize.width - padding * 2) / worldWidth,
    (miniMapSize.height - padding * 2) / worldHeight
  );

  // 월드 좌표 → 미니맵 좌표 변환
  const toMiniMapX = (x: number) => (x - bounds.minX) * scale + padding;
  const toMiniMapY = (y: number) => (y - bounds.minY) * scale + padding;

  // 현재 뷰포트 영역 계산
  const viewportRect = useMemo(() => {
    // 화면에 보이는 영역의 월드 좌표
    const viewMinX = -pan.x / zoom;
    const viewMinY = -pan.y / zoom;
    const viewWidth = containerSize.width / zoom;
    const viewHeight = containerSize.height / zoom;

    return {
      x: toMiniMapX(viewMinX),
      y: toMiniMapY(viewMinY),
      width: viewWidth * scale,
      height: viewHeight * scale,
    };
  }, [pan, zoom, containerSize, scale, bounds]);

  // 미니맵 클릭 시 해당 위치로 이동
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 미니맵 좌표 → 월드 좌표
    const worldX = (clickX - padding) / scale + bounds.minX;
    const worldY = (clickY - padding) / scale + bounds.minY;

    // 클릭한 위치가 화면 중앙에 오도록 pan 계산
    const newPanX = containerSize.width / 2 - worldX * zoom;
    const newPanY = containerSize.height / 2 - worldY * zoom;

    onPanChange({ x: newPanX, y: newPanY });
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '70px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        overflow: 'hidden',
      }}
    >
      <svg
        width={miniMapSize.width}
        height={miniMapSize.height}
        onClick={handleClick}
        style={{ cursor: 'pointer', display: 'block' }}
      >
        {/* 배경 */}
        <rect
          width={miniMapSize.width}
          height={miniMapSize.height}
          fill="rgba(15, 23, 42, 0.5)"
        />

        {/* 노드들 */}
        {nodes.map(node => {
          const x = node.x ?? 0;
          const y = node.y ?? 0;
          const color = CATEGORY_COLORS[node.category || 'planning'] || '#6366f1';
          
          return (
            <circle
              key={node.id}
              cx={toMiniMapX(x)}
              cy={toMiniMapY(y)}
              r={3}
              fill={color}
              opacity={0.8}
            />
          );
        })}

        {/* 현재 뷰포트 영역 */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={Math.max(viewportRect.width, 10)}
          height={Math.max(viewportRect.height, 10)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={1.5}
          opacity={0.8}
        />
      </svg>
    </div>
  );
}

