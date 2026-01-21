/**
 * ================================================================
 * 파일명       : App.tsx
 * 목적         : 애플리케이션 루트 컴포넌트
 * 설명         : 
 *   - 전역 상태 관리 (선택된 노드, 뷰 상태, 연결 모드)
 *   - Graph, TaskPanel 컴포넌트 통합
 *   - 태스크 추가 모달 제공
 *   - 데모 모드 배너 표시
 * ================================================================
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { Graph, type ViewState } from './components/Graph';
import { TaskPanel } from './components/TaskPanel';
import { SearchBar } from './components/SearchBar';
import { AddTaskModal, AutoArrangeModal, LoadingOverlay } from './components/modals';
import { Onboarding, resetOnboarding } from './components/Onboarding';
import { useTaskStore } from './hooks/useTaskStore';
import type { TaskNode, Priority } from './types';
import { TOAST_DURATION, TASK_SELECT_DELAY } from './constants';
import './styles/global.css';

function App() {
  // ================================================================
  // 상태 관리
  // ================================================================
  const [selectedNode, setSelectedNode] = useState<TaskNode | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, pan: { x: 0, y: 0 } });
  const [linkingMode, setLinkingMode] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 자동정렬 관련 상태
  const [showAutoArrangeModal, setShowAutoArrangeModal] = useState(false);
  const [isAutoArranging, setIsAutoArranging] = useState(false);
  const [autoArrangeProgress, setAutoArrangeProgress] = useState({ current: 0, total: 0, taskTitle: '' });

  // 온보딩 투어 상태
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Refs
  const initialCenterDone = useRef(false);
  const tagFilterRef = useRef<HTMLDivElement>(null);

  // ================================================================
  // useTaskStore 훅
  // ================================================================
  const {
    graphData,
    isLoading,
    isDemoMode,
    isApiAvailable,
    tasks,
    addTask,
    updateTask,
    deleteTask,
    addEdge,
    deleteEdge,
    getConnectedNodeIds,
    exportData,
    importData,
    autoArrange,
  } = useTaskStore();

  // ================================================================
  // 초기 로드 시 노드 중심으로 화면 이동
  // ================================================================
  useEffect(() => {
    if (isLoading || initialCenterDone.current || tasks.length === 0) return;

    const positionedNodes = tasks.filter(t => t.x !== undefined && t.y !== undefined);
    if (positionedNodes.length === 0) return;

    const centerX = positionedNodes.reduce((sum, n) => sum + (n.x || 0), 0) / positionedNodes.length;
    const centerY = positionedNodes.reduce((sum, n) => sum + (n.y || 0), 0) / positionedNodes.length;

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    setViewState(prev => ({
      ...prev,
      pan: {
        x: screenCenterX - centerX,
        y: screenCenterY - centerY,
      }
    }));

    initialCenterDone.current = true;
  }, [isLoading, tasks]);

  // ================================================================
  // 태그 필터 관련
  // ================================================================
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(task => {
      (task.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [tasks]);

  const filteredGraphData = useMemo(() => {
    if (selectedTags.length === 0) return graphData;

    const filteredNodes = graphData.nodes.filter(node =>
      selectedTags.some(tag => (node.tags || []).includes(tag))
    );
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    const filteredEdges = graphData.edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearTagFilter = () => setSelectedTags([]);

  // 태그 필터 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagFilterRef.current && !tagFilterRef.current.contains(event.target as Node)) {
        setShowTagFilter(false);
      }
    };

    if (showTagFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTagFilter]);

  // ================================================================
  // 이벤트 핸들러
  // ================================================================
  const handleAddTask = async (taskData: {
    title: string;
    priority: Priority;
    description?: string;
    tags?: string[];
    dueDate?: string;
  }) => {
    const newTask: TaskNode = {
      id: `task-${Date.now()}`,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      status: 'todo',
      category: 'general',
      tags: taskData.tags || [],
      dueDate: taskData.dueDate,
    };
    await addTask(newTask);
    setShowAddModal(false);

    setTimeout(() => {
      setSelectedNode(newTask);
    }, TASK_SELECT_DELAY);
  };

  const handleAutoArrange = async () => {
    setShowAutoArrangeModal(false);
    setIsAutoArranging(true);
    setAutoArrangeProgress({ current: 0, total: 100, taskTitle: '' });

    try {
      const result = await autoArrange((current, total, message) => {
        setAutoArrangeProgress({ current, total, taskTitle: message });
      });

      // 자동정렬 후 노드 중심으로 화면 이동
      if (result.center) {
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        setViewState(prev => ({
          ...prev,
          pan: {
            x: screenCenterX - result.center!.x,
            y: screenCenterY - result.center!.y,
          }
        }));
      }

      showToast(`✅ 자동정렬 완료: ${result.updated}개 태스크 위치 업데이트`);
    } catch (error) {
      console.error('자동정렬 실패:', error);
      showToast(`❌ 자동정렬 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsAutoArranging(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), TOAST_DURATION);
  };

  // ================================================================
  // 로딩 화면
  // ================================================================
  if (isLoading) {
    return (
      <div className="app loading-screen">
        <div className="loading-spinner">
          <span className="logo-icon">◉</span>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // ================================================================
  // 메인 렌더링
  // ================================================================
  return (
    <div className="app">
      {/* 데모 모드 배너 */}
      {isDemoMode && (
        <div className="demo-banner">
          <span>🎮</span> 데모 모드입니다. 새 태스크를 추가하면 샘플 데이터가 삭제됩니다.
        </div>
      )}

      {/* 헤더 */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">◉</span>
            <h1>Linkdo</h1>
          </div>
          <p className="subtitle">Graph-based Task Visualization</p>
        </div>

        <div className="header-actions">
          {/* 검색 & 필터 영역 */}
          <div className="search-filter-area">
            {/* 태그 필터 */}
            <TagFilterButton
              ref={tagFilterRef}
              allTags={allTags}
              selectedTags={selectedTags}
              showTagFilter={showTagFilter}
              tasks={tasks}
              onToggleFilter={() => setShowTagFilter(!showTagFilter)}
              onToggleTag={toggleTag}
              onClearFilter={clearTagFilter}
            />

            {/* 검색 바 */}
            <SearchBar tasks={tasks} onSelectTask={setSelectedNode} />
          </div>

          {/* 태스크 추가 버튼 */}
          <button className="btn-secondary add-task-btn" onClick={() => setShowAddModal(true)}>
            <span>+</span> Add Task
          </button>

          {/* 자동정렬 버튼 */}
          <button
            className="btn-secondary auto-arrange-btn"
            onClick={() => setShowAutoArrangeModal(true)}
            disabled={!isApiAvailable || tasks.length < 2}
            title={!isApiAvailable ? '서버 연결 필요' : tasks.length < 2 ? '태스크가 2개 이상 필요합니다' : 'PCA 기반 자동 배치'}
          >
            <span>📍</span> 자동정렬
          </button>

          {/* 도움말 버튼 */}
          <button
            className="help-btn"
            onClick={() => {
              resetOnboarding();
              setShowOnboarding(true);
            }}
            title="사용법 보기"
          >
            ?
          </button>
        </div>
      </header>

      {/* 메인 그래프 영역 */}
      <main className="main">
        {/* 태그 필터 활성화 시 표시 */}
        {selectedTags.length > 0 && (
          <ActiveTagFilters
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onClearFilter={clearTagFilter}
          />
        )}

        <Graph
          data={filteredGraphData}
          selectedNodeId={selectedNode?.id || null}
          onNodeSelect={(node) => {
            if (linkingMode && node && node.id !== linkingMode) {
              addEdge(linkingMode, node.id);
              setLinkingMode(null);
              return;
            }
            setSelectedNode(node);
          }}
          viewState={viewState}
          onViewStateChange={setViewState}
          linkingMode={linkingMode}
        />

        {/* 연결 모드 안내 */}
        {linkingMode && (
          <div className="linking-mode-banner">
            <span>🔗</span> 연결할 노드를 클릭하세요
            <button onClick={() => setLinkingMode(null)}>취소</button>
          </div>
        )}

        {/* 선택된 노드 패널 */}
        <TaskPanel
          selectedNode={selectedNode}
          isDemoMode={isDemoMode}
          isApiAvailable={isApiAvailable}
          allTasks={tasks}
          connectedNodeIds={selectedNode ? getConnectedNodeIds(selectedNode.id) : []}
          onClose={() => setSelectedNode(null)}
          onEdit={async (id, updates) => {
            await updateTask(id, updates);
            if (selectedNode && selectedNode.id === id) {
              setSelectedNode({ ...selectedNode, ...updates });
            }
          }}
          onDelete={(id) => {
            setSelectedNode(null);
            deleteTask(id);
          }}
          onStartLinking={(nodeId) => {
            setLinkingMode(nodeId);
            setSelectedNode(null);
          }}
          onDeleteEdge={(targetId) => {
            if (selectedNode) {
              deleteEdge(selectedNode.id, targetId);
            }
          }}
        />
      </main>

      {/* 힌트 */}
      <div className="hint">
        <span>💡</span> 노드를 클릭하면 연결된 태스크가 강조됩니다 · 드래그로 위치 조정
      </div>

      {/* 토스트 메시지 */}
      {toastMessage && <div className="toast-message">{toastMessage}</div>}

      {/* 모달들 */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTask}
          isApiAvailable={isApiAvailable}
          onExport={exportData}
          onImport={async (file, mode) => {
            const result = await importData(file, mode);
            if (result.success) {
              showToast(result.message);
            }
            return result;
          }}
        />
      )}

      {showAutoArrangeModal && (
        <AutoArrangeModal
          onClose={() => setShowAutoArrangeModal(false)}
          onArrange={handleAutoArrange}
        />
      )}

      {isAutoArranging && (
        <LoadingOverlay
          current={autoArrangeProgress.current}
          total={autoArrangeProgress.total}
          taskTitle={autoArrangeProgress.taskTitle}
        />
      )}

      {/* 온보딩 투어 */}
      <Onboarding
        forceShow={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}

