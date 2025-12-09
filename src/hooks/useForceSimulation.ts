/**
 * ================================================================
 * 파일명       : useForceSimulation.ts
 * 목적         : d3-force 물리 시뮬레이션 커스텀 훅
 * 설명         : 
 *   - 노드 자동 배치 (물리 기반 레이아웃)
 *   - forceLink: 연결된 노드 끌어당김
 *   - forceManyBody: 모든 노드 간 척력
 *   - forceCollide: 노드 겹침 방지
 *   - 드래그 시 노드 위치 고정(fx, fy) 처리
 * ================================================================
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
} from 'd3-force';
import type { TaskNode, TaskEdge } from '../types';
import { PRIORITY_RADIUS, getDistanceByWeight } from '../types';

interface UseForceSimulationProps {
  nodes: TaskNode[];  // 노드 목록
  edges: TaskEdge[];  // 연결선 목록
  width: number;      // 화면 너비
  height: number;     // 화면 높이
}

interface SimulationState {
  nodes: TaskNode[];  // 위치 계산된 노드
  edges: TaskEdge[];  // 연결된 엣지
}

export function useForceSimulation({
  nodes,
  edges,
  width,
  height,
}: UseForceSimulationProps) {
  const simulationRef = useRef<Simulation<TaskNode, TaskEdge> | null>(null);  // 시뮬레이션 객체 참조(useRef => 컴포넌트 렌더링 시 초기화되지 않음)
  const nodesRef = useRef<TaskNode[]>([]);  // 시뮬레이션 내부 노드 배열 참조
  const [state, setState] = useState<SimulationState>({ nodes: [], edges: [] });  // 상태 관리(useState => 컴포넌트 렌더링 시 초기화됨)

  // 시뮬레이션 초기화 및 업데이트
  useEffect(() => {
    if (nodes.length === 0 || width === 0 || height === 0) return;

    // 노드 복사 및 기존 위치 계승 (d3가 객체를 변경하기 때문)
    const nodesCopy: TaskNode[] = nodes.map((n) => {
      // 기존에 시뮬레이션 중이던 노드가 있다면 위치와 속도 정보를 가져옴
      const existingNode = nodesRef.current.find((prev) => prev.id === n.id);
      if (existingNode) {
        return {
          ...n,
          x: existingNode.x,
          y: existingNode.y,
          vx: existingNode.vx,
          vy: existingNode.vy,
          fx: existingNode.fx,
          fy: existingNode.fy,
        };
      }
      return { ...n };
    });
    
    const edgesCopy: TaskEdge[] = edges.map((e) => ({ ...e }));

    // 참조 저장 (드래그에서 사용)
    nodesRef.current = nodesCopy;

    // 기존 시뮬레이션 정리
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // 새 시뮬레이션 생성
    const simulation = forceSimulation<TaskNode>(nodesCopy)
      .force(
        'link',
        forceLink<TaskNode, TaskEdge>(edgesCopy)
          .id((d) => d.id)
          .distance((d) => getDistanceByWeight(d.weight)) // 목표 거리
          .strength((d) => d.weight * 0.5) // 당기는 힘
      )
      .force('charge', forceManyBody<TaskNode>().strength(-400)) // 모든 노드가 서로 밀어냄
      .force('center', forceCenter(width / 2, height / 2))  // 중앙으로 당김김
      .force(
        'collision',
        forceCollide<TaskNode>().radius((d) => PRIORITY_RADIUS[d.priority] + 15)  
      ) // 노드 충돌 방지
      .alphaDecay(0.02)     // 시뮬레이션 감속
      .velocityDecay(0.3);  // 노드 움직임에 마찰력 추가

    simulationRef.current = simulation;

    // 움직일 때마다 상태 업데이트
    simulation.on('tick', () => {
      setState({
        nodes: nodesCopy.map((n) => ({ ...n })),
        edges: edgesCopy.map((e) => ({ ...e })),
      });
    });

    // 시뮬레이션 시작
    simulation.alpha(1).restart();

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, width, height]);

  /*
   * 드래그 시작 함수
   */
  const handleDragStart = useCallback((nodeId: string) => {
    const simulation = simulationRef.current;
    const simNodes = nodesRef.current;
    if (!simulation || !simNodes.length) return;

    // 시뮬레이션 다시 활성화
    simulation.alphaTarget(0.3).restart();

    // 시뮬레이션 노드의 fx, fy 설정
    const node = simNodes.find((n) => n.id === nodeId);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
  }, []);

  /*
   * 드래그 중 - 시뮬레이션 노드 직접 업데이트 함수
   */
  const handleDrag = useCallback((nodeId: string, x: number, y: number) => {
    const simNodes = nodesRef.current;
    if (!simNodes.length) return;

    // 시뮬레이션 노드의 fx, fy 직접 업데이트
    const node = simNodes.find((n) => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }, []);

  /*
   * 드래그 종료 함수
   */
  const handleDragEnd = useCallback((nodeId: string) => {
    const simulation = simulationRef.current;
    const simNodes = nodesRef.current;
    if (!simulation || !simNodes.length) return;

    // 시뮬레이션 감속
    simulation.alphaTarget(0);

    // 고정 해제
    const node = simNodes.find((n) => n.id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  }, []);

  /* 
   * 시뮬레이션 재시작 함수
   */
  const restartSimulation = useCallback(() => {
    const simulation = simulationRef.current;
    if (simulation) {
      simulation.alpha(0.8).restart();
    }
  }, []);

  return {
    nodes: state.nodes,
    edges: state.edges,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    restartSimulation,
  };
}
