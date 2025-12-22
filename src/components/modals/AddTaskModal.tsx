/**
 * ================================================================
 * 파일명       : AddTaskModal.tsx
 * 목적         : 새 태스크 추가 / 데이터 관리 모달
 * 설명         : 
 *   - 탭 형태로 '새 태스크'와 '데이터 관리' 기능 제공
 *   - AI 태그 추천 기능 포함
 *   - 데이터 가져오기/내보내기 지원
 * ================================================================
 */

import { useState, useRef } from 'react';
import type { Priority } from '../../types';
import { DatePicker } from '../DatePicker';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (data: {
    title: string;
    priority: Priority;
    description?: string;
    tags?: string[];
    dueDate?: string;
  }) => void;
  isApiAvailable?: boolean;
  onExport: () => void;
  onImport: (file: File, mode: 'replace' | 'merge') => Promise<{ success: boolean; message: string }>;
}

export function AddTaskModal({
  onClose,
  onAdd,
  isApiAvailable = false,
  onExport,
  onImport,
}: AddTaskModalProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'data'>('add');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dueDate, setDueDate] = useState('');

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
        dueDate: dueDate || undefined,
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
      const { suggestTags } = await import('../../api');
      const suggestions = await suggestTags(title.trim(), description.trim());
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
      // 성공 시 잠시 후 모달 닫기
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const priorityOptions = [
    { value: 'low', label: '낮음', color: '#64748b' },
    { value: 'medium', label: '중간', color: '#818cf8' },
    { value: 'high', label: '높음', color: '#f59e0b' },
    { value: 'critical', label: '긴급', color: '#ef4444' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        {/* 탭 헤더 */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            ➕ 새 태스크
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'data' ? 'active data' : ''}`}
            onClick={() => setActiveTab('data')}
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
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`priority-option ${priority === option.value ? 'selected' : ''}`}
                    onClick={() => setPriority(option.value as Priority)}
                    style={{ '--priority-color': option.color } as React.CSSProperties}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 태그 */}
            <div className="form-group">
              <label>태그 (선택)</label>
              <div className="tag-input-row">
                <input
                  type="text"
                  placeholder="태그 입력 후 Enter..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={handleAddTag}
                />
                <button type="button" className="btn-tag-add" onClick={handleAddTag}>
                  추가
                </button>
              </div>

              {/* 태그 목록 */}
              {tags.length > 0 && (
                <div className="tag-list">
                  {tags.map(tag => (
                    <span key={tag} className="tag-chip">
                      🏷️ {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* AI 태그 추천 버튼 */}
              <button
                type="button"
                className={`btn-ai-suggest ${!isApiAvailable ? 'disabled' : ''}`}
                onClick={handleSuggestTags}
                disabled={isLoadingSuggestions || !title.trim() || !isApiAvailable}
                title={!isApiAvailable ? '서버에 연결되어 있지 않습니다' : ''}
              >
                {!isApiAvailable ? (
                  <>📡 서버 연결 필요</>
                ) : isLoadingSuggestions ? (
                  <>⏳ AI가 분석 중...</>
                ) : (
                  <>🪄 AI 태그 추천</>
                )}
              </button>

              {/* 에러 메시지 */}
              {suggestionError && (
                <div className="suggestion-error">{suggestionError}</div>
              )}

              {/* 추천 태그 표시 */}
              {suggestedTags.length > 0 && (
                <div className="suggested-tags">
                  <div className="suggested-tags-header">
                    <span>✨ 추천 태그 (클릭하여 추가)</span>
                    <button type="button" onClick={handleAddAllSuggestedTags}>
                      모두 추가
                    </button>
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

            {/* 마감일 */}
            <div className="form-group">
              <label>마감일 (선택)</label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="마감일을 선택하세요"
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
            <div className="data-section export">
              <h3>📤 데이터 내보내기</h3>
              <p>현재 모든 태스크와 연결 정보를 JSON 파일로 저장합니다.</p>
              <button
                type="button"
                className="btn-export"
                onClick={() => {
                  onExport();
                  setImportMessage({ type: 'success', text: '데이터를 내보냈습니다!' });
                }}
              >
                📤 JSON 파일로 내보내기
              </button>
            </div>

            {/* 가져오기 섹션 */}
            <div className="data-section import">
              <h3>📥 데이터 가져오기</h3>
              <p>JSON 파일에서 태스크를 불러옵니다.</p>

              {/* 파일 선택 */}
              <div className="file-select">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()}>
                  📁 파일 선택
                </button>
                {selectedFile && <span className="file-name">{selectedFile.name}</span>}
              </div>

              {/* 가져오기 옵션 */}
              {selectedFile && (
                <div className="import-options">
                  <button
                    type="button"
                    className="btn-import-replace"
                    onClick={() => handleImportAction('replace')}
                  >
                    🔄 덮어쓰기
                    <span>기존 데이터 삭제 후 교체</span>
                  </button>
                  <button
                    type="button"
                    className="btn-import-merge"
                    onClick={() => handleImportAction('merge')}
                  >
                    ➕ 병합하기
                    <span>기존 데이터 유지 + 추가</span>
                  </button>
                </div>
              )}

              {/* 메시지 표시 */}
              {importMessage && (
                <div className={`import-message ${importMessage.type}`}>
                  {importMessage.type === 'success' ? '✅' : '❌'} {importMessage.text}
                </div>
              )}
            </div>

            <div className="modal-actions">
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

