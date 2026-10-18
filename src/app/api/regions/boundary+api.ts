// GET /api/regions/boundary?code=4113565500 → 행정동 하나의 경계 (지도에 강조 표시용)
// 통계청 SGIS 행정동 경계 가공본의 실제 경계만 돌려준다. 요청한 한 동만 보내고 전체 경계는 보내지 않는다.
import { errorResponse } from '@/server/googlePlaces';
import { findRegionByCode, regionDataMeta } from '@/server/regions';

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code') ?? '';
  if (!/^\d{10}$/.test(code)) return errorResponse(400, '행정동 코드가 올바르지 않아요.');
  const region = findRegionByCode(code);
  if (!region) return errorResponse(404, '지원 지역의 행정동이 아니에요.');
  return Response.json(
    { code: region.code, name: region.name, polygons: region.polygons, dataVersion: regionDataMeta.version },
    // 기준일이 정해진 정적 데이터라 브라우저가 하루 동안 다시 쓰게 한다.
    { headers: { 'Cache-Control': 'public, max-age=86400' } },
  );
}
