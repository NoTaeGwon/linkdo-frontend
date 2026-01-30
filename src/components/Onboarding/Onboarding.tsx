/**
 * 온보딩 투어 컴포넌트
 * - 첫 방문 사용자에게 주요 기능 안내
 * - 단계별 하이라이트와 설명 제공
 */

import { useState, useEffect, useCallback } from 'react';
import './Onboarding.css';

interface TourStep {
  target: string;       // CSS 선택자
  title: string;        // 단계 제목
  content: string;      // 설명 내용
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '.add-task-btn',
    title: '태스크 추가',
    content: '이 버튼을 클릭하여 새로운 태스크를 추가하세요. JSON 파일로 데이터를 가져오거나 내보낼 수도 있습니다.',
    position: 'bottom',
  },
  {
    target: '.search-filter-area',
    title: '검색 & 필터',
    content: '🏷️ 태그 필터로 원하는 태그만 보거나, 🔍 검색창에서 제목으로 태스크를 찾을 수 있습니다.',
    position: 'bottom',
  },
  {
    target: '.graph-container',
    title: '그래프 뷰',
    content: '태스크가 노드로 표시됩니다. 드래그하여 위치를 조정하고, 마우스 휠로 확대/축소하세요.',
    position: 'top',
  },
  {
    target: '.zoom-controls',
    title: '줌 컨트롤',
    content: '확대, 축소, 뷰 초기화 버튼입니다. 키보드 단축키도 지원합니다.',
    position: 'left',
  },
  {
    target: '.minimap',
    title: '미니맵',
    content: '전체 그래프를 한눈에 볼 수 있습니다. 현재 보이는 영역이 표시됩니다.',
    position: 'left',
  },
  {
    target: '.auto-arrange-btn',
    title: 'AI 자동정렬',
    content: 'AI가 태스크의 유사도를 분석하여 관련 있는 태스크끼리 가깝게 배치합니다.',
    position: 'bottom',
  },
  {
    target: '.add-task-btn',
    title: '💾 데이터 백업 안내',
    content: 'Linkdo는 로그인 없이 사용 가능하지만, 브라우저 데이터 삭제 시 태스크가 사라질 수 있습니다. "데이터 관리" 탭에서 주기적으로 백업하세요!',
    position: 'bottom',
  },
];

const STORAGE_KEY = 'linkdo_onboarding_completed';

interface OnboardingProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export function Onboarding({ forceShow = false, onComplete }: OnboardingProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  // 첫 방문 체크
  useEffect(() => {
    if (forceShow) {
      setIsActive(true);
      setCurrentStep(0);
      return;
    }

    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // 약간의 딜레이 후 시작 (UI 렌더링 대기)
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  // 현재 단계의 요소 위치 계산
  const updatePosition = useCallback(() => {
    if (!isActive || currentStep >= TOUR_STEPS.length) return;

    const step = TOUR_STEPS[currentStep];
    const element = document.querySelector(step.target);

    if (!element) {
      // 요소를 찾지 못하면 다음 단계로
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 8;

    // 하이라이트 위치
    setHighlightStyle({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // 툴팁 위치
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top':
        top = rect.top - tooltipHeight - 20;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - 20;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + 20;
        break;
    }

    // 화면 밖으로 나가지 않도록 조정
    left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));
    top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20));

    setTooltipStyle({ top, left });
  }, [isActive, currentStep]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [updatePosition]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete?.();
  };

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="onboarding-overlay">
      {/* 하이라이트 영역 */}
      <div className="onboarding-highlight" style={highlightStyle} />

      {/* 툴팁 */}
      <div className="onboarding-tooltip" style={tooltipStyle}>
        <div className="onboarding-tooltip-header">
          <span className="onboarding-step-indicator">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
          <button className="onboarding-skip-btn" onClick={handleSkip}>
            건너뛰기
          </button>
        </div>

        <h3 className="onboarding-title">{step.title}</h3>
        <p className="onboarding-content">{step.content}</p>

        <div className="onboarding-actions">
          {currentStep > 0 && (
            <button className="onboarding-btn onboarding-btn-secondary" onClick={handlePrev}>
              이전
            </button>
          )}
          <button className="onboarding-btn onboarding-btn-primary" onClick={handleNext}>
            {currentStep < TOUR_STEPS.length - 1 ? '다음' : '완료'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 온보딩 재시작 함수 (외부에서 호출 가능)
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}
