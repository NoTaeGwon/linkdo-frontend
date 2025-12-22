/**
 * ================================================================
 * 파일명       : TaskPanel.tsx
 * 목적         : 선택된 태스크 상세 정보 패널 컴포넌트
 * 설명         : 
 *   - 선택된 노드의 제목, 설명, 상태, 우선순위 표시
 *   - 태스크 수정/삭제 기능
 *   - 연결된 태스크 목록 표시
 *   - 연결 추가/삭제 버튼 제공
 *   - 데모 모드에서는 수정/삭제 비활성화
 * ================================================================
 */

import { useState, useEffect } from 'react';
import type { TaskNode, Priority, TaskStatus } from '../types';
import { CATEGORY_COLORS } from '../data/sampleData';
import { DatePicker } from './DatePicker';
import { StatusBadge, PriorityBadge, DueDateBadge } from './common';

interface TaskPanelProps {
  selectedNode: TaskNode | null;
  isDemoMode?: boolean;
  isApiAvailable?: boolean;
  allTasks?: TaskNode[];
  connectedNodeIds?: string[];
  onClose: () => void;
  onEdit?: (id: string, updates: Partial<TaskNode>) => void;
  onDelete?: (id: string) => void;
  onStartLinking?: (nodeId: string) => void;
  onDeleteEdge?: (targetId: string) => void;
}

