// 지역(행정동) 타입과 지역 API 호출. 경계·판정은 서버(/api/regions/*)에서 하고, 앱은 요약만 받는다.
import type { LatLng } from '@/data/places';

// 실제 행정동. code(행안부 10자리 행정기관코드)가 식별자이고, 이름이 같아도 코드로 구분한다.
// latitude·longitude는 동 경계 안쪽의 대표 위치 — 공개 마커와 '선택한 동네 기준' 탐색 중심으로 쓴다.
export type Region = { code: string; name: string; sido: string; sigungu: string; latitude: number; longitude: number };

// 주변 동네 목록 기준 (반려동물 글 검색 거리 필터와 별도로 관리)
export const REGION_NEARBY_RADIUS_METERS = 3000;
export const REGION_NEARBY_PAGE_SIZE = 8;

export const regionParents = (region: Pick<Region, 'sido' | 'sigungu'>) => `${region.sido} ${region.sigungu}`;

export type LocateResult =
  | { status: 'ok'; region: Region; source: 'kakao' | 'boundary'; check: string }
  | { status: 'unsupported'; place: { name: string; sido: string; sigungu: string } | null; message: string }
  | { status: 'error'; message: string };

async function readJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok && !(body as { status?: string }).status) throw new Error(body.error ?? `요청 실패 (${response.status})`);
  return body;
}

// 좌표가 속한 행정동 (카카오 행정동 판정 + 경계 데이터 연결)
export function locateRegion(point: LatLng, signal?: AbortSignal): Promise<LocateResult> {
  return readJson<LocateResult>(`/api/regions/locate?x=${point.longitude}&y=${point.latitude}`, signal);
}

export type NearbyRegion = Region & { distanceMeters: number };

// firstCode: 맨 앞에 둘 현재 동 (카카오 판정 결과)
export function fetchNearbyRegions(
  point: LatLng,
  offset: number,
  firstCode?: string,
  signal?: AbortSignal,
): Promise<{ items: NearbyRegion[]; total: number; nextOffset: number | null }> {
  const params = new URLSearchParams({
    ...(firstCode ? { first: firstCode } : {}),
    x: String(point.longitude),
    y: String(point.latitude),
    radius: String(REGION_NEARBY_RADIUS_METERS),
    offset: String(offset),
    limit: String(REGION_NEARBY_PAGE_SIZE),
  });
  return readJson(`/api/regions/nearby?${params}`, signal);
}

export function searchRegionNames(query: string, signal?: AbortSignal): Promise<{ items: Region[]; supported: string[] }> {
  return readJson(`/api/regions/search?q=${encodeURIComponent(query)}`, signal);
}
