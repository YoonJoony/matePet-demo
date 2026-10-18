import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ComponentProps, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { BottomSheet, SheetSnap } from '@/components/map/BottomSheet';
import { ExploreContent } from '@/components/map/ExploreContent';
import { PlaceSheetBody, PlaceSheetFooter, PlaceSheetHeader } from '@/components/map/PlaceSheet';
import { StoreMap } from '@/components/map/StoreMap';
import type { MapMarker, PetMapMarker } from '@/components/map/StoreMap.types';
import { PetNearbyList, PetRows, PetSummary, SheetMode, SheetModeSwitch, SheetTitleHeader } from '@/components/pets/PetMapSheet';
import { PetFilterBar } from '@/components/pets/PetFilterBar';
import { WriteMenu } from '@/components/pets/WriteMenu';
import { colors } from '@/components/theme';
import { nearbyListedPosts, nearestNeighborhood, purposeColors, purposeLabels } from '@/data/pets';
import { distanceBetween, fetchPlaceDetail, LatLng, Place, PlaceCategory, placeEmoji, searchPlaces } from '@/data/places';
import { useMapState } from '@/state/mapState';
import { usePetPosts } from '@/state/petPosts';

const RESEARCH_DISTANCE_METERS = 300;
// 동물 찾기는 동네 몇 개가 함께 보이게 넓게, 주변 시설은 가까운 순 결과(대부분 1km 안팎)가 보이게 조금 가깝게 본다.
const ZOOM_BY_MODE: Record<SheetMode, number> = { pets: 13, places: 15 };

type SearchResult = { key: string; places: Place[]; error: string | null };

