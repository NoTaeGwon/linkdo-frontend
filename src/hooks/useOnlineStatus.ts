/**
 * ================================================================
 * 파일명       : hooks/useOnlineStatus.ts
 * 목적         : 온라인/오프라인 상태 감지 훅
 * 설명         : 
 *   - 브라우저 navigator.onLine 상태 추적
 *   - 실제 API 서버 연결 상태 확인
 *   - 오프라인 → 온라인 전환 시 콜백 지원
 * ================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkApiHealth } from '../api';

interface UseOnlineStatusOptions {
  // API 서버 상태 확인 간격 (ms)
  checkInterval?: number;
  // 온라인 전환 시 콜백
  onOnline?: () => void;
  // 오프라인 전환 시 콜백
  onOffline?: () => void;
}

interface OnlineStatus {
  // 브라우저 네트워크 연결 상태
  isNetworkOnline: boolean;
  // API 서버 연결 가능 상태
  isApiAvailable: boolean;
  // 최종 온라인 상태 (네트워크 + API 모두 연결)
  isOnline: boolean;
  // 마지막 확인 시간
  lastChecked: Date | null;
  // 수동 연결 상태 확인
  checkConnection: () => Promise<boolean>;
}

export function useOnlineStatus(options: UseOnlineStatusOptions = {}): OnlineStatus {
  const { 
    checkInterval = 30000, // 기본 30초마다 확인
    onOnline, 
    onOffline 
  } = options;

  const [isNetworkOnline, setIsNetworkOnline] = useState(navigator.onLine);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // 이전 온라인 상태 추적 (콜백 호출용)
  const wasOnlineRef = useRef(false);
  
  // API 서버 연결 확인
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsApiAvailable(false);
      setLastChecked(new Date());
      return false;
    }

    try {
      const isAvailable = await checkApiHealth();
      setIsApiAvailable(isAvailable);
      setLastChecked(new Date());
      return isAvailable;
    } catch {
      setIsApiAvailable(false);
      setLastChecked(new Date());
      return false;
    }
  }, []);

  // 브라우저 온라인/오프라인 이벤트 핸들러
  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true);
      // 네트워크 복구 시 API 상태도 확인
      checkConnection();
    };

    const handleOffline = () => {
      setIsNetworkOnline(false);
      setIsApiAvailable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 초기 연결 상태 확인
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  // 주기적 API 상태 확인
  useEffect(() => {
    if (!isNetworkOnline) return;

    const interval = setInterval(() => {
      checkConnection();
    }, checkInterval);

    return () => clearInterval(interval);
  }, [isNetworkOnline, checkInterval, checkConnection]);

  // 최종 온라인 상태
  const isOnline = isNetworkOnline && isApiAvailable;

  // 온라인/오프라인 전환 콜백 호출
  useEffect(() => {
    if (isOnline && !wasOnlineRef.current) {
      // 오프라인 → 온라인 전환
      onOnline?.();
    } else if (!isOnline && wasOnlineRef.current) {
      // 온라인 → 오프라인 전환
      onOffline?.();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, onOnline, onOffline]);

  return {
    isNetworkOnline,
    isApiAvailable,
    isOnline,
    lastChecked,
    checkConnection,
  };
}

