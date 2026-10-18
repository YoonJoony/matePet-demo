import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_CENTER, LatLng } from '@/data/places';

type LocationState = {
  location: LatLng;
  status: 'locating' | 'granted' | 'fallback';
  message?: string;
  accuracy?: number; // m
  updatedAt?: number; // ms
};

export type RefreshResult = { ok: true; location: LatLng; accuracy: number } | { ok: false; reason: 'denied' | 'failed' | 'unsupported'; message: string };
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

// 이 시간·정확도 안의 위치는 다시 묻지 않고 그대로 쓴다 (지역 선택 화면의 '현재 위치' 확인용).
const FRESH_MS = 2 * 60_000;
const ACCURACY_LIMIT_M = 1000;

function getGeolocation(): Geolocation | undefined {
  return typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
}

const unavailable: LocationState = {
  location: DEFAULT_CENTER,
  status: 'fallback',
  message: '이 환경에서는 위치를 가져올 수 없어 기본 동네 기준으로 보여 줘요.',
};

function failureMessage(error: GeolocationPositionError): { reason: 'denied' | 'failed'; message: string } {
  return error.code === error.PERMISSION_DENIED
    ? { reason: 'denied', message: '위치 권한이 거부됐어요. 동네를 직접 고를 수 있어요.' }
    : { reason: 'failed', message: '위치를 확인하지 못했어요. 잠시 뒤 다시 시도하거나 동네를 직접 고를 수 있어요.' };
}

// 브라우저 위치 기능으로 내 위치(GPS 위치)를 가져온다. 위치는 메모리에만 둔다.
// 앱(iOS·Android)에서는 expo-location으로 바꿔야 한다.
export function useMyLocation() {
  const [state, setState] = useState<LocationState>(() =>
    getGeolocation() ? { location: DEFAULT_CENTER, status: 'locating' } : unavailable,
  );
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  const request = useCallback(() => {
    // 권한 요청 창에 답하지 않으면 브라우저의 timeout이 시작되지 않으므로, 8초 뒤 기본 동네로 넘어간다.
    setTimeout(() => {
      setState((prev) => (prev.status === 'locating' ? { location: DEFAULT_CENTER, status: 'fallback', message: '위치 확인이 늦어 기본 동네 기준으로 보여 줘요.' } : prev));
    }, 8000);
    getGeolocation()?.getCurrentPosition(
      (position) =>
        setState({
          location: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          status: 'granted',
          accuracy: position.coords.accuracy,
          updatedAt: Date.now(),
        }),
      (error) => setState({ location: DEFAULT_CENTER, status: 'fallback', message: failureMessage(error).message }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  // 최신 위치가 필요할 때(‘현재 위치에서 탐색’). 2분 안·1km 이내 정확도면 그대로 쓰고, 아니면 새로 조회한다.
  // 권한이 없으면 이때 브라우저가 권한을 묻는다.
  const refresh = useCallback((): Promise<RefreshResult> => {
    const current = latest.current;
    if (current.status === 'granted' && current.updatedAt && Date.now() - current.updatedAt < FRESH_MS && (current.accuracy ?? Infinity) <= ACCURACY_LIMIT_M) {
      return Promise.resolve({ ok: true, location: current.location, accuracy: current.accuracy ?? 0 });
    }
    const geolocation = getGeolocation();
    if (!geolocation) return Promise.resolve({ ok: false, reason: 'unsupported', message: '이 환경에서는 위치를 확인할 수 없어요. 동네를 직접 골라 주세요.' });
    return new Promise((resolve) => {
      geolocation.getCurrentPosition(
        (position) => {
          const location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setState({ location, status: 'granted', accuracy: position.coords.accuracy, updatedAt: Date.now() });
          resolve({ ok: true, location, accuracy: position.coords.accuracy });
        },
        (error) => resolve({ ok: false, ...failureMessage(error) }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });
  }, []);

  // 권한을 묻지 않고 상태만 확인한다 (지역 선택 화면을 열 때 바로 권한 창을 띄우지 않기 위해).
  const permission = useCallback(async (): Promise<PermissionState> => {
    try {
      const result = await navigator.permissions?.query({ name: 'geolocation' });
      return result?.state ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }, []);

  // 공유 상태(context) 값이 렌더마다 바뀌지 않도록 메모한다.
  return useMemo(() => ({ ...state, request, refresh, permission }), [state, request, refresh, permission]);
}
