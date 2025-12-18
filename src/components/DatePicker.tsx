/**
 * ================================================================
 * 파일명       : DatePicker.tsx
 * 목적         : 커스텀 날짜 선택 컴포넌트
 * 설명         : 
 *   - 드롭다운 달력으로 날짜 선택
 *   - 다크 테마 스타일 적용
 *   - 월 이동, 날짜 선택, 초기화 기능
 *   - React Portal로 DOM 계층 밖에서 렌더링
 * ================================================================
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
}

export function DatePicker({ value, onChange, placeholder = '날짜 선택' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const date = new Date(value);
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const inputRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 위치 계산
  const calculatePosition = useCallback(() => {
    if (!inputRef.current) return;

    const inputRect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 380;
    const dropdownWidth = 290;
    const padding = 8;

    // 화면 아래 공간 확인
    const spaceBelow = window.innerHeight - inputRect.bottom;
    const openUpward = spaceBelow < dropdownHeight && inputRect.top > dropdownHeight;

    // 좌우 위치 조정
    let left = inputRect.left;
    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    const top = openUpward
      ? inputRect.top - dropdownHeight - 4
      : inputRect.bottom + 4;

    setDropdownPosition({ top: Math.max(padding, top), left });
  }, []);

  // 열릴 때 위치 계산
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
    }
    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, calculatePosition]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (inputRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    // 다음 틱에서 이벤트 리스너 추가 (열리는 클릭이 바로 닫히는 것 방지)
    requestAnimationFrame(() => {
      document.addEventListener('click', handleClickOutside, true);
    });

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isOpen]);

  // 달력 데이터 생성
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const handleDateSelect = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() === today.getMonth() &&
      day === today.getDate()
    );
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const selected = new Date(value);
    return (
      currentMonth.getFullYear() === selected.getFullYear() &&
      currentMonth.getMonth() === selected.getMonth() &&
      day === selected.getDate()
    );
  };

  const handleInputClick = () => {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  // 달력 드롭다운 컴포넌트
  const calendarDropdown = isOpen ? (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 99999,
        background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        width: '290px',
      }}
    >
      {/* 헤더: 월 이동 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          padding: '0 4px',
        }}
      >
        <button
          onClick={handlePrevMonth}
          type="button"
          style={{
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '6px',
            color: '#818cf8',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ◀
        </button>
        <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>
          {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
        </span>
        <button
          onClick={handleNextMonth}
          type="button"
          style={{
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '6px',
            color: '#818cf8',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ▶
        </button>
      </div>

      {/* 요일 헤더 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          marginBottom: '8px',
        }}
      >
        {weekDays.map((day, index) => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              padding: '6px',
              color: index === 0 ? '#f87171' : index === 6 ? '#60a5fa' : '#94a3b8',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
        }}
      >
        {days.map((day, index) => (
          <div
            key={index}
            onClick={() => day && handleDateSelect(day)}
            style={{
              textAlign: 'center',
              padding: '8px',
              borderRadius: '6px',
              cursor: day ? 'pointer' : 'default',
              background: day && isSelected(day)
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : day && isToday(day)
                ? 'rgba(99, 102, 241, 0.2)'
                : 'transparent',
              color: day
                ? isSelected(day)
                  ? '#fff'
                  : index % 7 === 0
                  ? '#f87171'
                  : index % 7 === 6
                  ? '#60a5fa'
                  : '#e2e8f0'
                : 'transparent',
              fontSize: '13px',
              fontWeight: (day && (isSelected(day) || isToday(day))) ? '600' : '400',
              transition: 'all 0.15s ease',
              border: (day && isToday(day) && !isSelected(day))
                ? '1px solid rgba(99, 102, 241, 0.5)'
                : '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (day && !isSelected(day)) {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (day && !isSelected(day)) {
                e.currentTarget.style.background = isToday(day)
                  ? 'rgba(99, 102, 241, 0.2)'
                  : 'transparent';
              }
            }}
          >
            {day || ''}
          </div>
        ))}
      </div>

      {/* 버튼 */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const today = new Date();
            setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            onChange(`${year}-${month}-${day}`);
            setIsOpen(false);
          }}
          style={{
            flex: 1,
            padding: '8px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '6px',
            color: '#4ade80',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          오늘
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          style={{
            flex: 1,
            padding: '8px',
            background: 'rgba(148, 163, 184, 0.1)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '6px',
            color: '#94a3b8',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 입력 필드 */}
      <div
        ref={inputRef}
        onClick={handleInputClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleInputClick();
          }
        }}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.3)',
          border: isOpen ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(148, 163, 184, 0.3)',
          borderRadius: '8px',
          color: value ? '#cbd5e1' : '#64748b',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
      >
        <span>{value ? formatDisplayDate(value) : placeholder}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '14px',
                lineHeight: 1,
              }}
              title="날짜 삭제"
            >
              ×
            </button>
          )}
          <span style={{ color: isOpen ? '#818cf8' : '#64748b', fontSize: '12px' }}>📅</span>
        </div>
      </div>

      {/* Portal로 body에 직접 렌더링 */}
      {calendarDropdown && createPortal(calendarDropdown, document.body)}
    </div>
  );
}
