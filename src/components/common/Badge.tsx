/**
 * ================================================================
 * 파일명       : Badge.tsx
 * 목적         : 공통 뱃지 컴포넌트
 * 설명         : 
 *   - StatusBadge: 상태 표시 (완료, 진행중, 대기)
 *   - PriorityBadge: 우선순위 표시 (긴급, 높음, 중간, 낮음)
 *   - DueDateBadge: 마감일 표시 (D-day 계산)
 * ================================================================
 */

import type { Priority, TaskStatus } from '../../types';

// ================================================================
// 상태 뱃지
// ================================================================

const STATUS_CONFIG: Record<TaskStatus, { bg: string; color: string; label: string }> = {
  done: { bg: '#22c55e20', color: '#22c55e', label: '완료' },
  'in-progress': { bg: '#f59e0b20', color: '#f59e0b', label: '진행중' },
  todo: { bg: '#64748b20', color: '#94a3b8', label: '대기' },
};

interface StatusBadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.todo;

  return (
    <span
      className="badge"
      style={{
        background: config.bg,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}

// ================================================================
// 우선순위 뱃지
// ================================================================

const PRIORITY_CONFIG: Record<Priority, { bg: string; color: string; label: string }> = {
  critical: { bg: '#ef444420', color: '#ef4444', label: '긴급' },
  high: { bg: '#f59e0b20', color: '#f59e0b', label: '높음' },
  medium: { bg: '#6366f120', color: '#818cf8', label: '중간' },
  low: { bg: '#64748b20', color: '#94a3b8', label: '낮음' },
};

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  return (
    <span
      className="badge"
      style={{
        background: config.bg,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}

// ================================================================
// 마감일 뱃지
// ================================================================

interface DueDateBadgeProps {
  dueDate?: string;
}

export function DueDateBadge({ dueDate }: DueDateBadgeProps) {
  if (!dueDate) {
    return <span className="badge-empty">설정 안됨</span>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let config = { bg: '#64748b20', color: '#94a3b8', label: `D-${diffDays}` };

  if (diffDays < 0) {
    config = { bg: '#ef444420', color: '#ef4444', label: `기한 ${Math.abs(diffDays)}일 지남` };
  } else if (diffDays === 0) {
    config = { bg: '#f59e0b20', color: '#f59e0b', label: '오늘 마감' };
  } else if (diffDays <= 3) {
    config = { bg: '#f9731620', color: '#f97316', label: `D-${diffDays}` };
  } else {
    config = { bg: '#6366f120', color: '#818cf8', label: dueDate };
  }

  return (
    <span
      className="badge badge-duedate"
      style={{
        background: config.bg,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}

