/**
 * ================================================================
 * 파일명       : db/index.ts
 * 목적         : IndexedDB 로컬 데이터베이스 설정
 * 설명         : 
 *   - Dexie.js 기반 IndexedDB 래퍼
 *   - tasks 테이블: 태스크 저장
 *   - edges 테이블: 연결 관계 저장
 *   - 오프라인 데이터 영구 저장 지원
 * ================================================================
 */

import Dexie, { type Table } from 'dexie';
import type { TaskNode, TaskEdge } from '../types';
export class LinkdoDB extends Dexie {
  // 테이블 선언 (타입 지정)
  tasks!: Table<TaskNode>;
  edges!: Table<TaskEdge & { id?: number }>;

  constructor() {
    // 부모 클래스(Dexie) 생성자 호출, DB 이름 전달
    super('LinkdoDB');

    // 테이블 스키마 정의
    // version(1) = DB 버전 1
    this.version(1).stores({
      tasks: 'id, priority, status, category',
      edges: '++id, source, target',
    });
  }
}

// DB 인스턴스 생성 (앱 전체에서 이 하나의 인스턴스 사용)
export const db = new LinkdoDB();
