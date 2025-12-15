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
import { useTaskStore } from './hooks/useTaskStore';
import type { TaskNode, Priority } from './types';
import { TOAST_DURATION, TASK_SELECT_DELAY } from './constants';
import './styles/global.css';

function App() {
  const [selectedNode, setSelectedNode] = useState<TaskNode | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, pan: { x: 0, y: 0 } });
  const [linkingMode, setLinkingMode] = useState<string | null>(null); // 연결 모드: 시작 노드 ID
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 태그 필터
  const [showTagFilter, setShowTagFilter] = useState(false); // 태그 필터 드롭다운 표시
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // useTaskStore 훅 사용
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

  // 자동정렬 관련 상태
  const [showAutoArrangeModal, setShowAutoArrangeModal] = useState(false);
  const [isAutoArranging, setIsAutoArranging] = useState(false);
  const [autoArrangeProgress, setAutoArrangeProgress] = useState({ current: 0, total: 0, taskTitle: '' });

  // 전체 태그 목록 추출
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(task => {
      (task.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [tasks]);

  // 태그 필터링된 그래프 데이터
  const filteredGraphData = useMemo(() => {
    if (selectedTags.length === 0) {
      return graphData;
    }
    
    // 선택된 태그를 포함하는 태스크만 필터링
    const filteredNodes = graphData.nodes.filter(node => 
      selectedTags.some(tag => (node.tags || []).includes(tag))
    );
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    
    // 필터링된 노드들 사이의 엣지만 유지
    const filteredEdges = graphData.edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, selectedTags]);

  // 태그 토글
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // 모든 태그 필터 해제
  const clearTagFilter = () => {
    setSelectedTags([]);
  };

  // 태그 필터 드롭다운 외부 클릭 시 닫기
  const tagFilterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagFilterRef.current && !tagFilterRef.current.contains(event.target as Node)) {
        setShowTagFilter(false);
      }
    };
    
    if (showTagFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTagFilter]);

  // 로딩 중
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

  // 새 태스크 추가 핸들러
  const handleAddTask = async (taskData: { 
    title: string; 
    priority: Priority; 
    description?: string;
    tags?: string[];
  }) => {
    const newTask: TaskNode = {
      id: `task-${Date.now()}`,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      status: 'todo',
      category: 'general',
      tags: taskData.tags || [],
    };
    await addTask(newTask);
    setShowAddModal(false);
    
    // 새 태스크를 선택 (시뮬레이션이 안정화될 때까지 대기)
    // 참고: 위치 계산은 addTask 내에서 createTaskWithPosition API로 처리됨
    setTimeout(() => {
      setSelectedNode(newTask);
    }, TASK_SELECT_DELAY);
  };

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
          {/* 태그 필터 */}
          <div ref={tagFilterRef} className="tag-filter-container" style={{ position: 'relative' }}>
            <button 
              className={`btn-icon ${selectedTags.length > 0 ? 'active' : ''}`}
              onClick={() => setShowTagFilter(!showTagFilter)}
              title="태그 필터"
              style={{
                background: selectedTags.length > 0 ? 'rgba(99, 102, 241, 0.3)' : undefined,
                borderColor: selectedTags.length > 0 ? 'rgba(99, 102, 241, 0.5)' : undefined,
              }}
            >
              🏷️ {selectedTags.length > 0 && <span style={{ 
                fontSize: '10px', 
                background: '#6366f1', 
                borderRadius: '10px', 
                padding: '1px 6px',
                marginLeft: '4px',
              }}>{selectedTags.length}</span>}
            </button>
            
            {/* 태그 필터 드롭다운 */}
            {showTagFilter && (
              <div 
                className="tag-filter-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '12px',
                  minWidth: '220px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '10px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                }}>
                  <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                    태그 필터
                  </span>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={clearTagFilter}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f87171',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      모두 해제
                    </button>
                  )}
                </div>
                
                {allTags.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '10px' }}>
                    태그가 없습니다
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          background: selectedTags.includes(tag) 
                            ? 'rgba(99, 102, 241, 0.3)' 
                            : 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid',
                          borderColor: selectedTags.includes(tag)
                            ? 'rgba(99, 102, 241, 0.5)'
                            : 'transparent',
                          borderRadius: '8px',
                          color: selectedTags.includes(tag) ? '#a5b4fc' : '#cbd5e1',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ 
                          width: '16px', 
                          height: '16px',
                          borderRadius: '4px',
                          border: '2px solid',
                          borderColor: selectedTags.includes(tag) ? '#6366f1' : '#64748b',
                          background: selectedTags.includes(tag) ? '#6366f1' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: '#fff',
                        }}>
                          {selectedTags.includes(tag) && '✓'}
                        </span>
                        {tag}
                        <span style={{ 
                          marginLeft: 'auto', 
                          color: '#64748b', 
                          fontSize: '10px' 
                        }}>
                          {tasks.filter(t => (t.tags || []).includes(tag)).length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 검색 바 */}
          <SearchBar 
            tasks={tasks} 
            onSelectTask={(task) => setSelectedNode(task)} 
          />

          <button 
            className="btn-secondary"
            onClick={() => setShowAddModal(true)}
          >
            <span>+</span> Add Task
          </button>

          {/* 자동정렬 버튼 */}
          <button 
            className="btn-secondary"
            onClick={() => setShowAutoArrangeModal(true)}
            disabled={!isApiAvailable || tasks.length < 2}
            title={!isApiAvailable ? '서버 연결 필요' : tasks.length < 2 ? '태스크가 2개 이상 필요합니다' : 'PCA 기반 자동 배치'}
            style={{
              opacity: (!isApiAvailable || tasks.length < 2) ? 0.5 : 1,
              cursor: (!isApiAvailable || tasks.length < 2) ? 'not-allowed' : 'pointer',
            }}
          >
            <span>📍</span> 자동정렬
          </button>
        </div>
      </header>

      {/* 메인 그래프 영역 */}
      <main className="main">
        {/* 태그 필터 활성화 시 표시 */}
        {selectedTags.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '20px',
            zIndex: 100,
          }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>필터:</span>
            {selectedTags.map(tag => (
              <span
                key={tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '12px',
                  color: '#a5b4fc',
                  fontSize: '11px',
                }}
              >
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0',
                    fontSize: '12px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={clearTagFilter}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '11px',
                cursor: 'pointer',
                marginLeft: '4px',
              }}
            >
              모두 해제
            </button>
          </div>
        )}

        <Graph 
          data={filteredGraphData} 
          selectedNodeId={selectedNode?.id || null}
          onNodeSelect={(node) => {
            // 연결 모드일 때
            if (linkingMode && node && node.id !== linkingMode) {
              addEdge(linkingMode, node.id);
              setLinkingMode(null); // 연결 모드 종료
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
            // 선택된 노드 정보도 업데이트
            if (selectedNode && selectedNode.id === id) {
              setSelectedNode({ ...selectedNode, ...updates });
            }
          }}
          onDelete={(id) => {
            setSelectedNode(null);  // 먼저 선택 해제 (블러 제거)
            deleteTask(id);         // 그 다음 삭제
          }}
          onStartLinking={(nodeId) => {
            setLinkingMode(nodeId);
            setSelectedNode(null);  // 패널 닫기 (블러 제거)
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
      {toastMessage && (
        <div className="toast-message">
          {toastMessage}
        </div>
      )}

      {/* Add Task 모달 (탭: 새 태스크 / 데이터 관리) */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTask}
          isApiAvailable={isApiAvailable}
          onExport={exportData}
          onImport={async (file, mode) => {
            const result = await importData(file, mode);
            if (result.success) {
              setToastMessage(result.message);
              setTimeout(() => setToastMessage(null), TOAST_DURATION);
            }
            return result;
          }}
        />
      )}

      {/* 자동정렬 확인 모달 */}
      {showAutoArrangeModal && (
        <AutoArrangeModal
          onClose={() => setShowAutoArrangeModal(false)}
          onArrange={async () => {
            setShowAutoArrangeModal(false);
            setIsAutoArranging(true);
            setAutoArrangeProgress({ current: 0, total: 100, taskTitle: '' });
            
            try {
              const result = await autoArrange(
                (current, total, message) => {
                  setAutoArrangeProgress({ current, total, taskTitle: message });
                }
              );
              const message = `✅ 자동정렬 완료: ${result.updated}개 태스크 위치 업데이트`;
              setToastMessage(message);
              setTimeout(() => setToastMessage(null), TOAST_DURATION);
            } catch (error) {
              console.error('자동정렬 실패:', error);
              setToastMessage(`❌ 자동정렬 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
              setTimeout(() => setToastMessage(null), TOAST_DURATION);
            } finally {
              setIsAutoArranging(false);
            }
          }}
        />
      )}

      {/* 자동정렬 로딩 오버레이 */}
      {isAutoArranging && (
        <LoadingOverlay
          current={autoArrangeProgress.current}
          total={autoArrangeProgress.total}
          taskTitle={autoArrangeProgress.taskTitle}
        />
      )}
    </div>
  );
}

// Add Task 모달 컴포넌트 (탭 형태: 새 태스크 / 데이터 관리)
function AddTaskModal({ 
  onClose, 
  onAdd,
  isApiAvailable = false,
  onExport,
  onImport,
}: { 
  onClose: () => void; 
  onAdd: (data: { title: string; priority: Priority; description?: string; tags?: string[] }) => void;
  isApiAvailable?: boolean;
  onExport: () => void;
  onImport: (file: File, mode: 'replace' | 'merge') => Promise<{ success: boolean; message: string }>;
}) {
  const [activeTab, setActiveTab] = useState<'add' | 'data'>('add');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // 태그 추천 관련 상태
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // 데이터 관리 탭 상태
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd({
        title: title.trim(),
        priority,
        description: description.trim() || undefined,
        tags,
      });
    }
  };

  // 태그 추가 핸들러
  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput('');
    }
  };

  // 태그 입력 시 Enter 또는 콤마로 추가
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 태그 삭제
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 태그 추천 요청
  const handleSuggestTags = async () => {
    if (!title.trim()) {
      setSuggestionError('제목을 먼저 입력해주세요');
      return;
    }
    
    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    setSuggestedTags([]);
    
    try {
      const { suggestTags } = await import('./api');
      const suggestions = await suggestTags(title.trim(), description.trim());
      // 이미 추가된 태그는 제외
      const newSuggestions = suggestions.filter(s => !tags.includes(s));
      setSuggestedTags(newSuggestions);
      
      if (newSuggestions.length === 0 && suggestions.length > 0) {
        setSuggestionError('추천된 태그가 모두 이미 추가되어 있습니다');
      }
    } catch (error) {
      console.error('태그 추천 실패:', error);
      setSuggestionError('태그 추천에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // 추천 태그 추가
  const handleAddSuggestedTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
      setSuggestedTags(suggestedTags.filter(s => s !== tag));
    }
  };

  // 추천 태그 모두 추가
  const handleAddAllSuggestedTags = () => {
    const newTags = suggestedTags.filter(s => !tags.includes(s));
    setTags([...tags, ...newTags]);
    setSuggestedTags([]);
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportMessage(null);
    }
  };

  // 가져오기 실행
  const handleImportAction = async (mode: 'replace' | 'merge') => {
    if (!selectedFile) return;
    
    const result = await onImport(selectedFile, mode);
    setImportMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });
    
    if (result.success) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        {/* 탭 헤더 */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          paddingBottom: '12px',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'add' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: '1px solid',
              borderColor: activeTab === 'add' ? 'rgba(99, 102, 241, 0.4)' : 'transparent',
              borderRadius: '8px',
              color: activeTab === 'add' ? '#a5b4fc' : '#64748b',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'add' ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            ➕ 새 태스크
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'data' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              border: '1px solid',
              borderColor: activeTab === 'data' ? 'rgba(34, 197, 94, 0.4)' : 'transparent',
              borderRadius: '8px',
              color: activeTab === 'data' ? '#4ade80' : '#64748b',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'data' ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            📂 데이터 관리
          </button>
        </div>

        {/* 새 태스크 탭 */}
        {activeTab === 'add' && (
        <form onSubmit={handleSubmit}>
          {/* 제목 */}
          <div className="form-group">
            <label>제목 *</label>
            <input
              type="text"
              placeholder="할 일을 입력하세요..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* 우선순위 */}
          <div className="form-group">
            <label>우선순위</label>
            <div className="priority-selector">
              {[
                { value: 'low', label: '낮음', color: '#64748b' },
                { value: 'medium', label: '중간', color: '#818cf8' },
                { value: 'high', label: '높음', color: '#f59e0b' },
                { value: 'critical', label: '긴급', color: '#ef4444' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`priority-option ${priority === option.value ? 'selected' : ''}`}
                  onClick={() => setPriority(option.value as Priority)}
                  style={{
                    '--priority-color': option.color,
                  } as React.CSSProperties}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 태그 */}
          <div className="form-group">
            <label>태그 (선택)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="태그 입력 후 Enter..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={handleAddTag}
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                onClick={handleAddTag}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '8px',
                  color: '#818cf8',
                  cursor: 'pointer',
                }}
              >
                추가
              </button>
            </div>
            {/* 태그 목록 */}
            {tags.length > 0 && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '6px', 
                marginTop: '10px' 
              }}>
                {tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '20px',
                      color: '#a5b4fc',
                      fontSize: '12px',
                    }}
                  >
                    🏷️ {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '0 2px',
                        fontSize: '14px',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* AI 태그 추천 버튼 */}
            <button
              type="button"
              onClick={handleSuggestTags}
              disabled={isLoadingSuggestions || !title.trim() || !isApiAvailable}
              title={!isApiAvailable ? '서버에 연결되어 있지 않습니다' : ''}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                background: !isApiAvailable
                  ? 'rgba(100, 116, 139, 0.2)'
                  : isLoadingSuggestions 
                    ? 'rgba(168, 85, 247, 0.3)' 
                    : 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
                border: `1px solid ${!isApiAvailable ? 'rgba(100, 116, 139, 0.3)' : 'rgba(168, 85, 247, 0.4)'}`,
                borderRadius: '8px',
                color: !isApiAvailable ? '#64748b' : isLoadingSuggestions ? '#c084fc' : '#e879f9',
                cursor: isLoadingSuggestions || !title.trim() || !isApiAvailable ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: !title.trim() || !isApiAvailable ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {!isApiAvailable ? (
                <>
                  📡 서버 연결 필요
                </>
              ) : isLoadingSuggestions ? (
                <>
                  <span style={{ 
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                  }}>⏳</span>
                  AI가 분석 중...
                </>
              ) : (
                <>
                  🪄 AI 태그 추천
                </>
              )}
            </button>

            {/* 에러 메시지 */}
            {suggestionError && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '12px',
              }}>
                {suggestionError}
              </div>
            )}

            {/* 추천 태그 표시 */}
            {suggestedTags.length > 0 && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '10px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <span style={{ 
                    color: '#c084fc', 
                    fontSize: '12px',
                    fontWeight: 500,
                  }}>
                    ✨ 추천 태그 (클릭하여 추가)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddAllSuggestedTags}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a78bfa',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    모두 추가
                  </button>
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px',
                }}>
                  {suggestedTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddSuggestedTag(tag)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 12px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        border: '1px dashed rgba(168, 85, 247, 0.4)',
                        borderRadius: '20px',
                        color: '#d8b4fe',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.3)';
                        e.currentTarget.style.borderStyle = 'solid';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
                        e.currentTarget.style.borderStyle = 'dashed';
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 설명 */}
          <div className="form-group">
            <label>설명 (선택)</label>
            <textarea
              placeholder="상세 설명을 입력하세요..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              추가
            </button>
          </div>
        </form>
        )}

        {/* 데이터 관리 탭 */}
        {activeTab === 'data' && (
          <div>
            {/* 내보내기 섹션 */}
            <div style={{
              padding: '20px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              <h3 style={{ color: '#a5b4fc', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📤 데이터 내보내기
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                현재 모든 태스크와 연결 정보를 JSON 파일로 저장합니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  onExport();
                  setImportMessage({ type: 'success', text: '데이터를 내보냈습니다!' });
                }}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                📤 JSON 파일로 내보내기
              </button>
            </div>

            {/* 가져오기 섹션 */}
            <div style={{
              padding: '20px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: '#4ade80', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📥 데이터 가져오기
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                JSON 파일에서 태스크를 불러옵니다.
              </p>

              {/* 파일 선택 */}
              <div style={{ marginBottom: '16px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '8px',
                    color: '#4ade80',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  📁 파일 선택
                </button>
                {selectedFile && (
                  <span style={{ marginLeft: '12px', color: '#e2e8f0', fontSize: '13px' }}>
                    {selectedFile.name}
                  </span>
                )}
              </div>

              {/* 가져오기 옵션 */}
              {selectedFile && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleImportAction('replace')}
                    style={{
                      padding: '12px 20px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: '#f87171',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    🔄 덮어쓰기
                    <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      기존 데이터 삭제 후 교체
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImportAction('merge')}
                    style={{
                      padding: '12px 20px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '8px',
                      color: '#4ade80',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    ➕ 병합하기
                    <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      기존 데이터 유지 + 추가
                    </span>
                  </button>
                </div>
              )}

              {/* 메시지 표시 */}
              {importMessage && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: importMessage.type === 'success' 
                    ? 'rgba(34, 197, 94, 0.1)' 
                    : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${importMessage.type === 'success' 
                    ? 'rgba(34, 197, 94, 0.3)' 
                    : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '8px',
                  color: importMessage.type === 'success' ? '#4ade80' : '#f87171',
                  fontSize: '13px',
                }}>
                  {importMessage.type === 'success' ? '✅' : '❌'} {importMessage.text}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-cancel" onClick={onClose}>
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 자동정렬 확인 모달 컴포넌트
function AutoArrangeModal({
  onClose,
  onArrange,
}: {
  onClose: () => void;
  onArrange: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>📍 자동정렬</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          PCA 기반으로 태스크를 자동 배치합니다
        </p>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
          의미적으로 유사한 태스크들이 가까운 위치에 배치됩니다
        </p>
        
        <div style={{ 
          padding: '16px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '10px',
          marginBottom: '20px',
        }}>
          <div style={{ color: '#a5b4fc', fontSize: '13px', marginBottom: '8px' }}>
            ℹ️ 안내
          </div>
          <ul style={{ color: '#94a3b8', fontSize: '12px', paddingLeft: '20px', margin: 0 }}>
            <li style={{ marginBottom: '4px' }}>임베딩 기반 PCA 분석으로 좌표를 계산합니다</li>
            <li style={{ marginBottom: '4px' }}>엣지(연결선)는 태스크 생성 시 자동으로 연결됩니다</li>
            <li>기존 연결은 그대로 유지됩니다</li>
          </ul>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            취소
          </button>
          <button 
            className="btn-primary" 
            onClick={onArrange}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            }}
          >
            🔄 자동정렬 실행
          </button>
        </div>
      </div>
    </div>
  );
}

// 로딩 오버레이 컴포넌트
function LoadingOverlay({
  current,
  total,
  taskTitle,
}: {
  current: number;
  total: number;
  taskTitle: string;
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      {/* 스피너 */}
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid rgba(99, 102, 241, 0.3)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '24px',
      }} />
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* 제목 */}
      <h2 style={{
        color: '#e2e8f0',
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '16px',
      }}>
        📍 자동정렬 진행 중...
      </h2>
      
      {/* 진행률 바 */}
      <div style={{
        width: '300px',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '12px',
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      
      {/* 진행률 텍스트 */}
      <p style={{
        color: '#a5b4fc',
        fontSize: '16px',
        fontWeight: '500',
        marginBottom: '8px',
      }}>
        {current} / {total} ({percentage}%)
      </p>
      
      {/* 현재 처리 중인 태스크 */}
      {taskTitle && (
        <p style={{
          color: '#64748b',
          fontSize: '14px',
          maxWidth: '300px',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          "{taskTitle}" 분석 중...
        </p>
      )}
    </div>
  );
}

export default App;
