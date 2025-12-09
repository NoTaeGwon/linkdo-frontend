/**
 * ================================================================
 * 파일명       : SearchBar.tsx
 * 목적         : 태스크 검색 컴포넌트
 * 설명         : 
 *   - 태스크 이름으로 검색
 *   - 검색 결과 목록 표시
 *   - 클릭 시 해당 노드로 이동
 * ================================================================
 */

import { useState, useRef } from 'react';
import type { TaskNode } from '../types';

interface SearchBarProps {
  tasks: TaskNode[];
  onSelectTask: (task: TaskNode) => void;
}

export function SearchBar({ tasks, onSelectTask }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색어로 태스크 필터링
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(query.toLowerCase())
  );

  // 검색 결과 클릭 시
  const handleSelect = (task: TaskNode) => {
    onSelectTask(task);
    setQuery(''); // 검색어 초기화
    setIsOpen(false); // 결과 닫기
  };

  // 엔터키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredTasks.length > 0) {
      handleSelect(filteredTasks[0]); // 첫 번째 결과 선택
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  // 검색 결과 표시 여부
  const showResults = isOpen && query.length > 0;

  return (
    <div 
      className="search-bar" 
      ref={containerRef}
      onBlur={(e) => {
        // 컨테이너 내부 요소로 포커스가 이동하면 닫지 않음
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setIsOpen(false);
        }
      }}
    >
      {/* 검색 아이콘 */}
      <span className="search-icon">🔍</span>
      
      {/* 검색 입력 */}
      <input
        type="text"
        placeholder="태스크 검색..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {/* 검색 결과 목록 */}
      {showResults && (
        <ul className="search-results">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <li 
                key={task.id} 
                onMouseDown={(e) => {
                  e.preventDefault(); // blur 방지
                  handleSelect(task);
                }}
                className="search-result-item"
              >
                <span className="task-title">{task.title}</span>
                <span className={`task-status status-${task.status}`}>
                  {task.status === 'done' ? '✓' : task.status === 'in-progress' ? '●' : '○'}
                </span>
              </li>
            ))
          ) : (
            <li className="no-results">검색 결과가 없습니다</li>
          )}
        </ul>
      )}
    </div>
  );
}
