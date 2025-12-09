/**
 * ================================================================
 * 파일명       : Graph.tsx
 * 목적         : 메인 그래프 시각화 컴포넌트
 * 설명         : 
 *   - d3-force 시뮬레이션을 사용한 노드 자동 배치
 *   - SVG 기반 노드/엣지 렌더링
 *   - 줌(휠) & 팬(드래그) 지원
 *   - 노드 선택 시 연결된 노드 강조, 나머지 블러 처리
 *   - 연결 모드(linkingMode)로 노드 간 엣지 추가
 * ================================================================
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { TaskNode, TaskEdge, GraphData } from '../../types';
import { useForceSimulation } from '../../hooks/useForceSimulation';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';
import { MiniMap } from './MiniMap';
import { Legend } from './Legend';
import { ZoomControls } from './ZoomControls';
import { 
  ANIMATION_DURATION, 
  CENTER_SKIP_DISTANCE, 
  MIN_ZOOM, 
  MAX_ZOOM, 
  ZOOM_STEP,
  ZOOM_BUTTON_STEP,
  GRID_SIZE,
} from '../../constants';

export interface ViewState {
  zoom: number;
  pan: { x: number; y: number };
}

interface GraphProps {
  data: GraphData;
  selectedNodeId?: string | null;
  onNodeSelect?: (node: TaskNode | null) => void;
  viewState?: ViewState;
  onViewStateChange?: (newState: ViewState) => void;
  linkingMode?: string | null; // 연결 모드: 시작 노드 ID
}

export function Graph({ 
  data, 
  selectedNodeId: externalSelectedId, 
  onNodeSelect,
  viewState: externalViewState,
  onViewStateChange,
  linkingMode,
}: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  
  // 내부 상태 (props가 없을 때 사용)
  const [internalViewState, setInternalViewState] = useState<ViewState>({ 
    zoom: 1, 
    pan: { x: 0, y: 0 } 
  });

  // 외부 props 우선 사용, 없으면 내부 상태 사용
  const zoom = externalViewState ? externalViewState.zoom : internalViewState.zoom;
  const pan = externalViewState ? externalViewState.pan : internalViewState.pan;

  // 상태 업데이트 헬퍼
  const updateViewState = useCallback((updates: Partial<ViewState>) => {
    const currentState = { zoom, pan };
    const nextState = { ...currentState, ...updates };
    
    if (onViewStateChange) {
      onViewStateChange(nextState);
    } else {
      setInternalViewState(nextState);
    }
  }, [zoom, pan, onViewStateChange]);

  // 기존 setZoom, setPan 인터페이스 유지를 위한 래퍼
  const setZoom = useCallback((value: number | ((prev: number) => number)) => {
    const newZoom = typeof value === 'function' ? value(zoom) : value;
    updateViewState({ zoom: newZoom });
  }, [zoom, updateViewState]);

  const setPan = useCallback((value: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
    const newPan = typeof value === 'function' ? value(pan) : value;
    updateViewState({ pan: newPan });
  }, [pan, updateViewState]);

  const [isPanning, setIsPanning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);  // 애니메이션 중인지
  const panStart = useRef({ x: 0, y: 0 });
  
  const selectedNodeId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  // 컨테이너 크기 감지
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // d3-force 시뮬레이션
  const {
    nodes,
    edges,
    handleDragStart,
    handleDrag,
    handleDragEnd,
  } = useForceSimulation({
    nodes: data.nodes,
    edges: data.edges,
    width: dimensions.width,
    height: dimensions.height,
  });

  // 선택된 노드와 연결된 노드들의 ID 집합
  const connectedNodeIds = useCallback((): Set<string> => {
    if (!selectedNodeId) return new Set();

    const connected = new Set<string>([selectedNodeId]);

    edges.forEach((edge) => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target.id;

      if (sourceId === selectedNodeId) {
        connected.add(targetId);
      }
      if (targetId === selectedNodeId) {
        connected.add(sourceId);
      }
    });

    return connected;
  }, [selectedNodeId, edges]);

  const connected = connectedNodeIds();

  // 선택된 노드를 화면 중앙으로 이동 (애니메이션)
  const centerOnNode = useCallback((node: TaskNode) => {
    if (!node.x || !node.y) return;
    
    // 화면 중앙 좌표
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    // 노드가 화면 중앙에 오도록 pan 값 계산
    const newPanX = centerX - node.x * zoom;
    const newPanY = centerY - node.y * zoom;

    // 현재 위치와 목표 위치의 차이가 작으면(이미 중앙이면) 이동하지 않음
    const dist = Math.sqrt(
      Math.pow(newPanX - pan.x, 2) + Math.pow(newPanY - pan.y, 2)
    );
    if (dist < CENTER_SKIP_DISTANCE) return;
    
    // 애니메이션 시작
    setIsAnimating(true);
    setPan({ x: newPanX, y: newPanY });
    
    // 애니메이션 종료 (transition 시간과 맞춤)
    setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
  }, [dimensions, zoom, pan]);

  // 노드 선택 핸들러
  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      const newSelectedId = selectedNodeId === nodeId ? null : nodeId;
      setInternalSelectedId(newSelectedId);

      const selectedNode = newSelectedId
        ? nodes.find((n) => n.id === newSelectedId) || null
        : null;

      // 선택된 노드를 화면 중앙으로 이동
      if (selectedNode) {
        centerOnNode(selectedNode);
      }

      if (onNodeSelect) {
        onNodeSelect(selectedNode);
      }
    },
    [selectedNodeId, nodes, onNodeSelect, centerOnNode]
  );

  // 마지막으로 중앙 이동에 성공한 노드 ID
  const lastCenteredIdRef = useRef<string | null>(null);
  // 이전 렌더링의 ID를 추적하여 "진짜 ID 변경"을 감지
  const prevExternalIdRef = useRef<string | null>(externalSelectedId);

  // 외부에서 selectedNodeId가 변경되면 해당 노드를 화면 중앙으로 이동
  useEffect(() => {
    // 1. ID가 실제로 변경되었는지 확인
    if (externalSelectedId !== prevExternalIdRef.current) {
      prevExternalIdRef.current = externalSelectedId;
      // ID가 바뀌었으면(새 노드 선택 등), 센터링 기록을 초기화하여 다시 이동할 준비
      lastCenteredIdRef.current = null;
    }

    // 선택된 노드가 없으면 리턴
    if (!externalSelectedId) return;
    
    // 2. 이미 현재 ID로 이동을 완료했다면 스킵 (nodes만 업데이트된 경우 이동 방지)
    if (lastCenteredIdRef.current === externalSelectedId) return;
    
    const node = nodes.find((n) => n.id === externalSelectedId);
    
    // 노드가 존재하고 좌표가 유효한 경우에만 이동 수행
    if (node && node.x && node.y) {
      centerOnNode(node);
      lastCenteredIdRef.current = externalSelectedId; // 이동 성공 기록
    }
  }, [externalSelectedId, nodes, centerOnNode]);

  // 배경 클릭 시 선택 해제
  const handleBackgroundClick = useCallback(() => {
    // 팬 중이었으면 선택 해제하지 않음
    if (isPanning) return;
    
    setInternalSelectedId(null);
    if (onNodeSelect) {
      onNodeSelect(null);
    }
  }, [onNodeSelect, isPanning]);

  // 엣지가 강조되어야 하는지 확인
  const isEdgeHighlighted = (edge: TaskEdge): boolean => {
    if (!selectedNodeId) return false;

    const sourceId =
      typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId =
      typeof edge.target === 'string' ? edge.target : edge.target.id;

    return sourceId === selectedNodeId || targetId === selectedNodeId;
  };

  // 마우스 휠 - 줌
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
  }, [setZoom]);

  // 팬 시작 (마우스 다운)
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // 노드가 아닌 배경에서만 팬 시작
    if ((e.target as HTMLElement).tagName === 'svg' || 
        (e.target as HTMLElement).tagName === 'rect') {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [pan]);

  // 팬 중 (마우스 이동)
  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    
    setPan({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    });
  }, [isPanning, setPan]);

  // 팬 종료 (마우스 업)
  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // 뷰 리셋 (애니메이션)
  const handleResetView = useCallback(() => {
    setIsAnimating(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
  }, [setZoom, setPan]);

  // 자동 팬 (드래그 시 화면 경계에서 자동 이동)
  const handleAutoPan = useCallback((dx: number, dy: number) => {
    setPan(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  }, [setPan]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 배경 그리드 패턴 */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          <pattern
            id="grid"
            width={GRID_SIZE * zoom}
            height={GRID_SIZE * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x}, ${pan.y})`}
          >
            <path
              d={`M ${GRID_SIZE * zoom} 0 L 0 0 0 ${GRID_SIZE * zoom}`}
              fill="none"
              stroke="rgba(148, 163, 184, 0.08)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* 메인 그래프 SVG */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleBackgroundClick}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        style={{ 
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
      >
        {/* 변환 그룹 - 줌 & 팬 적용 */}
        <g 
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{
            transition: isAnimating && !isPanning ? 'transform 0.4s ease-out' : 'none',
          }}
        >
          {/* 엣지 레이어 */}
          <g className="edges">
            {edges.map((edge, index) => {
              const sourceId =
                typeof edge.source === 'string' ? edge.source : edge.source.id;
              const targetId =
                typeof edge.target === 'string' ? edge.target : edge.target.id;
              const key = `${sourceId}-${targetId}-${index}`;

              const isHighlighted = isEdgeHighlighted(edge);
              const isBlurred =
                selectedNodeId !== null && !isHighlighted;

              return (
                <GraphEdge
                  key={key}
                  edge={edge}
                  isHighlighted={isHighlighted}
                  isBlurred={isBlurred}
                />
              );
            })}
          </g>

          {/* 노드 레이어 */}
          <g className="nodes">
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHighlighted = connected.has(node.id) && !isSelected;
              const isBlurred =
                selectedNodeId !== null && !connected.has(node.id);
              
              // 연결 모드 관련
              const isLinkingSource = linkingMode === node.id;
              const isLinkingTarget = linkingMode !== null && linkingMode !== node.id;

              return (
                <GraphNode
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  isHighlighted={isHighlighted}
                  isBlurred={isBlurred}
                  isLinkingSource={isLinkingSource}
                  isLinkingTarget={isLinkingTarget}
                  zoom={zoom}
                  pan={pan}
                  containerSize={dimensions}
                  onSelect={handleNodeSelect}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  onAutoPan={handleAutoPan}
                />
              );
            })}
          </g>
        </g>
      </svg>

      {/* 줌 컨트롤 */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={() => setZoom(prev => Math.min(prev + ZOOM_BUTTON_STEP, MAX_ZOOM))}
        onZoomOut={() => setZoom(prev => Math.max(prev - ZOOM_BUTTON_STEP, MIN_ZOOM))}
        onReset={handleResetView}
      />

      {/* 미니맵 */}
      <MiniMap
        nodes={nodes}
        zoom={zoom}
        pan={pan}
        containerSize={dimensions}
        onPanChange={setPan}
      />

      {/* 범례 */}
      <Legend />
    </div>
  );
}
