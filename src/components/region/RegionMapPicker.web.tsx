/// <reference types="google.maps" />
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { loadGoogleMaps } from '@/components/map/googleMapsLoader';
import { colors } from '@/components/theme';
import type { LatLng } from '@/data/places';
import { locateRegion, Region, regionParents } from '@/data/regions';

import { createBoundaryOverlay } from './boundaryOverlay';
import type { RegionMapPickerProps } from './RegionMapPicker.types';

// 지도 이동이 끝나고 이 시간 동안 더 움직이지 않으면 핀 좌표의 행정동을 조회한다 (매 프레임 호출하지 않음).
const LOOKUP_DELAY_MS = 350;
const centerKey = (point: LatLng) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;

type Lookup =
  | { phase: 'moving' }
  | { phase: 'loading' }
  | { phase: 'ready'; region: Region }
  | { phase: 'unsupported'; message: string }
  | { phase: 'error'; message: string };

// 동네 지도 선택: 가운데 고정 핀 + 지도를 움직이는 방식. 핀 좌표가 속한 행정동을 서버에서 판정한다.
// 가까운 동네 중심점으로 추측하지 않고, 경계는 그리지 않는다(정확한 경계 표시 기능은 별도).
export function RegionMapPicker({ initialCenter, confirmLabel, onRequestMyLocation, onPick, onCancel }: RegionMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const boundaryRef = useRef<ReturnType<typeof createBoundaryOverlay> | null>(null);
  const seq = useRef(0); // 가장 최근 조회 번호. 늦게 도착한 이전 결과는 버린다.
  const lookedUpKey = useRef<string | null>(null); // 마지막으로 조회한 핀 좌표 (같은 좌표는 다시 조회하지 않음)
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(initialCenter);
  const [lookup, setLookup] = useState<Lookup>({ phase: 'moving' });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateMessage, setLocateMessage] = useState<string | null>(null);

  const runLookup = (center: LatLng) => {
    lookedUpKey.current = centerKey(center);
    const id = ++seq.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLookup({ phase: 'loading' });
    locateRegion(center, controller.signal)
      .then((result) => {
        if (id !== seq.current) return;
        if (result.status === 'ok') setLookup({ phase: 'ready', region: result.region });
        else if (result.status === 'unsupported') setLookup({ phase: 'unsupported', message: result.message });
        else setLookup({ phase: 'error', message: result.message });
      })
      .catch((error: Error) => {
        if (id === seq.current && !controller.signal.aborted) setLookup({ phase: 'error', message: error.message });
      });
  };
  const lookupRef = useRef(runLookup);
  useEffect(() => {
    lookupRef.current = runLookup;
  });

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const start = initialRef.current;
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: start.latitude, lng: start.longitude },
          zoom: 15,
          colorScheme: google.maps.ColorScheme.DARK,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        mapRef.current = map;
        boundaryRef.current = createBoundaryOverlay(map, { fillOpacity: 0.14, strokeWeight: 2.5 });
        const currentCenter = (): LatLng | null => {
          const c = map.getCenter();
          return c ? { latitude: c.lat(), longitude: c.lng() } : null;
        };
        // 핀 좌표(지도 중심)가 실제로 바뀌면 선택을 막는다. 지도 크기만 바뀐 경우(중심 그대로)는 이동으로 보지 않는다.
        map.addListener('center_changed', () => {
          const center = currentCenter();
          if (!center || centerKey(center) === lookedUpKey.current) return;
          if (timer.current) clearTimeout(timer.current);
          seq.current += 1; // 진행 중이던 조회 결과도 이제 최신이 아니다.
          lookedUpKey.current = null;
          setLookup((prev) => (prev.phase === 'moving' ? prev : { phase: 'moving' }));
        });
        // 멈춘 뒤 잠시 기다렸다가 한 번만 조회한다. 이미 조회한 좌표면 건너뛴다.
        map.addListener('idle', () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            const center = currentCenter();
            if (center && centerKey(center) !== lookedUpKey.current) lookupRef.current(center);
          }, LOOKUP_DELAY_MS);
        });
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      abort.current?.abort();
      boundaryRef.current?.remove();
    };
  }, []);

  // 핀 위치의 조회가 끝난 동만 경계를 강조한다. 지도를 움직이는 동안·조회 중·실패 시에는 지운다.
  const highlightCode = lookup.phase === 'ready' ? lookup.region.code : null;
  useEffect(() => {
    boundaryRef.current?.show(highlightCode);
  }, [highlightCode]);

  const retry = () => {
    const c = mapRef.current?.getCenter();
    if (c) runLookup({ latitude: c.lat(), longitude: c.lng() });
  };

  const goToMyLocation = async () => {
    if (locating) return;
    setLocating(true);
    setLocateMessage(null);
    const result = await onRequestMyLocation();
    setLocating(false);
    if (result.ok) mapRef.current?.panTo({ lat: result.location.latitude, lng: result.location.longitude });
    else setLocateMessage(result.message);
  };

  const ready = lookup.phase === 'ready';

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <div ref={containerRef} data-testid="region-map" style={{ position: 'absolute', inset: 0, backgroundColor: colors.background }} />
        {/* 고정 핀: 아이콘 끝이 지도 정중앙(조회 좌표)을 가리키도록 위로 올린다. */}
        <View pointerEvents="none" style={styles.pin}>
          <Ionicons name="location" size={44} color={colors.primary} />
        </View>
        <Pressable testID="region-map-my-location" accessibilityRole="button" accessibilityLabel="현재 위치로 이동" onPress={goToMyLocation} style={styles.myLocationButton}>
          {locating ? <ActivityIndicator color={colors.text} /> : <Ionicons name="locate" size={22} color={colors.text} />}
        </Pressable>
        {loadError ? <Text style={styles.mapError}>{loadError}</Text> : null}
      </View>

      <View testID="region-map-result" style={styles.panel}>
        <View style={styles.resultArea}>
        {lookup.phase === 'ready' ? (
          <>
            <Text style={styles.regionName}>{lookup.region.name}</Text>
            <Text style={styles.regionParents}>{regionParents(lookup.region)}</Text>
          </>
        ) : lookup.phase === 'loading' || lookup.phase === 'moving' ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.subText} />
            <Text style={styles.statusText}>{lookup.phase === 'moving' ? '지도를 멈추면 동네를 확인해요' : '핀 위치의 동네를 확인하는 중…'}</Text>
          </View>
        ) : (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{lookup.message}</Text>
            <Text style={styles.statusText}>지도를 조금 옮겨 보거나 다시 시도해 주세요.</Text>
            <Pressable testID="region-map-retry" onPress={retry} style={styles.retryButton}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        )}
        {locateMessage ? <Text style={styles.statusText}>{locateMessage}</Text> : null}
        </View>
        <View style={styles.actions}>
          <Pressable testID="region-map-cancel" onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
          <Pressable
            testID="region-map-confirm"
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready }}
            disabled={!ready}
            onPress={() => lookup.phase === 'ready' && onPick(lookup.region)}
            style={[styles.confirmButton, !ready && styles.confirmDisabled]}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapArea: { flex: 1, overflow: 'hidden' },
  pin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -42 },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  mapError: { position: 'absolute', left: 16, right: 16, top: 16, padding: 12, borderRadius: 8, color: colors.text, backgroundColor: colors.surfaceRaised },
  // 결과 영역 높이를 고정해, 상태가 바뀌어도 지도 크기가 흔들리지 않게 한다.
  resultArea: { height: 128, gap: 6, justifyContent: 'center' },
  panel: { gap: 6, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.surface },
  regionName: { fontSize: 20, fontWeight: '700', color: colors.text },
  regionParents: { fontSize: 14, color: colors.subText },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  statusText: { fontSize: 14, color: colors.subText },
  errorBox: { gap: 4 },
  errorText: { fontSize: 15, color: colors.caution },
  retryButton: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  retryText: { fontSize: 14, fontWeight: '600', color: colors.text },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelButton: { height: 50, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.surfaceStrong },
  cancelText: { fontSize: 16, fontWeight: '600', color: colors.text },
  confirmButton: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primary },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
