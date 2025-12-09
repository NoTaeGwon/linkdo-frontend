/**
 * ================================================================
 * 파일명       : types/index.ts
 * 목적         : 프로젝트 전역 타입 정의
 * 설명         : 
 *   - TaskNode: 태스크(노드) 데이터 타입
 *   - TaskEdge: 연결(엣지) 데이터 타입
 *   - Priority, TaskStatus: 상태 열거형
 *   - PRIORITY_RADIUS: 우선순위별 노드 크기 매핑
 *   - GraphData: 그래프 전체 데이터 구조
 * ================================================================
 */

/**
 * TaskNode - 그래프의 노드(Task)를 나타내는 타입
 * 
 * @property id - 고유 식별자
 * @property title - 태스크 제목
 * @property description - 태스크 설명 (선택)
 * @property priority - 우선순위 (원의 크기에 영향)
 * @property status - 태스크 상태
 * @property category - 태스크 카테고리 (색상 그룹)
 * @property x, y - d3-force 시뮬레이션에서 계산되는 좌표
 * @property fx, fy - 고정 좌표 (드래그 시 사용)
 */
export interface TaskNode {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  category?: string;
  // d3-force 시뮬레이션 좌표
  x?: number;
  y?: number;
  // 고정 좌표 (드래그 시 위치 고정)
  fx?: number | null;
  fy?: number | null;
  // 시뮬레이션 속도
  vx?: number;
  vy?: number;
  // 인덱스 (d3-force 내부 사용)
  index?: number;
}

/**
 * TaskEdge - 노드 간 연결(연관도)을 나타내는 타입
 * 
 * @property source - 시작 노드 ID 또는 노드 객체
 * @property target - 끝 노드 ID 또는 노드 객체
 * @property weight - 연관도 (0~1, 높을수록 강한 연관)
 *                    - 색상 강도에 영향
 *                    - 거리에 영향 (weight 높으면 가깝게 배치)
 */
export interface TaskEdge {
  source: string | TaskNode;
  target: string | TaskNode;
  weight: number; // 0 ~ 1
}

/**
 * 우선순위 타입
 * - low: 낮음 (작은 원)
 * - medium: 중간
 * - high: 높음
 * - critical: 긴급 (큰 원)
 */
export type Priority = 'low' | 'medium' | 'high' | 'critical';

/**
 * 태스크 상태 타입
 */
export type TaskStatus = 'todo' | 'in-progress' | 'done';

/**
 * 우선순위별 원 반지름 매핑
 */
export const PRIORITY_RADIUS: Record<Priority, number> = {
  low: 20,
  medium: 30,
  high: 40,
  critical: 55,
};

/**
 * 연관도(weight)에 따른 거리 계산
 * weight가 높을수록 거리가 가까움
 */
export const getDistanceByWeight = (weight: number): number => {
  const minDistance = 80;
  const maxDistance = 250;
  // weight가 1이면 가까움(minDistance), 0이면 멀음(maxDistance)
  return maxDistance - (maxDistance - minDistance) * weight;
};

/**
 * 연관도(weight)에 따른 색상 불투명도 계산
 */
export const getOpacityByWeight = (weight: number): number => {
  return 0.3 + weight * 0.7; // 0.3 ~ 1.0
};

/**
 * 그래프 데이터 타입
 */
export interface GraphData {
  nodes: TaskNode[];
  edges: TaskEdge[];
}

