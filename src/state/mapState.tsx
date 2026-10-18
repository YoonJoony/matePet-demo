import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { LatLng, Place } from '@/data/places';
import { useMyLocation } from '@/hooks/useMyLocation';

type RecentSearch = { id: string; keyword: string; date: string };

type MapStateValue = {
  myLocation: ReturnType<typeof useMyLocation>;
  // 지금 가게를 검색하는 기준 위치 (내 위치 또는 "이 지역에서 다시 검색"한 위치)
  searchCenter: LatLng;
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

// 홈 지도와 시설 검색 화면이 함께 쓰는 상태. 모두 메모리에만 있고 새로고침하면 사라진다.
export function MapStateProvider({ children }: { children: ReactNode }) {
  const myLocation = useMyLocation();
  const [customCenter, searchHere] = useState<LatLng | null>(null);
  const searchCenter = customCenter ?? myLocation.location;
  const [selectedPlace, selectPlace] = useState<Place | null>(null);
  const [likedPlaceIds, setLikedPlaceIds] = useState<ReadonlySet<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

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
      searchCenter,
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
    [myLocation, searchCenter, selectedPlace, likedPlaceIds, togglePlaceLike, recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches],
  );

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}

export function useMapState(): MapStateValue {
  const context = useContext(MapStateContext);
  if (!context) throw new Error('useMapState must be used inside MapStateProvider');
  return context;
}