// 홈 = 지도 (기획서 4). 교배·입양 글의 원형 프로필과 주변 시설을 함께 탐색한다.
export default function HomeMapScreen() {
  const insets = useSafeAreaInsets();
  const { myLocation, searchCenter, searchHere, selectedPlace, selectPlace, likedPlaceIds } = useMapState();
  const { posts, filter } = usePetPosts();
  const [mode, setMode] = useState<SheetMode>('pets');
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  // 같은 동네에 겹친 프로필 묶음을 눌렀을 때 시트에 보여 줄 글
  const [clusterIds, setClusterIds] = useState<string[] | null>(null);
  const [height, setHeight] = useState(0);
  const [snap, setSnap] = useState<SheetSnap>('mid');
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [likedOnly, setLikedOnly] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [result, setResult] = useState<SearchResult>({ key: '', places: [], error: null });

  // 지도 탭을 처음 열 때 내 위치를 묻는다.
  const requestLocation = myLocation.request;
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // 주변 시설 모드에서 검색 기준 위치나 카테고리가 바뀌면 구글 Places API를 다시 부른다 (결과는 저장하지 않음).
  const locating = myLocation.status === 'locating';
  const queryKey = `${searchCenter.latitude.toFixed(5)},${searchCenter.longitude.toFixed(5)}|${category?.label ?? 'default'}`;
  const searching = mode === 'places';
  useEffect(() => {
    if (locating || !searching) return;
    const controller = new AbortController();
    searchPlaces({ center: searchCenter, category: category ?? undefined }, controller.signal)
      .then((places) => setResult({ key: queryKey, places, error: null }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setResult({ key: queryKey, places: [], error: error.message });
      });
    return () => controller.abort();
  }, [locating, searching, queryKey, searchCenter, category]);
  const loading = locating || result.key !== queryKey;

  // 검색 중심에서 가까운 순, 모집 중·상담 중 글만 (기획서 4.1, 7.5). 목록 탭과 같은 필터를 쓴다.
  const nearby = useMemo(() => nearbyListedPosts(posts, searchCenter, filter), [posts, searchCenter, filter]);
  // 필터가 바뀌어 고른 글이 빠지면 선택도 풀린 것으로 본다.
  const selectedPet = mode === 'pets' ? (nearby.find((item) => item.post.id === selectedPetId) ?? null) : null;
  const clusterItems = mode === 'pets' && clusterIds ? nearby.filter((item) => clusterIds.includes(item.post.id)) : [];

  // 가게가 바뀌면(마커·카드·검색 화면에서 선택) 시트를 중간 단계로 맞추고, 주변 시설 모드로 넘어간다. (렌더 중 상태 조정 패턴)
  const [prevSelectedId, setPrevSelectedId] = useState(selectedPlace?.id);
  if (prevSelectedId !== selectedPlace?.id) {
    setPrevSelectedId(selectedPlace?.id);
    setSnap('mid');
    if (selectedPlace) {
      setMode('places');
      setSelectedPetId(null);
      setClusterIds(null);
    }
  }

  const hasDetail = Boolean(selectedPlace || selectedPet);
  const positions = useMemo<Record<SheetSnap, number>>(() => {
    const h = height || 800;
    return {
      full: insets.top + 8,
      mid: Math.round(h * (hasDetail ? 0.55 : 0.4)),
      collapsed: h - TAB_BAR_SPACE - 56,
    };
  }, [height, insets.top, hasDetail]);

  const places = useMemo(() => {
    const list = loading ? [] : result.places;
    return likedOnly ? list.filter((place) => likedPlaceIds.has(place.id)) : list;
  }, [loading, result.places, likedOnly, likedPlaceIds]);
  // 검색된 가게는 지도에 아이콘을 따로 그리지 않는다(구글 지도에 이미 가게 아이콘이 있음).
  // 카드·검색 결과·구글 아이콘에서 고른 가게 하나만 핀으로 고정한다.
  const markers = useMemo<MapMarker[]>(
    () =>
      selectedPlace
        ? [{ id: selectedPlace.id, name: selectedPlace.name, emoji: placeEmoji(selectedPlace), latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }]
        : [],
    [selectedPlace],
  );
  // 동물 찾기 모드에서만 원형 프로필을 그린다. 위치는 등록 동네의 중심점이다.
  const petMarkers = useMemo<PetMapMarker[]>(
    () =>
      mode === 'pets'
        ? nearby.map(({ post }) => ({
            id: post.id,
            latitude: post.area.latitude,
            longitude: post.area.longitude,
            name: post.pet.name,
            photoUri: post.photos[0]?.uri ?? null,
            emoji: post.placeholder.emoji,
            color: post.placeholder.color,
            purposeLabel: purposeLabels[post.purpose],
            purposeColor: purposeColors[post.purpose],
            sex: post.pet.sex,
          }))
        : [],
    [mode, nearby],
  );

  const selectPet = useCallback((id: string) => {
    setSelectedPetId(id);
    setSnap('mid');
  }, []);
  // 지도에서 프로필을 바로 누르면 열려 있던 묶음 목록은 닫는다.
  const onSelectPetMarker = useCallback((id: string) => {
    setClusterIds(null);
    setSelectedPetId(id);
    setSnap('mid');
  }, []);
  const onSelectCluster = useCallback((ids: string[]) => {
    setSelectedPetId(null);
    setClusterIds(ids);
    setSnap('mid');
  }, []);
  const changeMode = (next: SheetMode) => {
    setMode(next);
    setSelectedPetId(null);
    setClusterIds(null);
  };

  const onSelectMarker = (id: string) => {
    const place = places.find((item) => item.id === id) ?? (selectedPlace?.id === id ? selectedPlace : null);
    if (place) selectPlace(place);
  };
  const closePlace = () => selectPlace(null);
  const onPressMap = () => {
    if (selectedPlace) closePlace();
    setSelectedPetId(null);
    setClusterIds(null);
  };
  // 구글 지도에 원래 있는 가게 아이콘을 누르면 그 장소를 상세 조회해 하단 패널에 띄운다.
  const onSelectPoi = useCallback(
    (placeId: string) => {
      fetchPlaceDetail(placeId)
        .then((detail) => selectPlace({ ...detail, distanceMeters: Math.round(distanceBetween(searchCenter, detail)) }))
        .catch(() => undefined);
    },
    [searchCenter, selectPlace],
  );
  const onMoveEnd = useCallback((center: LatLng) => setMapCenter(center), []);
  const showResearch = !selectedPlace && !selectedPet && (mode === 'pets' || !loading) && mapCenter !== null && distanceBetween(mapCenter, searchCenter) > RESEARCH_DISTANCE_METERS;

  const onLayout = (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height);
  const sheetHeight = (height || 800) - positions[snap === 'full' ? 'mid' : snap];
  const area = nearestNeighborhood(searchCenter).name;
  const areaBasis = searchCenter !== myLocation.location ? '이 지역에서 검색 중' : myLocation.status === 'granted' ? '현재 위치 기준' : '기본 지역 기준';

  let sheetHeader: ReactNode;
  let sheetBody: ReactNode;
  if (selectedPlace) {
    sheetHeader = <PlaceSheetHeader place={selectedPlace} expanded={snap === 'full'} onClose={closePlace} />;
    sheetBody = <PlaceSheetBody key={selectedPlace.id} place={selectedPlace} expanded={snap === 'full'} />;
  } else if (selectedPet) {
    // 묶음 목록에서 골랐다면 닫을 때 그 목록으로 돌아간다.
    sheetHeader = <SheetTitleHeader testID="pet-summary-close" title={selectedPet.post.pet.name} onClose={() => setSelectedPetId(null)} />;
    sheetBody = <PetSummary post={selectedPet.post} distance={selectedPet.distance} />;
  } else if (clusterItems.length > 0) {
    sheetHeader = <SheetTitleHeader testID="cluster-close" title={`${clusterItems[0].post.area.name} 부근 ${clusterItems.length}마리`} onClose={() => setClusterIds(null)} />;
    sheetBody = (
      <View style={styles.clusterList}>
        <PetRows items={clusterItems} onSelect={selectPet} />
      </View>
    );
  } else {
    sheetHeader = <SheetModeSwitch mode={mode} onChange={changeMode} />;
    sheetBody =
      mode === 'pets' ? (
        <PetNearbyList items={nearby} onSelect={selectPet} />
      ) : (
        <ExploreContent
          selectedCategory={category}
          // 카테고리를 바꿔도 하단 시트는 누르기 전 단계를 그대로 유지한다.
          onSelectCategory={setCategory}
          places={places}
          loading={loading}
          error={result.key === queryKey ? result.error : null}
          locationMessage={myLocation.message}
          onSelectPlace={selectPlace}
        />
      );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      <StoreMap
        markers={markers}
        selectedId={selectedPlace?.id ?? null}
        onSelect={onSelectMarker}
        pets={petMarkers}
        selectedPetId={selectedPet?.post.id ?? null}
        onSelectPet={onSelectPetMarker}
        onSelectCluster={onSelectCluster}
        onSelectPoi={onSelectPoi}
        onPressMap={onPressMap}
        onMoveEnd={onMoveEnd}
        myLocation={myLocation.location}
        bottomInset={sheetHeight}
        recenterKey={recenterKey}
        zoom={ZOOM_BY_MODE[mode]}
      />

      <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
        {/* 상단: 현재 검색 지역, 검색, 프로필 진입 (기획서 4.1). 프로필 화면은 탭이 아니라 이 버튼으로 들어간다. */}
        <View style={styles.topBar}>
          <View testID="search-area" style={styles.area}>
            <Ionicons name="location-sharp" size={18} color={colors.text} />
            <View style={styles.areaText}>
              <Text style={styles.areaName} numberOfLines={1}>
                {area} 부근
              </Text>
              <Text style={styles.areaBasis}>{areaBasis}</Text>
            </View>
          </View>
          <Pressable testID="map-search-button" accessibilityRole="search" accessibilityLabel="주변 시설 검색" hitSlop={6} onPress={() => router.push('/map-search')} style={styles.iconButton}>
            <Ionicons name="search" size={22} color={colors.text} />
          </Pressable>
          <Pressable testID="map-profile-button" accessibilityRole="button" accessibilityLabel="내 프로필" hitSlop={6} onPress={() => router.push('/profile')} style={styles.avatar}>
            <Ionicons name="person" size={18} color={colors.subText} />
          </Pressable>
        </View>

        {mode === 'pets' && (
          <View style={styles.purposeRow}>
            <PetFilterBar floating testIDPrefix="map-filter" />
          </View>
        )}

        {showResearch && (
          <Pressable
            testID="search-here"
            onPress={() => {
              searchHere(mapCenter);
              setMapCenter(null);
            }}
            style={[styles.researchButton, { top: mode === 'pets' ? 108 : 64 }]}
          >
            <Ionicons name="refresh" size={16} color={colors.background} />
            <Text style={styles.researchText}>이 지역에서 다시 검색</Text>
          </Pressable>
        )}

        <View style={styles.sideButtons}>
          {mode === 'places' && (
            <CircleButton
              testID="map-liked-filter"
              icon={likedOnly ? 'heart' : 'heart-outline'}
              label="관심 시설만 보기"
              active={likedOnly}
              onPress={() => setLikedOnly(!likedOnly)}
            />
          )}
          <CircleButton
            testID="map-recenter"
            icon="locate-outline"
            label="내 위치로 이동"
            active={myLocation.status === 'granted'}
            onPress={() => {
              searchHere(null);
              setMapCenter(null);
              setRecenterKey((key) => key + 1);
            }}
          />
        </View>
      </View>

      {height > 0 && (
        <BottomSheet
          snap={snap}
          onSnapChange={setSnap}
          positions={positions}
          header={sheetHeader}
          footer={selectedPlace && snap === 'full' ? <PlaceSheetFooter place={selectedPlace} /> : null}
        >
          {sheetBody}
        </BottomSheet>
      )}

      {/* 등록하기: 동물 찾기 모드에서 하단 시트 바로 위 오른쪽에 띄운다 (끝까지 펼치면 지도보기 버튼만 둔다). */}
      {mode === 'pets' && !hasDetail && snap !== 'full' && height > 0 && <WriteMenu bottom={sheetHeight + 12} />}

      {!hasDetail && snap === 'full' && (
        <Pressable testID="show-map" onPress={() => setSnap('collapsed')} style={[styles.showMap, { bottom: TAB_BAR_SPACE + 4 }]}>
          <Ionicons name="location" size={16} color={colors.background} />
          <Text style={styles.showMapText}>지도보기</Text>
        </Pressable>
      )}
    </View>
  );
}

function CircleButton({
  icon,
  label,
  active,
  onPress,
  testID,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  active?: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.circleButton}>
      <Ionicons name={icon} size={22} color={active ? colors.primary : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  top: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 52,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(32,34,39,0.94)',
  },
  area: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  areaText: { flex: 1 },
  areaName: { fontSize: 17, fontWeight: '700', color: colors.text },
  areaBasis: { fontSize: 12, color: colors.subText },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  purposeRow: { marginTop: 8 },
  clusterList: { paddingHorizontal: 16 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  researchButton: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.text,
  },
  researchText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
  sideButtons: {
    alignSelf: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,34,39,0.94)',
  },
  showMap: {
    position: 'absolute',
    zIndex: 6, // 하단 시트(zIndex 5) 위
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.text,
  },
  showMapText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
});
