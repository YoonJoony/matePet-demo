/// <reference types="google.maps" />
// 행정동 경계 강조 (웹 구글 지도). 실제 경계 데이터(/api/regions/boundary)만 그리고, 임의의 모양은 그리지 않는다.
import { colors } from '@/components/theme';

type Polygons = number[][][][]; // MultiPolygon [경도, 위도]

const cache = new Map<string, Promise<Polygons | null>>();

// 같은 동은 한 번만 받아 온다. 실패하면 다음에 다시 시도할 수 있게 비운다.
function loadBoundary(code: string): Promise<Polygons | null> {
  let pending = cache.get(code);
  if (!pending) {
    pending = fetch(`/api/regions/boundary?code=${code}`)
      .then((response) => (response.ok ? (response.json() as Promise<{ polygons: Polygons }>) : null))
      .then((body) => body?.polygons ?? null)
      .catch(() => null);
    pending.then((result) => result === null && cache.delete(code));
    cache.set(code, pending);
  }
  return pending;
}

// 지도 하나에 경계 하나를 그리는 표시기. show()를 빠르게 연달아 불러도 마지막 요청의 동만 남는다.
export function createBoundaryOverlay(map: google.maps.Map, options: { fillOpacity: number; strokeWeight: number }) {
  const layer = new google.maps.Data({ map });
  layer.setStyle({
    clickable: false, // 경계 위를 눌러도 지도·마커 동작은 그대로
    strokeColor: colors.primary,
    strokeOpacity: 0.9,
    strokeWeight: options.strokeWeight,
    fillColor: colors.primary,
    fillOpacity: options.fillOpacity,
    zIndex: 1,
  });
  let current: string | null = null;

  const clear = () => {
    current = null;
    layer.forEach((feature) => layer.remove(feature));
  };

  const show = (code: string | null) => {
    if (code === current) return;
    clear();
    if (!code) return;
    current = code;
    loadBoundary(code).then((polygons) => {
      if (current !== code || !polygons) return; // 그사이 다른 동을 고르면 늦게 온 결과는 버린다
      layer.addGeoJson({ type: 'Feature', properties: { code }, geometry: { type: 'MultiPolygon', coordinates: polygons } });
    });
  };

  return { show, clear, remove: () => layer.setMap(null) };
}