export function TaskPanel({
  selectedNode,
  isDemoMode = false,
  isApiAvailable = false,
  allTasks = [],
  connectedNodeIds = [],
  onClose,
  onEdit,
  onDelete,
  onStartLinking,
  onDeleteEdge,
}: TaskPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editDueDate, setEditDueDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 태그 추천 관련 상태
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // selectedNode가 변경되면 수정 모드 종료
  useEffect(() => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [selectedNode?.id]);

  if (!selectedNode) return null;

  const categoryColor = CATEGORY_COLORS[selectedNode.category || 'planning'] || '#6366f1';

  // 수정 모드 시작
  const handleStartEdit = () => {
    setEditTitle(selectedNode.title);
    setEditDescription(selectedNode.description || '');
    setEditPriority(selectedNode.priority);
    setEditStatus(selectedNode.status);
    setEditTags(selectedNode.tags || []);
    setEditDueDate(selectedNode.dueDate || '');
    setTagInput('');
    setSuggestedTags([]);
    setSuggestionError(null);
    setIsEditing(true);
  };

  // 태그 추가
  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !editTags.includes(newTag)) {
      setEditTags([...editTags, newTag]);
      setTagInput('');
    }
  };

  // 태그 삭제
  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  // 태그 추천 요청
  const handleSuggestTags = async () => {
    if (!editTitle.trim()) {
      setSuggestionError('제목을 먼저 입력해주세요');
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    setSuggestedTags([]);

    try {
      const { suggestTags } = await import('../api');
      const suggestions = await suggestTags(editTitle.trim(), editDescription.trim());
      const newSuggestions = suggestions.filter(s => !editTags.includes(s));
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
    if (!editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
      setSuggestedTags(suggestedTags.filter(s => s !== tag));
    }
  };

  // 추천 태그 모두 추가
  const handleAddAllSuggestedTags = () => {
    const newTags = suggestedTags.filter(s => !editTags.includes(s));
    setEditTags([...editTags, ...newTags]);
    setSuggestedTags([]);
  };

  // 수정 저장
  const handleSaveEdit = () => {
    if (onEdit && editTitle.trim()) {
      onEdit(selectedNode.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
        status: editStatus,
        tags: editTags,
        dueDate: editDueDate || undefined,
      });
      setIsEditing(false);
    }
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // 삭제 확인 모달 열기
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  // 삭제 실행
  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(selectedNode.id);
    }
    setShowDeleteConfirm(false);
  };

  return (
    <div className="task-panel">
      {/* 헤더 */}
      <div
        className="task-panel-header"
        style={{
          background: `linear-gradient(135deg, ${categoryColor}40, ${categoryColor}20)`,
        }}
      >
        <div className="task-panel-header-content">
          <div className="task-panel-header-left">
            <div
              className="category-badge"
              style={{ background: categoryColor }}
            >
              {selectedNode.category || 'General'}
            </div>

            {/* 제목 - 수정 모드 */}
            {isEditing ? (
              <input
                type="text"
                className="edit-title-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <h3 className="task-title">{selectedNode.title}</h3>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
      </div>

      {/* 본문 */}
      <div className="task-panel-body">
        {/* 설명 - 수정 모드 */}
        {isEditing && (
          <div className="form-group">
            <label>설명</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="설명을 입력하세요..."
              rows={3}
            />
          </div>
        )}

        {/* 설명 - 보기 모드 */}
        {selectedNode.description && !isEditing && (
          <p className="task-description">{selectedNode.description}</p>
        )}

        {/* 속성들 */}
        <div className="task-properties">
          {/* 상태 */}
          <div className="property-row">
            <span className="property-label">상태</span>
            {isEditing ? (
              <select
                className="property-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
              >
                <option value="todo">대기</option>
                <option value="in-progress">진행중</option>
                <option value="done">완료</option>
              </select>
            ) : (
              <StatusBadge status={selectedNode.status} />
            )}
          </div>

          {/* 우선순위 */}
          <div className="property-row">
            <span className="property-label">우선순위</span>
            {isEditing ? (
              <select
                className="property-select"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority)}
              >
                <option value="low">낮음</option>
                <option value="medium">중간</option>
                <option value="high">높음</option>
                <option value="critical">긴급</option>
              </select>
            ) : (
              <PriorityBadge priority={selectedNode.priority} />
            )}
          </div>
        </div>

        {/* 태그 섹션 */}
        <div className="task-section">
          <span className="section-label">🏷️ 태그</span>

          {/* 수정 모드: 태그 편집 */}
          {isEditing ? (
            <div className="tag-editor">
              <div className="tag-input-row">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="태그 입력 후 Enter..."
                />
                <button type="button" onClick={handleAddTag}>추가</button>
              </div>
              {editTags.length > 0 && (
                <div className="tag-list">
                  {editTags.map(tag => (
                    <span key={tag} className="tag-chip editable">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* AI 태그 추천 버튼 */}
              <button
                type="button"
                className={`btn-ai-suggest small ${!isApiAvailable ? 'disabled' : ''}`}
                onClick={handleSuggestTags}
                disabled={isLoadingSuggestions || !editTitle.trim() || !isApiAvailable}
              >
                {!isApiAvailable ? (
                  <>📡 서버 연결 필요</>
                ) : isLoadingSuggestions ? (
                  <>⏳ AI 분석 중...</>
                ) : (
                  <>🪄 AI 태그 추천</>
                )}
              </button>

              {/* 에러 메시지 */}
              {suggestionError && (
                <div className="suggestion-error small">{suggestionError}</div>
              )}

              {/* 추천 태그 표시 */}
              {suggestedTags.length > 0 && (
                <div className="suggested-tags small">
                  <div className="suggested-tags-header">
                    <span>✨ 추천 태그</span>
                    <button type="button" onClick={handleAddAllSuggestedTags}>모두 추가</button>
                  </div>
                  <div className="suggested-tags-list">
                    {suggestedTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className="suggested-tag"
                        onClick={() => handleAddSuggestedTag(tag)}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 보기 모드: 태그 표시 */
            <div className="tag-list">
              {(selectedNode.tags && selectedNode.tags.length > 0) ? (
                selectedNode.tags.map(tag => (
                  <span key={tag} className="tag-chip">{tag}</span>
                ))
              ) : (
                <span className="empty-text">태그 없음</span>
              )}
            </div>
          )}
        </div>

        {/* 마감일 섹션 */}
        <div className="task-section">
          <span className="section-label">📅 마감일</span>
          {isEditing ? (
            <DatePicker
              value={editDueDate}
              onChange={setEditDueDate}
              placeholder="마감일을 선택하세요"
            />
          ) : (
            <DueDateBadge dueDate={selectedNode.dueDate} />
          )}
        </div>

        {/* 연결된 노드 섹션 */}
        {!isEditing && (
          <div className="task-section connected-tasks">
            <div className="section-header">
              <span className="section-label">🔗 연결된 태스크 ({connectedNodeIds.length})</span>
              {!isDemoMode && onStartLinking && (
                <button
                  className="btn-add-link"
                  onClick={() => onStartLinking(selectedNode.id)}
                >
                  + 연결 추가
                </button>
              )}
            </div>

            {connectedNodeIds.length === 0 ? (
              <p className="empty-text centered">연결된 태스크가 없습니다</p>
            ) : (
              <div className="connected-list">
                {connectedNodeIds.map(nodeId => {
                  const connectedTask = allTasks.find(t => t.id === nodeId);
                  if (!connectedTask) return null;

                  const taskColor = CATEGORY_COLORS[connectedTask.category || 'planning'] || '#6366f1';

                  return (
                    <div
                      key={nodeId}
                      className="connected-task-item"
                      style={{ borderLeftColor: taskColor }}
                    >
                      <div className="connected-task-info">
                        <div className="connected-task-title">{connectedTask.title}</div>
                        <div className="connected-task-status">
                          {connectedTask.status === 'done' ? '✓ 완료' :
                            connectedTask.status === 'in-progress' ? '● 진행중' : '○ 대기'}
                        </div>
                      </div>
                      {!isDemoMode && onDeleteEdge && (
                        <button
                          className="btn-delete-edge"
                          onClick={() => onDeleteEdge(nodeId)}
                          title="연결 해제"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="task-actions">
          {isEditing ? (
            <>
              <button className="btn-cancel" onClick={handleCancelEdit}>취소</button>
              <button
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={!editTitle.trim()}
              >
                저장
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn-edit ${isDemoMode ? 'disabled' : ''}`}
                onClick={handleStartEdit}
                disabled={isDemoMode}
                title={isDemoMode ? '데모 모드에서는 수정할 수 없습니다' : '수정'}
              >
                ✏️ 수정
              </button>
              <button
                className={`btn-delete ${isDemoMode ? 'disabled' : ''}`}
                onClick={handleDeleteClick}
                disabled={isDemoMode}
                title={isDemoMode ? '데모 모드에서는 삭제할 수 없습니다' : '삭제'}
              >
                🗑️ 삭제
              </button>
            </>
          )}
        </div>

        {/* 데모 모드 안내 */}
        {isDemoMode && !isEditing && (
          <p className="demo-notice">데모 모드에서는 수정/삭제가 비활성화됩니다</p>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>🗑️ 삭제 확인</h3>
            <p>이 태스크를 삭제하시겠습니까?</p>
            <p className="delete-task-title">"{selectedNode.title}"</p>
            <div className="delete-confirm-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>취소</button>
              <button className="btn-delete-confirm" onClick={handleConfirmDelete}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
