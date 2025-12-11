/**
 * ================================================================
 * 파일명       : api/index.ts
 * 목적         : 백엔드 API 클라이언트
 * 설명         : 
 *   - FastAPI 백엔드와 통신하는 API 함수들
 *   - Tasks, Edges CRUD 작업 지원
 *   - 에러 처리 및 타입 안전성 보장
 * ================================================================
 */

import type { TaskNode, TaskEdge, Priority, TaskStatus } from '../types';

// API 기본 URL
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * 백엔드 Task 응답 타입 (MongoDB _id 사용)
 */
interface ApiTask {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  category?: string;
  tags: string[];
}

/**
 * 백엔드 Edge 응답 타입
 */
interface ApiEdge {
  source: string;
  target: string;
  weight: number;
}

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API 요청 헬퍼 함수
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API 요청 실패: ${response.statusText}`);
  }

  // DELETE 요청은 204 No Content를 반환할 수 있음
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * API Task -> 프론트엔드 TaskNode 변환
 */
function toTaskNode(apiTask: ApiTask): TaskNode {
  return {
    id: apiTask.id,
    title: apiTask.title,
    description: apiTask.description,
    priority: apiTask.priority,
    status: apiTask.status,
    category: apiTask.category,
    tags: apiTask.tags || [],
  };
}

/**
 * API Edge -> 프론트엔드 TaskEdge 변환
 */
function toTaskEdge(apiEdge: ApiEdge): TaskEdge {
  return {
    source: apiEdge.source,
    target: apiEdge.target,
    weight: apiEdge.weight,
  };
}


// ================================================================
// Graph API (통합 조회)
// ================================================================

/**
 * 그래프 데이터 통합 조회 (태스크 + 엣지)
 */
export async function fetchGraphData(): Promise<{ tasks: TaskNode[], edges: TaskEdge[] } > {
  const data = await apiRequest<{ tasks: ApiTask[], edges: ApiEdge[] }>('/graph');
  return {
    tasks: data.tasks.map(toTaskNode),
    edges: data.edges.map(toTaskEdge),
  };
}

// ================================================================
// Tasks API
// ================================================================

/**
 * 모든 태스크 조회
 */
export async function fetchTasks(): Promise<TaskNode[]> {
  const tasks = await apiRequest<ApiTask[]>('/tasks');
  return tasks.map(toTaskNode);
}

/**
 * 태스크 생성
 */
export async function createTask(task: Omit<TaskNode, 'x' | 'y' | 'fx' | 'fy' | 'vx' | 'vy' | 'index'>): Promise<TaskNode> {
  const created = await apiRequest<ApiTask>('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      category: task.category,
      tags: task.tags,
    }),
  });
  return toTaskNode(created);
}

/**
 * 태스크 조회
 */
export async function fetchTask(id: string): Promise<TaskNode> {
  const task = await apiRequest<ApiTask>(`/tasks/${id}`);
  return toTaskNode(task);
}

/**
 * 태스크 수정
 */
export async function updateTaskApi(id: string, updates: Partial<TaskNode>): Promise<TaskNode> {
  // d3-force 관련 속성 제거
  const { x, y, fx, fy, vx, vy, index, ...cleanUpdates } = updates;
  
  const updated = await apiRequest<ApiTask>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cleanUpdates),
  });
  return toTaskNode(updated);
}

/**
 * 태스크 삭제
 */
export async function deleteTaskApi(id: string): Promise<void> {
  await apiRequest<void>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 테스크 삭제시 연결된 엣지도 삭제
 */
export async function deleteTaskCascade(id: string): Promise<void> {
  await apiRequest<void>(`/tasks/${id}/cascade`, {
    method: 'DELETE',
  });
}

// ================================================================
// Edges API
// ================================================================

/**
 * 모든 엣지 조회
 */
export async function fetchEdges(): Promise<TaskEdge[]> {
  const edges = await apiRequest<ApiEdge[]>('/edges');
  return edges.map(toTaskEdge);
}

/**
 * 엣지 생성
 */
export async function createEdge(
  source: string,
  target: string,
  weight: number = 0.5
): Promise<TaskEdge> {
  const created = await apiRequest<ApiEdge>('/edges', {
    method: 'POST',
    body: JSON.stringify({ source, target, weight }),
  });
  return toTaskEdge(created);
}

/**
 * 엣지 삭제
 */
export async function deleteEdgeApi(source: string, target: string): Promise<void> {
  await apiRequest<void>(`/edges/${source}/${target}`, {
    method: 'DELETE',
  });
}

// ================================================================
// Tags API
// ================================================================

/**
 * 전체 태그 목록 조회
 */
export async function fetchTags(): Promise<string[]> {
  return apiRequest<string[]>('/tags');
}

/**
 * 태그로 태스크 필터링 조회
 */
export async function fetchTasksByTag(tag: string): Promise<TaskNode[]> {
  const tasks = await apiRequest<ApiTask[]>(`/tasks?tag=${encodeURIComponent(tag)}`);
  return tasks.map(toTaskNode);
}

// ================================================================
// 헬스 체크
// ================================================================

/**
 * 백엔드 연결 상태 확인
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8000/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3초 타임아웃
    });
    return response.ok;
  } catch {
    return false;
  }
}

