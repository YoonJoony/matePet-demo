import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { me } from '@/data/pets';
import { LatLng, Place } from '@/data/places';
import { locateRegion, LocateResult, Region } from '@/data/regions';
import { useMyLocation } from '@/hooks/useMyLocation';

type RecentSearch = { id: string; keyword: string; date: string };

// 탐색 기준. GPS 위치(myLocation)와 구분한다.
// - gps: 실제 GPS 좌표가 검색 중심 (행정동 이름은 좌표를 설명하는 표시일 뿐)
// - region: 고른 동네의 대표 위치가 검색 중심 (picked = 사용자가 고름, default = 위치를 몰라 기본 동네)
// - mapCenter: 홈 지도의 '이 지역에서 다시 검색'으로 지도 중심이 검색 중심
export type ExploreBasis =
  | { kind: 'gps' }
  | { kind: 'region'; region: Region; source: 'picked' | 'default' }
  | { kind: 'mapCenter'; center: LatLng };

// 헤더 표시: title = 동네 이름, basis = '현재 위치 기준' 같은 보조 문구
export type AreaLabel = { title: string; basis: string; parents: string | null; note: string | null };

type MapStateValue = {
  myLocation: ReturnType<typeof useMyLocation>;
  basis: ExploreBasis; // 실제로 쓰는 탐색 기준 (GPS를 쓸 수 없으면 기본 동네)
  searchCenter: LatLng;
  areaLabel: AreaLabel;
  exploreGps: () => void;
  exploreRegion: (region: Region) => void;
  // 지도 중심에서 다시 검색. null이면 현재 위치(없으면 기본 동네) 기준으로 돌아간다.
  searchHere: (center: LatLng | null) => void;
  selectedPlace: Place | null;
  selectPlace: (place: Place | null) => void;
  likedPlaceIds: ReadonlySet<string>;
  togglePlaceLike: (placeId: string) => void;
  recentSearches: RecentSearch[];
  addRecentSearch: (keyword: string) => void;
  removeRecentSearch: (id: string) => void;
  clearRecentSearches: () => void;
};

const MapStateContext = createContext<MapStateValue | null>(null);

function today(): string {
  const now = new Date();
  return `${now.getMonth() + 1}.${now.getDate()}.`;
}

const pointKey = (point: LatLng) => `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`;

// 홈 지도·글 목록·시설 검색·지역 선택 화면이 함께 쓰는 상태. 모두 메모리에만 있고 새로고침하면 사라진다.
export function MapStateProvider({ children }: { children: ReactNode }) {
  const myLocation = useMyLocation();
  const [chosenBasis, setChosenBasis] = useState<ExploreBasis>({ kind: 'gps' });
  const [selectedPlace, selectPlace] = useState<Place | null>(null);
  const [likedPlaceIds, setLikedPlaceIds] = useState<ReadonlySet<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // GPS를 쓰기로 했지만 위치를 모르면(권한 없음·실패·확인 중) 기본 동네를 기준으로 쓴다.
  const gpsReady = myLocation.status === 'granted';
  const basis = useMemo<ExploreBasis>(
    () => (chosenBasis.kind === 'gps' && !gpsReady ? { kind: 'region', region: me.homeRegion, source: 'default' } : chosenBasis),
    [chosenBasis, gpsReady],
  );

  const { latitude: gpsLat, longitude: gpsLng } = myLocation.location;
  const centerLat = basis.kind === 'gps' ? gpsLat : basis.kind === 'region' ? basis.region.latitude : basis.center.latitude;
  const centerLng = basis.kind === 'gps' ? gpsLng : basis.kind === 'region' ? basis.region.longitude : basis.center.longitude;
  const searchCenter = useMemo(() => ({ latitude: centerLat, longitude: centerLng }), [centerLat, centerLng]);

  // GPS·지도 중심 기준일 때 그 좌표의 행정동 이름을 조회한다 (표시용. 검색 중심은 좌표 그대로).
  const needsLookup = basis.kind !== 'region';
  const lookupKey = needsLookup ? pointKey(searchCenter) : null;
  const [lookup, setLookup] = useState<{ key: string; result: LocateResult } | null>(null);
  useEffect(() => {
    if (!lookupKey) return;
    const controller = new AbortController();
    locateRegion(searchCenter, controller.signal)
      .then((result) => setLookup({ key: lookupKey, result }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setLookup({ key: lookupKey, result: { status: 'error', message: error.message } });
      });
    return () => controller.abort();
  }, [lookupKey, searchCenter]);

  const areaLabel = useMemo<AreaLabel>(() => {
    if (basis.kind === 'region') {
      return {
        title: basis.region.name,
        basis: basis.source === 'picked' ? '선택한 동네 기준' : '기본 동네 기준',
        parents: `${basis.region.sido} ${basis.region.sigungu}`,
        note: null,
      };
    }
    const result = lookup?.key === lookupKey ? lookup.result : null;
    const fallbackTitle = basis.kind === 'gps' ? '현재 위치' : '지도 중심';
    const basisText = basis.kind === 'gps' ? '현재 위치 기준' : '지도 중심 기준';
    if (result?.status === 'ok') return { title: result.region.name, basis: basisText, parents: `${result.region.sido} ${result.region.sigungu}`, note: null };
    if (result?.status === 'unsupported' && result.place) {
      return { title: result.place.name, basis: basisText, parents: `${result.place.sido} ${result.place.sigungu}`, note: '지원 지역 밖' };
    }
    return { title: fallbackTitle, basis: basisText, parents: null, note: result?.status === 'error' ? '동네 확인 실패' : null };
  }, [basis, lookup, lookupKey]);

  const exploreGps = useCallback(() => setChosenBasis({ kind: 'gps' }), []);
  const exploreRegion = useCallback((region: Region) => setChosenBasis({ kind: 'region', region, source: 'picked' }), []);
  const searchHere = useCallback((center: LatLng | null) => setChosenBasis(center ? { kind: 'mapCenter', center } : { kind: 'gps' }), []);

  const togglePlaceLike = useCallback((placeId: string) => {
    setLikedPlaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }, []);

  const addRecentSearch = useCallback((keyword: string) => {
    setRecentSearches((prev) => [{ id: `${Date.now()}`, keyword, date: today() }, ...prev.filter((item) => item.keyword !== keyword)].slice(0, 10));
  }, []);

  const removeRecentSearch = useCallback((id: string) => {
    setRecentSearches((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearRecentSearches = useCallback(() => setRecentSearches([]), []);

  const value = useMemo(
    () => ({
      myLocation,
      basis,
      searchCenter,
      areaLabel,
      exploreGps,
      exploreRegion,
      searchHere,
      selectedPlace,
      selectPlace,
      likedPlaceIds,
      togglePlaceLike,
      recentSearches,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
    }),
    [
      myLocation,
      basis,
      searchCenter,
      areaLabel,
      exploreGps,
      exploreRegion,
      searchHere,
      selectedPlace,
      likedPlaceIds,
      togglePlaceLike,
      recentSearches,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
    ],
  );

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}

export function useMapState(): MapStateValue {
  const context = useContext(MapStateContext);
  if (!context) throw new Error('useMapState must be used inside MapStateProvider');
  return context;
}
