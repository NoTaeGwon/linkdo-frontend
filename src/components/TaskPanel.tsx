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
import { PRIORITY_RADIUS } from '../types';
import { CATEGORY_COLORS } from '../data/sampleData';

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
      // 이미 추가된 태그는 제외
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
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '320px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        overflow: 'hidden',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${categoryColor}40, ${categoryColor}20)`,
          padding: '20px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                background: categoryColor,
                borderRadius: '20px',
                fontSize: '11px',
                color: '#fff',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}
            >
              {selectedNode.category || 'General'}
            </div>
            
            {/* 제목 - 수정 모드 */}
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '16px',
                  fontWeight: '600',
                  outline: 'none',
                }}
                autoFocus
              />
            ) : (
              <h3
                style={{
                  color: '#f8fafc',
                  fontSize: '18px',
                  fontWeight: '700',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {selectedNode.title}
              </h3>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0,
              marginLeft: '12px',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ padding: '20px' }}>
        {/* 설명 - 수정 모드 */}
        {isEditing && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#64748b', 
              fontSize: '13px', 
              marginBottom: '8px' 
            }}>
              설명
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="설명을 입력하세요..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '60px',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* 설명 - 보기 모드 */}
        {selectedNode.description && !isEditing && (
          <p
            style={{
              color: '#cbd5e1',
              fontSize: '14px',
              lineHeight: 1.6,
              margin: '0 0 20px 0',
            }}
          >
            {selectedNode.description}
          </p>
        )}

        {/* 속성들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 상태 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>상태</span>
            {isEditing ? (
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                style={{
                  padding: '4px 12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '20px',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>우선순위</span>
            {isEditing ? (
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority)}
                style={{
                  padding: '4px 12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '20px',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
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

          {/* 노드 크기 */}
          {!isEditing && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>노드 크기</span>
              <span style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: '500' }}>
                r = {PRIORITY_RADIUS[selectedNode.priority]}px
              </span>
            </div>
          )}

          {/* ID */}
          {!isEditing && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>ID</span>
              <code
                style={{
                  color: '#94a3b8',
                  fontSize: '12px',
                  background: 'rgba(148, 163, 184, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {selectedNode.id.length > 15 
                  ? selectedNode.id.slice(0, 15) + '...' 
                  : selectedNode.id}
              </code>
            </div>
          )}
        </div>

        {/* 태그 섹션 */}
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        }}>
          <span style={{ color: '#64748b', fontSize: '13px', display: 'block', marginBottom: '10px' }}>
            🏷️ 태그
          </span>
          
          {/* 수정 모드: 태그 편집 */}
          {isEditing ? (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
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
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '6px',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '6px',
                    color: '#818cf8',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  추가
                </button>
              </div>
              {editTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {editTags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '12px',
                        color: '#a5b4fc',
                        fontSize: '11px',
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
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
                </div>
              )}

              {/* AI 태그 추천 버튼 */}
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={isLoadingSuggestions || !editTitle.trim() || !isApiAvailable}
                title={!isApiAvailable ? '서버에 연결되어 있지 않습니다' : ''}
                style={{
                  marginTop: '10px',
                  padding: '6px 12px',
                  background: !isApiAvailable
                    ? 'rgba(100, 116, 139, 0.2)'
                    : isLoadingSuggestions 
                      ? 'rgba(168, 85, 247, 0.3)' 
                      : 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
                  border: `1px solid ${!isApiAvailable ? 'rgba(100, 116, 139, 0.3)' : 'rgba(168, 85, 247, 0.4)'}`,
                  borderRadius: '6px',
                  color: !isApiAvailable ? '#64748b' : isLoadingSuggestions ? '#c084fc' : '#e879f9',
                  cursor: isLoadingSuggestions || !editTitle.trim() || !isApiAvailable ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: !editTitle.trim() || !isApiAvailable ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                }}
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
                <div style={{
                  marginTop: '6px',
                  padding: '6px 10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '11px',
                }}>
                  {suggestionError}
                </div>
              )}

              {/* 추천 태그 표시 */}
              {suggestedTags.length > 0 && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  borderRadius: '8px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}>
                    <span style={{ color: '#c084fc', fontSize: '11px', fontWeight: 500 }}>
                      ✨ 추천 태그
                    </span>
                    <button
                      type="button"
                      onClick={handleAddAllSuggestedTags}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#a78bfa',
                        fontSize: '10px',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      모두 추가
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {suggestedTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddSuggestedTag(tag)}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(168, 85, 247, 0.15)',
                          border: '1px dashed rgba(168, 85, 247, 0.4)',
                          borderRadius: '12px',
                          color: '#d8b4fe',
                          fontSize: '10px',
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
          ) : (
            /* 보기 모드: 태그 표시 */
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(selectedNode.tags && selectedNode.tags.length > 0) ? (
                selectedNode.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      padding: '4px 10px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px',
                      color: '#a5b4fc',
                      fontSize: '11px',
                    }}
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span style={{ color: '#64748b', fontSize: '12px' }}>
                  태그 없음
                </span>
              )}
            </div>
          )}
        </div>

        {/* 연결된 노드 섹션 */}
        {!isEditing && (
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                🔗 연결된 태스크 ({connectedNodeIds.length})
              </span>
              {!isDemoMode && onStartLinking && (
                <button
                  onClick={() => onStartLinking(selectedNode.id)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '6px',
                    color: '#818cf8',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  + 연결 추가
                </button>
              )}
            </div>
            
            {connectedNodeIds.length === 0 ? (
              <p style={{
                color: '#64748b',
                fontSize: '12px',
                textAlign: 'center',
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
              }}>
                연결된 태스크가 없습니다
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {connectedNodeIds.map(nodeId => {
                  const connectedTask = allTasks.find(t => t.id === nodeId);
                  if (!connectedTask) return null;
                  
                  const taskColor = CATEGORY_COLORS[connectedTask.category || 'planning'] || '#6366f1';
                  
                  return (
                    <div
                      key={nodeId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${taskColor}`,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: '#e2e8f0',
                          fontSize: '12px',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {connectedTask.title}
                        </div>
                        <div style={{
                          color: '#64748b',
                          fontSize: '10px',
                          marginTop: '2px',
                        }}>
                          {connectedTask.status === 'done' ? '✓ 완료' : 
                           connectedTask.status === 'in-progress' ? '● 진행중' : '○ 대기'}
                        </div>
                      </div>
                      {!isDemoMode && onDeleteEdge && (
                        <button
                          onClick={() => onDeleteEdge(nodeId)}
                          title="연결 해제"
                          style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            fontSize: '14px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            e.currentTarget.style.color = '#f87171';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#64748b';
                          }}
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
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        }}>
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editTitle.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#6366f1',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: editTitle.trim() ? 'pointer' : 'not-allowed',
                  opacity: editTitle.trim() ? 1 : 0.5,
                  transition: 'all 0.2s',
                }}
              >
                저장
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartEdit}
                disabled={isDemoMode}
                title={isDemoMode ? '데모 모드에서는 수정할 수 없습니다' : '수정'}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: isDemoMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid',
                  borderColor: isDemoMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(99, 102, 241, 0.3)',
                  borderRadius: '8px',
                  color: isDemoMode ? '#64748b' : '#818cf8',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: isDemoMode ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                ✏️ 수정
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={isDemoMode}
                title={isDemoMode ? '데모 모드에서는 삭제할 수 없습니다' : '삭제'}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: isDemoMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid',
                  borderColor: isDemoMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: isDemoMode ? '#64748b' : '#f87171',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: isDemoMode ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                🗑️ 삭제
              </button>
            </>
          )}
        </div>

        {/* 데모 모드 안내 */}
        {isDemoMode && !isEditing && (
          <p style={{
            color: '#64748b',
            fontSize: '11px',
            textAlign: 'center',
            marginTop: '12px',
          }}>
            데모 모드에서는 수정/삭제가 비활성화됩니다
          </p>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              background: '#1e293b',
              borderRadius: '16px',
              padding: '24px',
              width: '320px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ 
              color: '#f8fafc', 
              fontSize: '18px', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🗑️ 삭제 확인
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              이 태스크를 삭제하시겠습니까?
            </p>
            <p style={{ 
              color: '#e2e8f0', 
              fontSize: '15px', 
              fontWeight: '600',
              padding: '12px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              "{selectedNode.title}"
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    done: { bg: '#22c55e20', color: '#22c55e', label: '완료' },
    'in-progress': { bg: '#f59e0b20', color: '#f59e0b', label: '진행중' },
    todo: { bg: '#64748b20', color: '#94a3b8', label: '대기' },
  }[status] || { bg: '#64748b20', color: '#94a3b8', label: status };

  return (
    <span
      style={{
        background: config.bg,
        color: config.color,
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
      }}
    >
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    critical: { bg: '#ef444420', color: '#ef4444', label: '긴급' },
    high: { bg: '#f59e0b20', color: '#f59e0b', label: '높음' },
    medium: { bg: '#6366f120', color: '#818cf8', label: '중간' },
    low: { bg: '#64748b20', color: '#94a3b8', label: '낮음' },
  }[priority] || { bg: '#64748b20', color: '#94a3b8', label: priority };

  return (
    <span
      style={{
        background: config.bg,
        color: config.color,
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
      }}
    >
      {config.label}
    </span>
  );
}
