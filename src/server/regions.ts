// 행정동 경계 데이터 조회 (서버 전용). API 라우트(+api.ts)에서만 import 한다.
// 데이터는 scripts/build-regions.mjs로 만든 regions-data.json (통계청 SGIS 행정동 경계 가공본, 지원 지역만).
// 경계(polygons)는 서버 안에서만 쓰고, 응답에는 코드·이름·상위 지역·대표 위치만 담는다.
import data from './regions-data.json';

type Ring = number[][]; // [경도, 위도][]
type Polygon = Ring[]; // 바깥 경계 + 구멍
type RegionRecord = {
  code: string; // 행안부 10자리 행정기관코드 — 지역 식별자
  statCode: string; // 통계청 8자리 코드 (참고용)
  name: string;
  sido: string;
  sigungu: string;
  label: number[]; // 대표 위치 [경도, 위도] — 경계 안쪽 점
  bbox: number[]; // [최소 경도, 최소 위도, 최대 경도, 최대 위도]
  polygons: Polygon[];
};

// 클라이언트로 보내는 지역 요약. 대표 위치는 공개 마커·탐색 중심으로 쓴다.
export type RegionSummary = { code: string; name: string; sido: string; sigungu: string; latitude: number; longitude: number };

const regions = data.regions as RegionRecord[];
const byCode = new Map(regions.map((region) => [region.code, region]));
export const regionDataMeta = data.meta;
// 지원 시·군·구 (행정기관코드 앞 5자리)
const supportedSgg = new Set(regions.map((region) => region.code.slice(0, 5)));
export const isSupportedCode = (code: string) => supportedSgg.has(code.slice(0, 5));

export function summarize(region: RegionRecord): RegionSummary {
  return { code: region.code, name: region.name, sido: region.sido, sigungu: region.sigungu, latitude: region.label[1], longitude: region.label[0] };
}

export function findRegionByCode(code: string): RegionRecord | undefined {
  return byCode.get(code);
}

// ---- 기하 계산. 짧은 거리라 경도를 cos(위도)로 줄인 평면 근사로 미터를 구한다. ----
const METERS_PER_DEGREE = 111_320;

function ringContains(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function regionContains(region: RegionRecord, lng: number, lat: number): boolean {
  const [minX, minY, maxX, maxY] = region.bbox;
  if (lng < minX || lng > maxX || lat < minY || lat > maxY) return false;
  return region.polygons.some((polygon) => ringContains(lng, lat, polygon[0]) && !polygon.slice(1).some((hole) => ringContains(lng, lat, hole)));
}

// 점에서 동 경계(영역)까지 거리(m). 안에 있으면 0.
function distanceToRegion(region: RegionRecord, lng: number, lat: number): number {
  if (regionContains(region, lng, lat)) return 0;
  const k = Math.cos((lat * Math.PI) / 180);
  let min = Infinity;
  for (const polygon of region.polygons) {
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const ax = (ring[j][0] - lng) * k;
        const ay = ring[j][1] - lat;
        const bx = (ring[i][0] - lng) * k;
        const by = ring[i][1] - lat;
        const dx = bx - ax;
        const dy = by - ay;
        const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
        min = Math.min(min, Math.hypot(ax + t * dx, ay + t * dy));
      }
    }
  }
  return min * METERS_PER_DEGREE;
}

// 좌표가 속한 행정동 (경계 판정). 가장 가까운 대표 위치로 추측하지 않는다.
export function locateByBoundary(lng: number, lat: number): RegionRecord | undefined {
  return regions.find((region) => regionContains(region, lng, lat));
}

// 반경과 겹치는 행정동: 좌표가 속한 동을 맨 앞에, 그다음은 동 영역까지 가까운 순.
// firstCode가 있으면(카카오가 판정한 현재 동) 그 동을 맨 앞에 둔다 — 경계 부근에서 두 자료가 다를 때 위치 카드와 맞추기 위해.
export function nearbyRegions(lng: number, lat: number, radiusMeters: number, firstCode?: string): { region: RegionSummary; distanceMeters: number }[] {
  const margin = radiusMeters / METERS_PER_DEGREE;
  const marginLng = margin / Math.cos((lat * Math.PI) / 180);
  return regions
    .filter(({ bbox }) => lng >= bbox[0] - marginLng && lng <= bbox[2] + marginLng && lat >= bbox[1] - margin && lat <= bbox[3] + margin)
    .map((region) => ({ region: summarize(region), distanceMeters: Math.round(distanceToRegion(region, lng, lat)) }))
    .filter((item) => item.distanceMeters <= radiusMeters)
    .sort(
      (a, b) =>
        Number(b.region.code === firstCode) - Number(a.region.code === firstCode) ||
        a.distanceMeters - b.distanceMeters ||
        a.region.code.localeCompare(b.region.code),
    );
}

// 동네 이름 검색: 공백을 무시하고 동 이름·상위 지역에서 찾는다. 동 이름이 앞에서 맞는 순으로 보여 준다.
export function searchRegions(query: string, limit: number): RegionSummary[] {
  const q = query.replace(/\s+/g, '');
  if (!q) return [];
  const score = (region: RegionRecord) => {
    const name = region.name.replace(/\s+/g, '');
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    return `${region.sido}${region.sigungu}${name}`.replace(/\s+/g, '').includes(q) ? 2 : -1;
  };
  return regions
    .map((region) => ({ region, score: score(region) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => a.score - b.score || a.region.name.localeCompare(b.region.name, 'ko') || a.region.code.localeCompare(b.region.code))
    .slice(0, limit)
    .map((item) => summarize(item.region));
}
