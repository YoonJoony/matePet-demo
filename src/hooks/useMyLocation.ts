import { useCallback, useMemo, useState } from 'react';

import { DEFAULT_CENTER, LatLng } from '@/data/places';

type LocationState = {
  location: LatLng;
  status: 'locating' | 'granted' | 'fallback';
  message?: string;
};

function getGeolocation(): Geolocation | undefined {
  return typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
}

const unavailable: LocationState = {
  location: DEFAULT_CENTER,
  status: 'fallback',
  message: '이 환경에서는 위치를 가져올 수 없어 성남시청 기준으로 보여 줘요.',
};

// 브라우저 위치 기능으로 내 위치를 가져온다. request()를 부를 때만 위치를 묻고, 위치는 메모리에만 둔다.
// 앱(iOS·Android)에서는 expo-location으로 바꿔야 한다.
export function useMyLocation() {
  const [state, setState] = useState<LocationState>(() =>
    getGeolocation() ? { location: DEFAULT_CENTER, status: 'locating' } : unavailable,
  );

  const request = useCallback(() => {
    // 권한 요청 창에 답하지 않으면 브라우저의 timeout이 시작되지 않으므로, 8초 뒤 기본 위치로 넘어간다.
    setTimeout(() => {
      setState((prev) => (prev.status === 'locating' ? { location: DEFAULT_CENTER, status: 'fallback', message: '위치 확인이 늦어 성남시청 기준으로 보여 줘요.' } : prev));
    }, 8000);
    getGeolocation()?.getCurrentPosition(
      (position) =>
        setState({ location: { latitude: position.coords.latitude, longitude: position.coords.longitude }, status: 'granted' }),
      (error) =>
        setState({
          location: DEFAULT_CENTER,
          status: 'fallback',
          message: error.code === error.PERMISSION_DENIED ? '위치 권한이 없어 성남시청 기준으로 보여 줘요.' : '위치를 가져오지 못해 성남시청 기준으로 보여 줘요.',
        }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  // 공유 상태(context) 값이 렌더마다 바뀌지 않도록 메모한다.
  return useMemo(() => ({ ...state, request }), [state, request]);
}