// ================================================================
// 서브 컴포넌트: 태그 필터 버튼
// ================================================================
import { forwardRef } from 'react';

interface TagFilterButtonProps {
  allTags: string[];
  selectedTags: string[];
  showTagFilter: boolean;
  tasks: TaskNode[];
  onToggleFilter: () => void;
  onToggleTag: (tag: string) => void;
  onClearFilter: () => void;
}

const TagFilterButton = forwardRef<HTMLDivElement, TagFilterButtonProps>(
  ({ allTags, selectedTags, showTagFilter, tasks, onToggleFilter, onToggleTag, onClearFilter }, ref) => (
    <div ref={ref} className="tag-filter-container">
      <button
        className={`btn-icon ${selectedTags.length > 0 ? 'active' : ''}`}
        onClick={onToggleFilter}
        title="태그 필터"
      >
        🏷️
      </button>

      {showTagFilter && (
        <div className="tag-filter-dropdown">
          <div className="tag-filter-header">
            <span>태그 필터</span>
            {selectedTags.length > 0 && (
              <button onClick={onClearFilter}>모두 해제</button>
            )}
          </div>

          {allTags.length === 0 ? (
            <p className="empty-text">태그가 없습니다</p>
          ) : (
            <div className="tag-filter-list">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-filter-item ${selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => onToggleTag(tag)}
                >
                  <span className="checkbox">{selectedTags.includes(tag) && '✓'}</span>
                  {tag}
                  <span className="count">
                    {tasks.filter(t => (t.tags || []).includes(tag)).length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
);

TagFilterButton.displayName = 'TagFilterButton';

// ================================================================
// 서브 컴포넌트: 활성 태그 필터 표시
// ================================================================
interface ActiveTagFiltersProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearFilter: () => void;
}

function ActiveTagFilters({ selectedTags, onToggleTag, onClearFilter }: ActiveTagFiltersProps) {
  return (
    <div className="active-tag-filters">
      <span className="filter-label">필터:</span>
      {selectedTags.map(tag => (
        <span key={tag} className="active-tag">
          {tag}
          <button onClick={() => onToggleTag(tag)}>×</button>
        </span>
      ))}
      <button className="clear-all" onClick={onClearFilter}>모두 해제</button>
    </div>
  );
}

export default App;
