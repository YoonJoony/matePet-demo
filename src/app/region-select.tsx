import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RegionMapPicker } from '@/components/region/RegionMapPicker';
import { colors } from '@/components/theme';
import { me } from '@/data/pets';
import type { LatLng } from '@/data/places';
import { fetchNearbyRegions, locateRegion, NearbyRegion, Region, regionParents, searchRegionNames } from '@/data/regions';
import { useMapState } from '@/state/mapState';
import { useRegionPicker } from '@/state/regionPicker';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

type GpsCard =
  | { phase: 'checking' }
  | { phase: 'idle' } // 권한을 아직 묻지 않음
  | { phase: 'denied'; message: string }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; point: LatLng; region: Region }
  | { phase: 'outside'; point: LatLng; message: string };

const pointKey = (point: LatLng) => `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`;

// 공통 동네 선택 화면. purpose=home이면 홈·글 목록의 탐색 위치를, purpose=post면 작성 중인 글의 등록 동네만 바꾼다.
// 화면을 열기만 해서는 아무것도 바뀌지 않고, 사용자가 고른 것만 적용한다. 사용자 기본 동네는 바꾸지 않는다.
export default function RegionSelectScreen() {
  const params = useLocalSearchParams<{ purpose?: string }>();
  const purpose = params.purpose === 'post' ? 'post' : 'home';
  const { postRequest, finishPostPick } = useRegionPicker();
  const { myLocation, basis, searchCenter, areaLabel, exploreGps, exploreRegion } = useMapState();
  const { refresh, permission } = myLocation;
  const finished = useRef(false);

  const initialRegion = purpose === 'post' ? (postRequest?.initial ?? null) : basis.kind === 'region' ? basis.region : null;
  const [staged, setStaged] = useState<Region | null>(initialRegion); // 선택 화면의 임시 선택 — 완료 전에는 적용하지 않는다
  const [gps, setGps] = useState<GpsCard>({ phase: 'checking' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState(false);
  const [query, setQuery] = useState('');

  // 등록 화면에서 연 경우, 고르지 않고 나가면(뒤로 가기·취소) 작성 화면에 '선택 안 함'을 돌려준다.
  useEffect(
    () => () => {
      if (purpose === 'post' && !finished.current) finishPostPick(null);
    },
    [purpose, finishPostPick],
  );

  // 권한이 이미 있으면 현재 위치의 행정동을 보여 준다. 권한을 묻는 창은 버튼을 누를 때만 띄운다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await permission();
      if (cancelled) return;
      if (state === 'denied') return setGps({ phase: 'denied', message: '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용하거나 아래에서 동네를 골라 주세요.' });
      if (state !== 'granted') return setGps({ phase: 'idle' });
      const result = await refresh();
      if (cancelled) return;
      if (!result.ok) return setGps({ phase: result.reason === 'denied' ? 'denied' : 'error', message: result.message });
      const located = await locateRegion(result.location).catch((error: Error) => ({ status: 'error' as const, message: error.message }));
      if (cancelled) return;
      if (located.status === 'ok') setGps({ phase: 'ready', point: result.location, region: located.region });
      else if (located.status === 'unsupported') setGps({ phase: 'outside', point: result.location, message: located.message });
      else setGps({ phase: 'error', message: located.message });
    })();
    return () => {
      cancelled = true;
    };
  }, [permission, refresh]);

  const apply = (region: Region) => {
    finished.current = true;
    if (purpose === 'post') finishPostPick(region);
    else exploreRegion(region);
    goBack();
  };

  // ‘현재 위치에서 탐색’: 위치 확인에 성공하면 확인 창 없이 바로 적용하고 닫는다.
  const useCurrentLocation = async () => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    const result = await refresh();
    if (!result.ok) {
      setBusy(false);
      // 실패 안내는 위치 카드에 한 번만 보여 준다.
      setGps({ phase: result.reason === 'denied' ? 'denied' : 'error', message: result.message });
      return;
    }
    if (purpose === 'home') {
      finished.current = true;
      exploreGps(); // 검색 중심은 GPS 좌표 그대로 (동네 대표 위치로 바꾸지 않음)
      goBack();
      return;
    }
    // 등록 동네는 현재 위치가 속한 행정동으로 정하고, 공개 위치는 그 동네의 대표 위치를 쓴다.
    const located = await locateRegion(result.location).catch((error: Error) => ({ status: 'error' as const, message: error.message }));
    if (located.status === 'ok') return apply(located.region);
    setBusy(false);
    setActionError(located.message);
  };

  // 주변 동네 목록의 기준: GPS를 알면 내 위치, 모르면 지금 선택한 지역
  const gpsPoint = gps.phase === 'ready' || gps.phase === 'outside' ? gps.point : null;
  const fallbackCenter: LatLng = purpose === 'post' ? (postRequest?.initial ?? me.homeRegion) : searchCenter;
  const nearbyCenter = gpsPoint ?? fallbackCenter;
  const nearbyFromGps = gpsPoint !== null;

  if (purpose === 'post' && !postRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="등록 동네 선택" />
        <Text style={styles.empty}>작성 화면에서 다시 열어 주세요.</Text>
      </SafeAreaView>
    );
  }

  const confirmLabel = purpose === 'post' ? '이 동네 선택' : '이 동네로 탐색';

  if (mapMode) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header title="지도에서 동네 선택" onBack={() => setMapMode(false)} />
        <RegionMapPicker
          initialCenter={gpsPoint ?? staged ?? nearbyCenter}
          confirmLabel={confirmLabel}
          onRequestMyLocation={refresh}
          onPick={apply}
          onCancel={() => setMapMode(false)}
        />
      </SafeAreaView>
    );
  }

  const showConfirm = staged !== null && staged.code !== initialRegion?.code;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header title={purpose === 'post' ? (postRequest?.title ?? '등록 동네 선택') : '동네 선택'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 1. 현재 위치 — 가장 먼저, 가장 눈에 띄게 */}
        <View testID="region-current-location" style={styles.gpsCard}>
          <Text style={styles.sectionLabel}>현재 위치</Text>
          <GpsSummary gps={gps} />
          <Pressable
            testID="region-use-current"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={useCurrentLocation}
            style={[styles.gpsButton, busy && styles.gpsButtonBusy]}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="navigate" size={18} color="#FFFFFF" />}
            <Text style={styles.gpsButtonText}>{busy ? '위치 확인 중…' : purpose === 'post' ? '현재 위치의 동네 선택' : '현재 위치에서 탐색'}</Text>
          </Pressable>
          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
        </View>

        {/* 2. 현재 선택한 지역 */}
        <View style={styles.block}>
          <Text style={styles.sectionLabel}>{purpose === 'post' ? '작성 중인 글의 등록 동네' : '지금 탐색 중인 지역'}</Text>
          {purpose === 'post' ? (
            postRequest?.initial ? (
              <Text style={styles.currentText}>
                {postRequest.initial.name} · {regionParents(postRequest.initial)}
              </Text>
            ) : (
              <Text style={styles.currentText}>아직 고르지 않았어요</Text>
            )
          ) : (
            <Text testID="region-current-explore" style={styles.currentText}>
              {areaLabel.title} · {areaLabel.basis}
              {areaLabel.parents ? ` · ${areaLabel.parents}` : ''}
              {areaLabel.note ? ` (${areaLabel.note})` : ''}
            </Text>
          )}
        </View>

        {/* 4. 동네 이름 검색 / 지도에서 선택 */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.subText} />
            <TextInput
              testID="region-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder="동네 이름 검색 (예: 정자, 위례)"
              placeholderTextColor={colors.mutedText}
              style={styles.searchInput}
              maxLength={30}
            />
          </View>
          <Pressable testID="region-open-map" accessibilityRole="button" onPress={() => setMapMode(true)} style={styles.mapButton}>
            <Ionicons name="map-outline" size={18} color={colors.text} />
            <Text style={styles.mapButtonText}>지도</Text>
          </Pressable>
        </View>

        {query.trim() ? (
          <SearchResults query={query.trim()} selectedCode={staged?.code ?? null} onSelect={setStaged} />
        ) : (
          // 3. 주변 동네 목록 (GPS를 모르면 '선택한 지역 주변'으로 표시)
          <NearbyList
            key={`${pointKey(nearbyCenter)}|${gps.phase === 'ready' ? gps.region.code : ''}`}
            center={nearbyCenter}
            fromGps={nearbyFromGps}
            currentCode={gps.phase === 'ready' ? gps.region.code : undefined}
            selectedCode={staged?.code ?? null}
            onSelect={setStaged}
          />
        )}
      </ScrollView>

      {showConfirm && staged ? (
        <View testID="region-confirm-bar" style={styles.confirmBar}>
          <View style={styles.confirmInfo}>
            <Text style={styles.confirmName}>{staged.name}</Text>
            <Text style={styles.confirmParents}>{regionParents(staged)}</Text>
          </View>
          <Pressable testID="region-confirm" accessibilityRole="button" onPress={() => apply(staged)} style={styles.confirmButton}>
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Header({ title, onBack = goBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable testID="region-back" accessibilityLabel="뒤로 가기" hitSlop={8} onPress={onBack}>
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpace} />
    </View>
  );
}

function GpsSummary({ gps }: { gps: GpsCard }) {
  if (gps.phase === 'checking') return <Text style={styles.gpsHint}>위치 권한을 확인하는 중…</Text>;
  if (gps.phase === 'idle') return <Text style={styles.gpsHint}>버튼을 누르면 위치 권한을 묻고 지금 있는 동네를 확인해요.</Text>;
  if (gps.phase === 'denied' || gps.phase === 'error') return <Text style={styles.gpsHint}>{gps.message}</Text>;
  if (gps.phase === 'outside') return <Text style={styles.gpsHint}>{gps.message}</Text>;
  return (
    <View testID="region-gps-region">
      <Text style={styles.gpsName}>{gps.region.name}</Text>
      <Text style={styles.gpsParents}>{regionParents(gps.region)}</Text>
    </View>
  );
}

function RegionRow({ region, detail, selected, onPress }: { region: Region; detail?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID={`region-item-${region.code}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>
          {region.name} <Text style={styles.rowParents}>/ {regionParents(region)}</Text>
        </Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

function NearbyList({
  center,
  fromGps,
  currentCode,
  selectedCode,
  onSelect,
}: {
  center: LatLng;
  fromGps: boolean;
  currentCode?: string;
  selectedCode: string | null;
  onSelect: (region: Region) => void;
}) {
  const [items, setItems] = useState<NearbyRegion[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (offset: number) => {
    setLoading(true);
    setError(null);
    fetchNearbyRegions(center, offset, currentCode)
      .then((page) => {
        setItems((prev) => (offset === 0 ? page.items : [...prev, ...page.items]));
        setNextOffset(page.nextOffset);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    loadRef.current(0);
  }, []);

  const detail = (item: NearbyRegion) => {
    if (fromGps && (item.code === currentCode || (!currentCode && item.distanceMeters === 0))) return '현재 위치';
    if (item.distanceMeters === 0) return fromGps ? '현재 위치와 맞닿은 동네' : '선택한 지역';
    const d = item.distanceMeters;
    return d < 1000 ? `동네 경계까지 약 ${Math.max(10, Math.round(d / 10) * 10)}m` : `동네 경계까지 약 ${(d / 1000).toFixed(1)}km`;
  };

  return (
    <View style={styles.block}>
      <Text testID="region-nearby-title" style={styles.sectionLabel}>
        {fromGps ? '내 위치 주변 동네' : '선택한 지역 주변 동네'}
      </Text>
      {items.map((item) => (
        <RegionRow key={item.code} region={item} detail={detail(item)} selected={item.code === selectedCode} onPress={() => onSelect(item)} />
      ))}
      {loading ? <ActivityIndicator color={colors.subText} style={styles.loading} /> : null}
      {error ? (
        <Pressable onPress={() => load(items.length)}>
          <Text style={styles.errorText}>목록을 불러오지 못했어요. 눌러서 다시 시도</Text>
        </Pressable>
      ) : null}
      {!loading && !error && items.length === 0 ? <Text style={styles.empty}>이 주변은 아직 지원하지 않는 지역이에요. 동네 이름으로 검색해 주세요.</Text> : null}
      {!loading && nextOffset !== null ? (
        <Pressable testID="region-nearby-more" onPress={() => load(nextOffset)} style={styles.moreButton}>
          <Text style={styles.moreText}>더 보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SearchResults({ query, selectedCode, onSelect }: { query: string; selectedCode: string | null; onSelect: (region: Region) => void }) {
  const [result, setResult] = useState<{ query: string; items: Region[]; supported: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 입력이 멈추면 검색한다. 늦게 도착한 이전 검색 결과는 query 비교로 버린다.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchRegionNames(query, controller.signal)
        .then((body) => {
          setError(null);
          setResult({ query, ...body });
        })
        .catch((e: Error) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const current = result?.query === query ? result : null;
  return (
    <View style={styles.block}>
      <Text style={styles.sectionLabel}>검색 결과</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!current && !error ? <ActivityIndicator color={colors.subText} style={styles.loading} /> : null}
      {current?.items.map((region) => (
        <RegionRow key={region.code} region={region} selected={region.code === selectedCode} onPress={() => onSelect(region)} />
      ))}
      {current && current.items.length === 0 ? (
        <Text style={styles.empty}>‘{query}’에 맞는 동네가 없어요. 지원 지역: {current.supported.join(', ')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  headerSpace: { width: 28 },
  content: { paddingHorizontal: 16, paddingBottom: 120, gap: 20 },
  gpsCard: { gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.subText },
  gpsHint: { fontSize: 14, lineHeight: 20, color: colors.subText },
  gpsName: { fontSize: 22, fontWeight: '700', color: colors.text },
  gpsParents: { fontSize: 14, color: colors.subText },
  gpsButton: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, backgroundColor: colors.primary },
  gpsButtonBusy: { opacity: 0.7 },
  gpsButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  errorText: { fontSize: 14, color: colors.caution },
  block: { gap: 6 },
  currentText: { fontSize: 15, color: colors.text },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surfaceRaised },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  mapButton: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.surfaceRaised },
  mapButtonText: { fontSize: 15, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
  rowSelected: { backgroundColor: colors.surfaceRaised },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowParents: { fontSize: 14, fontWeight: '400', color: colors.subText },
  rowDetail: { fontSize: 12, color: colors.mutedText },
  loading: { marginVertical: 12 },
  empty: { marginVertical: 12, fontSize: 14, lineHeight: 20, color: colors.subText },
  moreButton: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.surfaceRaised },
  moreText: { fontSize: 15, fontWeight: '600', color: colors.text },
  confirmBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  confirmInfo: { flex: 1 },
  confirmName: { fontSize: 17, fontWeight: '700', color: colors.text },
  confirmParents: { fontSize: 13, color: colors.subText },
  confirmButton: { height: 48, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
