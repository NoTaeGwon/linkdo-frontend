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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // useTaskStore 훅 사용
  const { 
    graphData, 
    isLoading, 
    isDemoMode, 
    tasks,
    addTask, 
    updateTask, 
    deleteTask,
    addEdge,
    deleteEdge,
    getConnectedNodeIds,
    exportData,
    importData,
  } = useTaskStore();

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

  // 파일 선택 시 모달 표시
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setShowImportModal(true);
    
    // 파일 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 가져오기 실행
  const handleImport = async (mode: 'replace' | 'merge') => {
    if (!pendingFile) return;

    const result = await importData(pendingFile, mode);
    setImportMessage(result.message);
    
    // 토스트 메시지 자동 제거
    setTimeout(() => setImportMessage(null), TOAST_DURATION);
    
    // 정리
    setPendingFile(null);
    setShowImportModal(false);
  };

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
          
          {/* 백업/복원 버튼 */}
          <div className="backup-buttons">
            <button 
              className="btn-icon"
              onClick={exportData}
              title="데이터 내보내기 (백업)"
            >
              📤
            </button>
            <button 
              className="btn-icon"
              onClick={() => fileInputRef.current?.click()}
              title="데이터 가져오기 (복원)"
            >
              📥
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          <button 
            className="btn-secondary"
            onClick={() => setShowAddModal(true)}
          >
            <span>+</span> Add Task
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

      {/* Import 메시지 */}
      {importMessage && (
        <div className="toast-message">
          {importMessage}
        </div>
      )}

      {/* Add Task 모달 */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTask}
        />
      )}

      {/* Import 선택 모달 */}
      {showImportModal && (
        <ImportModal
          fileName={pendingFile?.name || ''}
          onReplace={() => handleImport('replace')}
          onMerge={() => handleImport('merge')}
          onClose={() => {
            setShowImportModal(false);
            setPendingFile(null);
          }}
        />
      )}
    </div>
  );
}

// Add Task 모달 컴포넌트
function AddTaskModal({ 
  onClose, 
  onAdd 
}: { 
  onClose: () => void; 
  onAdd: (data: { title: string; priority: Priority; description?: string; tags?: string[] }) => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <h2>새 할 일 추가</h2>
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
      </div>
    </div>
  );
}

// Import 선택 모달 컴포넌트
function ImportModal({
  fileName,
  onReplace,
  onMerge,
  onClose,
}: {
  fileName: string;
  onReplace: () => void;
  onMerge: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>📥 데이터 가져오기</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          파일: <strong style={{ color: '#e2e8f0' }}>{fileName}</strong>
        </p>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
          가져오기 방식을 선택하세요
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={onReplace}
            style={{
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ color: '#f87171', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
              🔄 덮어쓰기
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
              기존 데이터를 삭제하고 새 데이터로 교체합니다
            </div>
          </button>

          <button
            onClick={onMerge}
            style={{
              padding: '16px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ color: '#4ade80', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
              ➕ 병합하기
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
              기존 데이터를 유지하고 새 데이터를 추가합니다
            </div>
          </button>
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="btn-cancel" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
