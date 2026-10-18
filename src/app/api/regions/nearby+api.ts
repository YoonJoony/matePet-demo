// GET /api/regions/nearby?x=경도&y=위도&radius=3000&offset=0&limit=8 → 반경과 겹치는 행정동 (경계 데이터로 자체 조회)
// 카카오 좌표→행정구역 API는 한 좌표의 동만 알려 주므로 주변 목록에는 쓰지 않는다.
import { errorResponse, isKoreaCoordinate } from '@/server/googlePlaces';
import { nearbyRegions, regionDataMeta } from '@/server/regions';

const MAX_RADIUS_METERS = 10_000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const x = Number(url.searchParams.get('x'));
  const y = Number(url.searchParams.get('y'));
  if (!isKoreaCoordinate(x, y)) return errorResponse(400, '좌표가 올바르지 않아요.');
  const radius = Math.min(Math.max(Number(url.searchParams.get('radius')) || 3000, 100), MAX_RADIUS_METERS);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 8, 1), 50);

  const first = url.searchParams.get('first') ?? undefined;
  const all = nearbyRegions(x, y, radius, first);
  const items = all.slice(offset, offset + limit).map(({ region, distanceMeters }) => ({ ...region, distanceMeters }));
  const nextOffset = offset + limit < all.length ? offset + limit : null;
  return Response.json({ items, total: all.length, nextOffset, radius, dataVersion: regionDataMeta.version }, { headers: { 'Cache-Control': 'no-store' } });
}
