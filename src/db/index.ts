/**
 * ================================================================
 * 파일명       : db/index.ts
 * 목적         : IndexedDB 로컬 데이터베이스 설정
 * 설명         : 
 *   - Dexie.js 기반 IndexedDB 래퍼
 *   - tasks 테이블: 태스크 저장
 *   - edges 테이블: 연결 관계 저장
 *   - pendingOperations 테이블: 오프라인 작업 큐
 *   - 오프라인 데이터 영구 저장 지원
 * ================================================================
 */

import Dexie, { type Table } from 'dexie';
import type { TaskNode, TaskEdge } from '../types';

/**
 * 오프라인 작업 큐 항목 타입
 * 오프라인 상태에서 수행된 작업을 저장하고
 * 온라인 복구 시 서버에 동기화
 */
export interface PendingOperation {
  id?: number;
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'edge';
  entityId: string;
  data?: Partial<TaskNode> | { source: string; target: string; weight?: number };
  timestamp: number;
}

export class LinkdoDB extends Dexie {
  // 테이블 선언 (타입 지정)
  tasks!: Table<TaskNode>;
  edges!: Table<TaskEdge>;
  pendingOperations!: Table<PendingOperation>;

  constructor() {
    // 부모 클래스(Dexie) 생성자 호출, DB 이름 전달
    super('LinkdoDB');

    // 테이블 스키마 정의 (최신 버전만 정의)
    // version(2) = 오프라인 작업 큐 추가 + edges에 id 키 추가
    this.version(2).stores({
      tasks: 'id, priority, status, category',
      edges: 'id, source, target',
      pendingOperations: '++id, type, entity, entityId, timestamp',
    }).upgrade(async tx => {
      // 기존 edges 데이터에 id가 없으면 생성
      const edges = await tx.table('edges').toArray();
      for (const edge of edges) {
        if (!edge.id) {
          edge.id = `edge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          await tx.table('edges').put(edge);
        }
      }
    });

    // 기존 버전 (마이그레이션 지원)
    this.version(1).stores({
      tasks: 'id, priority, status, category',
      edges: '++id, source, target',
    });
  }
}

// DB 인스턴스 생성 (앱 전체에서 이 하나의 인스턴스 사용)
export const db = new LinkdoDB();

// ================================================================
// 캐시 동기화 유틸리티 함수들
// ================================================================

/**
 * 로컬 캐시를 서버 데이터로 갱신
 */
export async function syncCacheFromServer(
  tasks: TaskNode[],
  edges: TaskEdge[]
): Promise<void> {
  await db.transaction('rw', [db.tasks, db.edges], async () => {
    // 기존 캐시 삭제
    await db.tasks.clear();
    await db.edges.clear();
    
    // 새 데이터로 교체
    if (tasks.length > 0) {
      await db.tasks.bulkPut(tasks);
    }
    if (edges.length > 0) {
      await db.edges.bulkPut(edges);
    }
  });
}

/**
 * 대기 중인 오프라인 작업 추가
 */
export async function addPendingOperation(
  operation: Omit<PendingOperation, 'id' | 'timestamp'>
): Promise<void> {
  await db.pendingOperations.add({
    ...operation,
    timestamp: Date.now(),
  });
}

/**
 * 대기 중인 오프라인 작업 조회 (시간순)
 */
export async function getPendingOperations(): Promise<PendingOperation[]> {
  return db.pendingOperations.orderBy('timestamp').toArray();
}

/**
 * 특정 오프라인 작업 삭제
 */
export async function removePendingOperation(id: number): Promise<void> {
  await db.pendingOperations.delete(id);
}

/**
 * 모든 대기 작업 삭제
 */
export async function clearPendingOperations(): Promise<void> {
  await db.pendingOperations.clear();
}

/**
 * 대기 작업 개수 조회
 */
export async function getPendingOperationsCount(): Promise<number> {
  return db.pendingOperations.count();
}
