/**
 * ================================================================
 * 파일명       : useTaskStore.ts
 * 목적         : 태스크/엣지 데이터 상태 관리 커스텀 훅
 * 설명         : 
 *   - IndexedDB(Dexie.js)를 통한 로컬 데이터 영구 저장
 *   - CRUD 작업 (추가/수정/삭제)
 *   - 데모 모드 지원 (샘플 데이터 표시)
 *   - 연결된 노드 ID 조회 기능
 * ================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import type { TaskNode, TaskEdge, GraphData } from '../types';
import { db } from '../db';
import { sampleNodes, sampleEdges } from '../data/sampleData';

export function useTaskStore() {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [edges, setEdges] = useState<TaskEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // 앱 시작 시 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const loadedTasks = await db.tasks.toArray();
      const loadedEdges = await db.edges.toArray();

      // DB가 비어있으면 데모 모드
      if (loadedTasks.length === 0) {
        setTasks(sampleNodes);
        setEdges(sampleEdges);
        setIsDemoMode(true);
      } else {
        // DB에 데이터 있으면 실제 모드
        setTasks(loadedTasks);
        setEdges(loadedEdges);
        setIsDemoMode(false);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 할 일 추가 (데모 모드 종료 + 새 태스크 저장)
  const addTask = async (task: TaskNode) => {
    // 데모 모드면 샘플 삭제하고 실제 모드로 전환
    if (isDemoMode) {
      setTasks([]);       // 샘플 삭제
      setEdges([]);       // 샘플 엣지도 삭제
      setIsDemoMode(false);
    }

    // DB에 저장
    await db.tasks.add(task);
    setTasks(prev => [...prev, task]);
  };

  // 할 일 삭제 (데모 모드에서는 비활성화)
  const deleteTask = async (id: string) => {
    if (isDemoMode) return; // 데모 모드면 아무것도 안 함

    await db.tasks.delete(id);
    await db.edges
      .filter(edge => edge.source === id || edge.target === id)
      .delete();

    setTasks(prev => prev.filter(task => task.id !== id));
    setEdges(prev => prev.filter(edge => 
      edge.source !== id && edge.target !== id
    ));
  };

  // 할 일 수정 (데모 모드에서는 비활성화)
  const updateTask = async (id: string, updates: Partial<TaskNode>) => {
    if (isDemoMode) return; // 데모 모드면 아무것도 안 함

    await db.tasks.update(id, updates);
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  // 엣지 추가 (데모 모드에서는 비활성화)
  const addEdge = async (sourceId: string, targetId: string, weight: number = 0.5) => {
    if (isDemoMode) return; // 데모 모드면 아무것도 안 함

    // 중복 체크 (이미 연결되어 있으면 추가하지 않음)
    const exists = edges.some(edge => {
      const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return (src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId);
    });
    
    if (exists) return; // 이미 연결됨

    const newEdge: TaskEdge = { source: sourceId, target: targetId, weight };
    await db.edges.add(newEdge);
    setEdges(prev => [...prev, newEdge]);
  };

  // 엣지 삭제 - source와 target으로 (데모 모드에서는 비활성화)
  const deleteEdge = async (sourceId: string, targetId: string) => {
    if (isDemoMode) return; // 데모 모드면 아무것도 안 함

    // DB에서 삭제
    await db.edges
      .filter(edge => {
        const src = typeof edge.source === 'string' ? edge.source : (edge.source as TaskNode).id;
        const tgt = typeof edge.target === 'string' ? edge.target : (edge.target as TaskNode).id;
        return (src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId);
      })
      .delete();

    // 상태에서 삭제
    setEdges(prev => prev.filter(edge => {
      const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return !((src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId));
    }));
  };

  // 특정 노드와 연결된 모든 노드 ID 가져오기
  const getConnectedNodeIds = (nodeId: string): string[] => {
    const connected: string[] = [];
    edges.forEach(edge => {
      const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
      if (src === nodeId) connected.push(tgt);
      if (tgt === nodeId) connected.push(src);
    });
    return connected;
  };

  // JSON 내보내기 (Export)
  const exportData = () => {
    // d3-force가 추가한 속성들(x, y, vx, vy, index)을 제거하고 순수 데이터만 내보내기
    const cleanTasks = tasks.map(({ id, title, description, priority, status, category }) => ({
      id, title, description, priority, status, category
    }));
    
    const cleanEdges = edges.map(edge => ({
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

    // JSON 파일 다운로드
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
  // mode: 'replace' = 기존 데이터 덮어쓰기, 'merge' = 기존 데이터 유지 + 추가
  const importData = async (file: File, mode: 'replace' | 'merge' = 'replace'): Promise<{ success: boolean; message: string }> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 데이터 검증
      if (!data.tasks || !Array.isArray(data.tasks)) {
        return { success: false, message: '잘못된 파일 형식입니다. (tasks 없음)' };
      }

      if (mode === 'replace') {
        // 기존 데이터 삭제 (덮어쓰기 모드)
        await db.tasks.clear();
        await db.edges.clear();
      }

      // 새 데이터 준비
      const existingIds = mode === 'merge' ? new Set(tasks.map(t => t.id)) : new Set();
      
      const tasksToAdd: TaskNode[] = data.tasks.map((t: Partial<TaskNode>) => {
        // 병합 모드에서 ID 충돌 시 새 ID 생성
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
        };
      });

      // ID 매핑 (병합 모드에서 엣지 업데이트용)
      const idMapping = new Map<string, string>();
      data.tasks.forEach((t: Partial<TaskNode>, i: number) => {
        idMapping.set(t.id || '', tasksToAdd[i].id);
      });

      await db.tasks.bulkAdd(tasksToAdd);

      let edgesToAdd: TaskEdge[] = [];
      if (data.edges && Array.isArray(data.edges)) {
        edgesToAdd = data.edges.map((e: Partial<TaskEdge>) => ({
          source: idMapping.get(String(e.source)) || String(e.source),
          target: idMapping.get(String(e.target)) || String(e.target),
          weight: e.weight ?? 0.5,
        }));
        await db.edges.bulkAdd(edgesToAdd);
      }

      if (mode === 'replace') {
        setTasks(tasksToAdd);
        setEdges(edgesToAdd);
      } else {
        // 병합 모드: 기존 데이터에 추가
        setTasks(prev => [...prev, ...tasksToAdd]);
        setEdges(prev => [...prev, ...edgesToAdd]);
      }
      
      setIsDemoMode(false);

      const modeText = mode === 'replace' ? '가져왔습니다' : '추가했습니다';
      return { success: true, message: `${tasksToAdd.length}개의 태스크를 ${modeText}!` };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, message: '파일을 읽는 중 오류가 발생했습니다.' };
    }
  };

  const graphData = useMemo(() => ({ nodes: tasks, edges } as GraphData), [tasks, edges]);

  return {
    tasks,
    edges,
    isLoading,
    isDemoMode,
    graphData,
    addTask,
    deleteTask,
    updateTask,
    addEdge,
    deleteEdge,
    getConnectedNodeIds,
    exportData,
    importData,
  };
}
