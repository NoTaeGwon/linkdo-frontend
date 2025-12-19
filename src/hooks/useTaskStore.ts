/**
 * ================================================================
 * 파일명       : useTaskStore.ts
 * 목적         : 태스크/엣지 데이터 상태 관리 커스텀 훅
 * 설명         : 
 *   - 온라인: FastAPI 백엔드 API 사용 + IndexedDB 캐시
 *   - 오프라인: IndexedDB 로컬 저장소 사용 + 작업 큐
 *   - 온라인 복구 시 오프라인 작업 동기화
 *   - 데모 모드 지원 (샘플 데이터 표시)
 * ================================================================
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { TaskNode, TaskEdge, GraphData } from '../types';
import { 
  db, 
  syncCacheFromServer, 
  addPendingOperation, 
  getPendingOperations,
  removePendingOperation,
  getPendingOperationsCount,
} from '../db';
import { sampleNodes, sampleEdges } from '../data/sampleData';
import { useOnlineStatus } from './useOnlineStatus';
import * as api from '../api';

// 엣지 타입 확장
type StoredEdge = TaskEdge;

export function useTaskStore() {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [edges, setEdges] = useState<StoredEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // 동기화 진행 중 플래그
  const isSyncingRef = useRef(false);

  // 온라인 상태 훅 - 온라인 복구 시 동기화 실행
  const { isOnline, isApiAvailable, checkConnection } = useOnlineStatus({
    checkInterval: 30000,
    onOnline: () => {
      console.log('🌐 온라인 복구됨 - 동기화 시작');
      syncPendingOperations();
    },
    onOffline: () => {
      console.log('📴 오프라인 전환됨 - 로컬 모드');
    },
  });

  // 대기 작업 개수 업데이트
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingOperationsCount();
    setPendingCount(count);
  }, []);

  // ================================================================
  // 오프라인 작업 동기화
  // ================================================================
  const syncPendingOperations = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncError(null);

    try {
      const pending = await getPendingOperations();
      console.log(`📤 동기화할 작업: ${pending.length}개`);

      for (const op of pending) {
        try {
          if (op.entity === 'task') {
            switch (op.type) {
              case 'create':
                if (op.data) {
                  const taskData = op.data as Partial<TaskNode>;
                  await api.createTask({
                    id: taskData.id || '',
                    title: taskData.title || '',
                    description: taskData.description,
                    priority: taskData.priority || 'medium',
                    status: taskData.status || 'todo',
                    category: taskData.category,
                    tags: taskData.tags || [],
                  });
                }
                break;
              case 'update':
                if (op.data) {
                  await api.updateTaskApi(op.entityId, op.data as Partial<TaskNode>);
                }
                break;
              case 'delete':
                await api.deleteTaskApi(op.entityId);
                break;
            }
          } else if (op.entity === 'edge') {
            switch (op.type) {
              case 'create':
                if (op.data) {
                  const edgeData = op.data as { source: string; target: string; weight: number };
                  await api.createEdge(edgeData.source, edgeData.target, edgeData.weight);
                }
                break;
              case 'delete':
                if (op.data) {
                  const edgeData = op.data as { source: string; target: string };
                  await api.deleteEdgeApi(edgeData.source, edgeData.target);
                }
                break;
            }
          }

          // 성공 시 대기 작업 삭제
          if (op.id) {
            await removePendingOperation(op.id);
          }
        } catch (error) {
          console.error(`❌ 작업 동기화 실패:`, op, error);
          // 개별 작업 실패 시 다음 작업 계속 진행
        }
      }

      // 서버에서 최신 데이터 다시 로드
      await loadFromServer();
      await updatePendingCount();
      console.log('✅ 동기화 완료');
    } catch (error) {
      console.error('❌ 동기화 실패:', error);
      setSyncError('동기화 중 오류가 발생했습니다.');
    } finally {
      isSyncingRef.current = false;
    }
  }, [updatePendingCount]);

  // ================================================================
  // 데이터 로드
  // ================================================================

  // 중복 제거 유틸리티 함수
  const removeDuplicateTasks = (tasks: TaskNode[]): TaskNode[] => {
    const seen = new Set<string>();
    return tasks.filter(task => {
      if (seen.has(task.id)) {
        console.warn(`중복 태스크 제거: ${task.id}`);
        return false;
      }
      seen.add(task.id);
      return true;
    });
  };

  // 서버에서 데이터 로드 (온라인 모드)
  const loadFromServer = useCallback(async (): Promise<boolean> => {
    try {
      // GET /api/graph를 사용하여 PCA 좌표 포함된 데이터 로드
      const { tasks: serverTasks, edges: serverEdges } = await api.fetchGraphData();

      // 중복 제거
      const uniqueTasks = removeDuplicateTasks(serverTasks);
      
      console.log('📊 그래프 데이터 로드:', {
        tasksCount: uniqueTasks.length,
        tasksWithPosition: uniqueTasks.filter(t => t.x !== undefined).length,
      });
      
      setTasks(uniqueTasks);
      setEdges(serverEdges);
      
      // 로컬 캐시 업데이트
      await syncCacheFromServer(uniqueTasks, serverEdges);
      
      setIsDemoMode(false);
      return true;
    } catch (error) {
      console.error('서버 로드 실패:', error);
      return false;
    }
  }, []);

  // 로컬(IndexedDB)에서 데이터 로드 (오프라인 모드)
  const loadFromLocal = useCallback(async (): Promise<boolean> => {
    try {
      const [localTasks, localEdges] = await Promise.all([
        db.tasks.toArray(),
        db.edges.toArray(),
      ]);

      if (localTasks.length === 0) {
        // 캐시도 비어있으면 데모 모드
        setTasks(sampleNodes);
        setEdges(sampleEdges);
        setIsDemoMode(true);
      } else {
        // 중복 제거
        const uniqueTasks = removeDuplicateTasks(localTasks);
        setTasks(uniqueTasks);
        setEdges(localEdges);
        setIsDemoMode(false);
      }
      return true;
    } catch (error) {
      console.error('로컬 로드 실패:', error);
      return false;
    }
  }, []);

  // 앱 시작 시 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 먼저 온라인 상태 확인
      const isAvailable = await checkConnection();
      
      if (isAvailable) {
        // 온라인이면 서버에서 로드
        const success = await loadFromServer();
        if (!success) {
          // 서버 로드 실패 시 로컬에서 로드
          await loadFromLocal();
        }
      } else {
        // 오프라인이면 로컬에서 로드
        await loadFromLocal();
      }

      await updatePendingCount();
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      // 모든 로드 실패 시 데모 모드
      setTasks(sampleNodes);
      setEdges(sampleEdges);
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  }, [checkConnection, loadFromServer, loadFromLocal, updatePendingCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ================================================================
  // 태스크 CRUD
  // ================================================================

  // 할 일 추가 (데모 모드 종료 + 새 태스크 저장)
  const addTask = async (task: TaskNode) => {
    // 데모 모드면 샘플 삭제하고 실제 모드로 전환
    if (isDemoMode) {
      setTasks([]);
      setEdges([]);
      setIsDemoMode(false);
    }

    if (isOnline) {
      // 온라인: API로 생성 (백엔드에서 임베딩 + PCA + 태그 기반 엣지 자동 생성)
      try {
        console.log('📝 태스크 생성 요청:', { title: task.title, tags: task.tags });

        await api.createTask({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          category: task.category,
          tags: task.tags,
        });

        console.log('✅ 태스크 생성 완료, 전체 데이터 새로고침 중...');

        // 서버에서 전체 데이터 새로고침 (PCA 좌표 + 자동 생성된 엣지 포함)
        await loadFromServer();

        console.log('✅ 데이터 새로고침 완료');
      } catch (error) {
        console.error('태스크 생성 실패:', error);
        throw error;
      }
    } else {
      // 오프라인: 로컬에 저장 + 대기 큐에 추가
    await db.tasks.add(task);
      await addPendingOperation({
        type: 'create',
        entity: 'task',
        entityId: task.id,
        data: {
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          category: task.category,
          tags: task.tags,
        },
      });
      setTasks((prev: TaskNode[]) => [...prev, task]);
      await updatePendingCount();
    }
  };

  // 할 일 삭제 (데모 모드에서는 비활성화)
  const deleteTask = async (id: string) => {
    if (isDemoMode) return;

    if (isOnline) {
      // 온라인: API로 삭제
      try {
        await api.deleteTaskCascade(id);
        setTasks((prev: TaskNode[]) => prev.filter((task: TaskNode) => task.id !== id));
        setEdges((prev: StoredEdge[]) => prev.filter((edge: StoredEdge) => {
          const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
          const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
          return src !== id && tgt !== id;
        }));
        // 로컬 캐시에서도 삭제
        await db.tasks.delete(id);
        await db.edges.filter((edge: StoredEdge) => edge.source === id || edge.target === id).delete();
      } catch (error) {
        console.error('태스크 삭제 실패:', error);
        throw error;
      }
    } else {
      // 오프라인: 로컬에서 삭제 + 대기 큐에 추가
    await db.tasks.delete(id);
      await db.edges.filter((edge: StoredEdge) => edge.source === id || edge.target === id).delete();
      await addPendingOperation({
        type: 'delete',
        entity: 'task',
        entityId: id,
      });

      setTasks((prev: TaskNode[]) => prev.filter((task: TaskNode) => task.id !== id));
      setEdges((prev: StoredEdge[]) => prev.filter((edge: StoredEdge) => {
        const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
        return src !== id && tgt !== id;
      }));
      await updatePendingCount();
    }
  };

  // 할 일 수정 (데모 모드에서는 비활성화)
  const updateTask = async (id: string, updates: Partial<TaskNode>) => {
    if (isDemoMode) return;

    // d3-force 속성 제거
    const { x, y, fx, fy, vx, vy, index, ...cleanUpdates } = updates;

    if (isOnline) {
      // 온라인: API로 수정
      try {
        const updated = await api.updateTaskApi(id, cleanUpdates);
        setTasks((prev: TaskNode[]) => prev.map((task: TaskNode) => 
          task.id === id ? { ...task, ...updated } : task
        ));
        // 로컬 캐시도 업데이트
        await db.tasks.update(id, cleanUpdates);
      } catch (error) {
        console.error('태스크 수정 실패:', error);
        throw error;
      }
    } else {
      // 오프라인: 로컬에서 수정 + 대기 큐에 추가
      await db.tasks.update(id, cleanUpdates);
      await addPendingOperation({
        type: 'update',
        entity: 'task',
        entityId: id,
        data: cleanUpdates,
      });

      setTasks((prev: TaskNode[]) => prev.map((task: TaskNode) => 
        task.id === id ? { ...task, ...cleanUpdates } : task
    ));
      await updatePendingCount();
    }
  };

  // ================================================================
  // 엣지 CRUD
  // ================================================================

  // 엣지 추가 (데모 모드에서는 비활성화)
  const addEdge = async (sourceId: string, targetId: string, weight: number = 0.5) => {
    if (isDemoMode) return;

    // 중복 체크
    const exists = edges.some((edge: StoredEdge) => {
      const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return (src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId);
    });
    
    if (exists) return;

    if (isOnline) {
      // 온라인: API로 생성
      try {
        const created = await api.createEdge(sourceId, targetId, weight);
        setEdges((prev: StoredEdge[]) => [...prev, created]);
        // 로컬 캐시에도 저장
        await db.edges.put(created);
      } catch (error) {
        console.error('엣지 생성 실패:', error);
        throw error;
      }
    } else {
      // 오프라인: 로컬에 저장 + 대기 큐에 추가
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newEdge: StoredEdge = { source: sourceId, target: targetId, weight };
      
    await db.edges.add(newEdge);
      await addPendingOperation({
        type: 'create',
        entity: 'edge',
        entityId: tempId,
        data: { source: sourceId, target: targetId, weight },
      });

      setEdges((prev: StoredEdge[]) => [...prev, newEdge]);
      await updatePendingCount();
    }
  };

  // 엣지 삭제 - source와 target으로 (데모 모드에서는 비활성화)
  const deleteEdge = async (sourceId: string, targetId: string) => {
    if (isDemoMode) return;

    // 삭제할 엣지 찾기
    const edgeToDelete = edges.find((edge: StoredEdge) => {
      const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return (src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId);
    });

    if (!edgeToDelete) return;

    if (isOnline) {
      // 온라인: API로 삭제
      try {
        const src = typeof edgeToDelete.source === 'string' ? edgeToDelete.source : edgeToDelete.source.id;
        const tgt = typeof edgeToDelete.target === 'string' ? edgeToDelete.target : edgeToDelete.target.id;
        await api.deleteEdgeApi(src, tgt);
        setEdges((prev: StoredEdge[]) => prev.filter((edge: StoredEdge) => {
          const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
          const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
          return !((src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId));
        }));
        // 로컬 캐시에서도 삭제
        await db.edges
          .filter((edge: TaskEdge) => {
            const s = typeof edge.source === 'string' ? edge.source : edge.source.id;
            const t = typeof edge.target === 'string' ? edge.target : edge.target.id;
            return (s === src && t === tgt) || (s === tgt && t === src);
          })
          .delete();
      } catch (error) {
        console.error('엣지 삭제 실패:', error);
        throw error;
      }
    } else {
      // 오프라인: 로컬에서 삭제 + 대기 큐에 추가
    await db.edges
        .filter((edge: StoredEdge) => {
        const src = typeof edge.source === 'string' ? edge.source : (edge.source as TaskNode).id;
        const tgt = typeof edge.target === 'string' ? edge.target : (edge.target as TaskNode).id;
        return (src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId);
      })
      .delete();

      const src = typeof edgeToDelete.source === 'string' ? edgeToDelete.source : edgeToDelete.source.id;
      const tgt = typeof edgeToDelete.target === 'string' ? edgeToDelete.target : edgeToDelete.target.id;
      await addPendingOperation({
        type: 'delete',
        entity: 'edge',
        entityId: `${src}:${tgt}`,
        data: { source: src, target: tgt },
      });

      setEdges((prev: StoredEdge[]) => prev.filter((edge: StoredEdge) => {
        const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
      const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
      return !((src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId));
    }));
      await updatePendingCount();
    }
  };

  // ================================================================
  // 유틸리티 함수들
  // ================================================================

  // 특정 노드와 연결된 모든 노드 ID 가져오기
  const getConnectedNodeIds = (nodeId: string): string[] => {
    const connected: string[] = [];
    edges.forEach((edge: StoredEdge) => {
      const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
      if (src === nodeId) connected.push(tgt);
      if (tgt === nodeId) connected.push(src);
    });
    return connected;
  };

  // JSON 내보내기 (Export)
  const exportData = () => {
    const cleanTasks = tasks.map(({ id, title, description, priority, status, category, tags }: TaskNode) => ({
      id, title, description, priority, status, category, tags
    }));
    
    const cleanEdges = edges.map((edge: StoredEdge) => ({
      source: typeof edge.source === 'string' ? edge.source : edge.source.id,
      target: typeof edge.target === 'string' ? edge.target : edge.target.id,
      weight: edge.weight,
    }));

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: cleanTasks,
      edges: cleanEdges,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkdo-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // JSON 가져오기 (Import)
  const importData = async (file: File, mode: 'replace' | 'merge' = 'replace'): Promise<{ success: boolean; message: string }> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.tasks || !Array.isArray(data.tasks)) {
        return { success: false, message: '잘못된 파일 형식입니다. (tasks 없음)' };
      }

      if (isOnline) {
        // 온라인: 서버에 데이터 추가
        if (mode === 'replace' && !isDemoMode) {
          // 서버에서 실제 태스크 목록 조회 후 삭제
          try {
            const serverTasks = await api.fetchTasks();
            for (const task of serverTasks) {
              try {
                await api.deleteTaskCascade(task.id);
              } catch {
                // 삭제 실패는 무시
              }
            }
          } catch (error) {
            console.error('서버 태스크 목록 조회 실패:', error);
          }
        }

        const createdTasks: TaskNode[] = [];
        for (const t of data.tasks) {
          try {
            const created = await api.createTask({
              id: t.id || '',
              title: t.title || '제목 없음',
              description: t.description,
              priority: t.priority || 'medium',
              status: t.status || 'todo',
              category: t.category || 'general',
              tags: t.tags || [],
            });
            createdTasks.push(created);
          } catch (error) {
            console.error('태스크 가져오기 실패:', error);
          }
        }

        // 엣지 생성 (ID 매핑 필요)
        if (data.edges && Array.isArray(data.edges)) {
          const idMapping = new Map<string, string>();
          (data.tasks as Partial<TaskNode>[]).forEach((t: Partial<TaskNode>, i: number) => {
            if (createdTasks[i]) {
              idMapping.set(t.id || '', createdTasks[i].id);
            }
          });

          for (const e of data.edges) {
            const newSource = idMapping.get(String(e.source)) || String(e.source);
            const newTarget = idMapping.get(String(e.target)) || String(e.target);
            try {
              await api.createEdge(newSource, newTarget, e.weight ?? 0.5);
            } catch {
              // 엣지 생성 실패는 무시
            }
          }
        }

        // 서버에서 최신 데이터 다시 로드
        await loadFromServer();
        const modeText = mode === 'replace' ? '가져왔습니다' : '추가했습니다';
        return { success: true, message: `${createdTasks.length}개의 태스크를 ${modeText}!` };
      } else {
        // 오프라인: 기존 로컬 로직 사용
      if (mode === 'replace') {
          // 대기 큐 초기화 (이전 작업들이 온라인 복구 시 실행되지 않도록)
          await db.pendingOperations.clear();
          
          // 기존 태스크들의 delete 작업을 대기 큐에 추가 (온라인 복구 시 서버 데이터도 삭제)
          for (const task of tasks) {
            await addPendingOperation({
              type: 'delete',
              entity: 'task',
              entityId: task.id,
            });
          }
          
          // IndexedDB 초기화
        await db.tasks.clear();
        await db.edges.clear();
      }

        const existingIds = mode === 'merge' ? new Set(tasks.map((t: TaskNode) => t.id)) : new Set();
      
      const tasksToAdd: TaskNode[] = data.tasks.map((t: Partial<TaskNode>) => {
        let id = t.id || `task-${Date.now()}-${Math.random()}`;
        if (mode === 'merge' && existingIds.has(id)) {
          id = `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
        return {
          id,
          title: t.title || '제목 없음',
          description: t.description,
          priority: t.priority || 'medium',
          status: t.status || 'todo',
          category: t.category || 'general',
            tags: t.tags || [],
        };
      });

      const idMapping = new Map<string, string>();
      data.tasks.forEach((t: Partial<TaskNode>, i: number) => {
        idMapping.set(t.id || '', tasksToAdd[i].id);
      });

      await db.tasks.bulkAdd(tasksToAdd);

        let edgesToAdd: StoredEdge[] = [];
      if (data.edges && Array.isArray(data.edges)) {
        edgesToAdd = data.edges.map((e: Partial<TaskEdge>) => ({
          source: idMapping.get(String(e.source)) || String(e.source),
          target: idMapping.get(String(e.target)) || String(e.target),
          weight: e.weight ?? 0.5,
        }));
        await db.edges.bulkAdd(edgesToAdd);
      }

        // 대기 큐에 추가
        for (const task of tasksToAdd) {
          await addPendingOperation({
            type: 'create',
            entity: 'task',
            entityId: task.id,
            data: task,
          });
        }

      if (mode === 'replace') {
        setTasks(tasksToAdd);
        setEdges(edgesToAdd);
      } else {
        setTasks((prev: TaskNode[]) => [...prev, ...tasksToAdd]);
        setEdges((prev: StoredEdge[]) => [...prev, ...edgesToAdd]);
      }
      
      setIsDemoMode(false);
        await updatePendingCount();

      const modeText = mode === 'replace' ? '가져왔습니다' : '추가했습니다';
        return { success: true, message: `${tasksToAdd.length}개의 태스크를 ${modeText}! (오프라인 모드 - 온라인 시 동기화됨)` };
      }
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, message: '파일을 읽는 중 오류가 발생했습니다.' };
    }
  };

  // 수동 동기화 트리거
  const forceSync = useCallback(async () => {
    const isAvailable = await checkConnection();
    if (isAvailable) {
      await syncPendingOperations();
    } else {
      setSyncError('서버에 연결할 수 없습니다.');
    }
  }, [checkConnection, syncPendingOperations]);

  // 데이터 새로고침 (서버에서 다시 로드)
  const refresh = useCallback(async () => {
    if (isOnline) {
      await loadFromServer();
    } else {
      await loadFromLocal();
    }
  }, [isOnline, loadFromServer, loadFromLocal]);

  const graphData = useMemo(() => ({ nodes: tasks, edges } as GraphData), [tasks, edges]);

  // ================================================================
  // 자동정렬 (PCA 기반 위치 재배치)
  // ================================================================

  /**
   * 자동정렬 - PCA 기반 좌표 재배치
   * 백엔드에서 전체 태스크의 임베딩을 PCA로 분석하여 좌표 반환
   * (엣지는 이미 태스크 생성 시 자동으로 연결됨)
   * @param onProgress 진행률 콜백
   */
  const autoArrange = useCallback(async (
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<{ updated: number, failed: number, center?: { x: number, y: number } }> => {
    const result: { updated: number, failed: number, center?: { x: number, y: number } } = { updated: 0, failed: 0 };

    if (!isOnline) {
      throw new Error('자동정렬은 온라인 상태에서만 가능합니다');
    }

    try {
      onProgress?.(0, 100, 'PCA 좌표 계산 요청 중...');
      console.log('🔄 자동정렬 시작: PCA 좌표 계산 요청');

      // 백엔드에서 PCA 좌표 계산
      const positions = await api.autoArrange();
      
      console.log(`📍 PCA 좌표 수신: ${positions.length}개`);
      onProgress?.(50, 100, '좌표 적용 중...');

      // PCA 좌표를 그대로 사용 (변환 없음)
      const positionMap = new Map(positions.map(p => [p.id, { x: p.x, y: p.y }]));

      // 노드 중심점 계산 (화면 이동용)
      const validPositions = positions.filter(p => p.x !== 0 || p.y !== 0);
      if (validPositions.length > 0) {
        result.center = {
          x: validPositions.reduce((sum, p) => sum + p.x, 0) / validPositions.length,
          y: validPositions.reduce((sum, p) => sum + p.y, 0) / validPositions.length,
        };
        console.log(`📐 노드 중심점: (${result.center.x.toFixed(2)}, ${result.center.y.toFixed(2)})`);
      }

      // 로컬 상태 업데이트 (PCA 좌표 그대로 적용)
      setTasks((prev: TaskNode[]) => 
        prev.map((task: TaskNode) => {
          const pos = positionMap.get(task.id);
          if (pos) {
            result.updated++;
            return { ...task, x: pos.x, y: pos.y };
          }
          result.failed++;
          return task;
        })
      );

      // 로컬 캐시도 업데이트
      for (const pos of positions) {
        try {
          await db.tasks.update(pos.id, { x: pos.x, y: pos.y });
        } catch (error) {
          console.warn(`로컬 캐시 업데이트 실패: ${pos.id}`, error);
        }
      }

      onProgress?.(100, 100, '완료');
      console.log(`✅ 자동정렬 완료: ${result.updated}개 업데이트, ${result.failed}개 실패`);

      return result;
    } catch (error) {
      console.error('자동정렬 실패:', error);
      throw error;
    }
  }, [isOnline]);

  return {
    // 데이터
    tasks,
    edges,
    graphData,
    
    // 상태
    isLoading,
    isDemoMode,
    isOnline,
    isApiAvailable,
    pendingCount,
    syncError,
    
    // 태스크 CRUD
    addTask,
    deleteTask,
    updateTask,
    
    // 엣지 CRUD
    addEdge,
    deleteEdge,
    
    // 유틸리티
    getConnectedNodeIds,
    exportData,
    importData,
    
    // 동기화
    forceSync,
    refresh,

    // 자동정렬
    autoArrange,
  };
}
