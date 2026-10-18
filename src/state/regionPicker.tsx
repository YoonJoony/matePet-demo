import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';

import type { Region } from '@/data/regions';

// 등록 화면 → 공통 동네 선택 화면 → 등록 화면으로 결과를 돌려주는 연결.
// 홈 탐색 위치는 선택 화면이 지도 상태(mapState)에 직접 적용하고, 등록 동네는 여기서 작성 화면에만 돌려준다.
type PostRequest = { initial: Region | null };

type RegionPickerValue = {
  postRequest: PostRequest | null;
  // 등록 동네 선택을 연다. 고르면 그 동네, 취소·뒤로 가기면 null.
  pickPostRegion: (initial: Region | null) => Promise<Region | null>;
  finishPostPick: (region: Region | null) => void;
};

const RegionPickerContext = createContext<RegionPickerValue | null>(null);

export function RegionPickerProvider({ children }: { children: ReactNode }) {
  const [postRequest, setPostRequest] = useState<PostRequest | null>(null);
  const resolver = useRef<((region: Region | null) => void) | null>(null);

  const finishPostPick = useCallback((region: Region | null) => {
    resolver.current?.(region);
    resolver.current = null;
    setPostRequest(null);
  }, []);

  const pickPostRegion = useCallback(
    (initial: Region | null) => {
      resolver.current?.(null); // 이전 요청이 남아 있으면 취소로 끝낸다.
      setPostRequest({ initial });
      router.push({ pathname: '/region-select', params: { purpose: 'post' } });
      return new Promise<Region | null>((resolve) => {
        resolver.current = resolve;
      });
    },
    [],
  );

  const value = useMemo(() => ({ postRequest, pickPostRegion, finishPostPick }), [postRequest, pickPostRegion, finishPostPick]);
  return <RegionPickerContext.Provider value={value}>{children}</RegionPickerContext.Provider>;
}

export function useRegionPicker(): RegionPickerValue {
  const context = useContext(RegionPickerContext);
  if (!context) throw new Error('useRegionPicker must be used inside RegionPickerProvider');
  return context;
}
