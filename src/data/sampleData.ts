import type { TaskNode, TaskEdge, GraphData } from '../types';

/**
 * 초기 샘플 노드 데이터
 */
export const sampleNodes: TaskNode[] = [
  {
    id: 'task-1',
    title: '프로젝트 기획',
    description: '전체 프로젝트 범위와 목표 설정',
    priority: 'critical',
    status: 'done',
    category: 'planning',
  },
  {
    id: 'task-2',
    title: 'UI/UX 디자인',
    description: '사용자 인터페이스 및 경험 설계',
    priority: 'high',
    status: 'done',
    category: 'design',
  },
  {
    id: 'task-3',
    title: '데이터베이스 설계',
    description: 'ERD 작성 및 스키마 정의',
    priority: 'high',
    status: 'in-progress',
    category: 'backend',
  },
  {
    id: 'task-4',
    title: 'API 개발',
    description: 'REST API 엔드포인트 구현',
    priority: 'high',
    status: 'todo',
    category: 'backend',
  },
  {
    id: 'task-5',
    title: '프론트엔드 구현',
    description: 'React 컴포넌트 개발',
    priority: 'high',
    status: 'in-progress',
    category: 'frontend',
  },
  {
    id: 'task-6',
    title: '사용자 인증',
    description: '로그인/회원가입 기능 구현',
    priority: 'medium',
    status: 'todo',
    category: 'backend',
  },
  {
    id: 'task-7',
    title: '대시보드 UI',
    description: '메인 대시보드 화면 구현',
    priority: 'medium',
    status: 'todo',
    category: 'frontend',
  },
  {
    id: 'task-8',
    title: '테스트 작성',
    description: '유닛 테스트 및 통합 테스트',
    priority: 'medium',
    status: 'todo',
    category: 'testing',
  },
  {
    id: 'task-9',
    title: '문서화',
    description: 'API 문서 및 사용자 가이드 작성',
    priority: 'low',
    status: 'todo',
    category: 'docs',
  },
  {
    id: 'task-10',
    title: '배포 설정',
    description: 'CI/CD 파이프라인 구축',
    priority: 'medium',
    status: 'todo',
    category: 'devops',
  },
  {
    id: 'task-11',
    title: '성능 최적화',
    description: '로딩 속도 및 렌더링 개선',
    priority: 'low',
    status: 'todo',
    category: 'frontend',
  },
  {
    id: 'task-12',
    title: '보안 검토',
    description: '보안 취약점 점검 및 수정',
    priority: 'critical',
    status: 'todo',
    category: 'security',
  },
];

/**
 * 초기 샘플 엣지 데이터
 * weight: 연관도 (0~1, 높을수록 강한 연관)
 */
export const sampleEdges: TaskEdge[] = [
  // 프로젝트 기획 -> 다른 태스크들 (기획이 먼저 완료되어야 함)
  { source: 'task-1', target: 'task-2', weight: 0.9 },
  { source: 'task-1', target: 'task-3', weight: 0.8 },
  
  // UI/UX 디자인 -> 프론트엔드
  { source: 'task-2', target: 'task-5', weight: 0.95 },
  { source: 'task-2', target: 'task-7', weight: 0.85 },
  
  // 데이터베이스 설계 -> API 개발
  { source: 'task-3', target: 'task-4', weight: 0.95 },
  { source: 'task-3', target: 'task-6', weight: 0.7 },
  
  // API 개발 -> 프론트엔드
  { source: 'task-4', target: 'task-5', weight: 0.8 },
  { source: 'task-4', target: 'task-6', weight: 0.85 },
  { source: 'task-4', target: 'task-7', weight: 0.6 },
  
  // 프론트엔드 -> 대시보드
  { source: 'task-5', target: 'task-7', weight: 0.9 },
  { source: 'task-5', target: 'task-11', weight: 0.75 },
  
  // 사용자 인증 -> 보안
  { source: 'task-6', target: 'task-12', weight: 0.9 },
  
  // 테스트 관련
  { source: 'task-4', target: 'task-8', weight: 0.7 },
  { source: 'task-5', target: 'task-8', weight: 0.7 },
  { source: 'task-6', target: 'task-8', weight: 0.6 },
  
  // 문서화
  { source: 'task-4', target: 'task-9', weight: 0.5 },
  { source: 'task-8', target: 'task-9', weight: 0.4 },
  
  // 배포
  { source: 'task-8', target: 'task-10', weight: 0.8 },
  { source: 'task-12', target: 'task-10', weight: 0.75 },
  
  // 성능 최적화
  { source: 'task-7', target: 'task-11', weight: 0.65 },
];

/**
 * 샘플 그래프 데이터
 */
export const sampleGraphData: GraphData = {
  nodes: sampleNodes,
  edges: sampleEdges,
};

/**
 * 카테고리별 색상 매핑
 */
export const CATEGORY_COLORS: Record<string, string> = {
  planning: '#6366f1',   // Indigo
  design: '#ec4899',     // Pink
  backend: '#14b8a6',    // Teal
  frontend: '#f59e0b',   // Amber
  testing: '#8b5cf6',    // Violet
  docs: '#64748b',       // Slate
  devops: '#22c55e',     // Green
  security: '#ef4444',   // Red
};

/**
 * 상태별 스타일
 */
export const STATUS_STYLES: Record<string, { stroke: string; strokeDasharray?: string }> = {
  done: { stroke: '#22c55e', strokeDasharray: undefined },
  'in-progress': { stroke: '#f59e0b', strokeDasharray: '5,3' },
  todo: { stroke: '#94a3b8', strokeDasharray: '2,2' },
};

