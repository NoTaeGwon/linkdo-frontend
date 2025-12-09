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

import { useState, useRef } from 'react';
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
  }) => {
    const newTask: TaskNode = {
      id: `task-${Date.now()}`,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      status: 'todo',
      category: 'general',
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
        <Graph 
          data={graphData} 
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
          onStartLinking={(nodeId) => setLinkingMode(nodeId)}
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
  onAdd: (data: { title: string; priority: Priority; description?: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd({
        title: title.trim(),
        priority,
        description: description.trim() || undefined,
      });
    }
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
