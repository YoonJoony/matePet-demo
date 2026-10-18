// GET /api/regions/locate?x=경도&y=위도 → 좌표가 속한 행정동
// 카카오 coord2regioncode(행정동 H)를 우선 쓰고, 경계 데이터(통계청 SGIS 가공본)의 같은 코드로 연결한다.
// 경계 판정 결과와 다르면 check에 남겨 연계 상태를 확인할 수 있게 한다. 가까운 대표 위치로 추측하지 않는다.
import { guardApi } from '@/server/apiGuard';
import { isKoreaCoordinate, errorResponse } from '@/server/googlePlaces';
import { coord2RegionCode, KakaoLookup } from '@/server/kakaoLocal';
import { findRegionByCode, isSupportedCode, locateByBoundary, regionDataMeta, summarize } from '@/server/regions';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const x = Number(url.searchParams.get('x'));
  const y = Number(url.searchParams.get('y'));
  if (!isKoreaCoordinate(x, y)) return errorResponse(400, '좌표가 올바르지 않아요.');

  // 다른 사이트에서 온 요청은 거부하고, 횟수 제한에 걸리면 카카오를 부르지 않고 경계 데이터로만 판정한다(아래 kakao-unavailable).
  const blocked = guardApi(request, 'regionLocate');
  if (blocked?.status === 403) return blocked;
  const kakao: KakaoLookup = blocked ? { ok: false, reason: 'error', message: '동네 확인 요청이 많아 경계 데이터로 판정했어요.' } : await coord2RegionCode(x, y, request.signal);
  const boundary = locateByBoundary(x, y);
  const headers = { 'Cache-Control': 'no-store' };
  const dataVersion = regionDataMeta.version;

  if (kakao.ok && kakao.region) {
    const record = findRegionByCode(kakao.region.code);
    if (record) {
      const check = boundary?.code === record.code ? 'match' : boundary ? 'boundary-differs' : 'outside-boundary';
      return Response.json({ status: 'ok', region: summarize(record), source: 'kakao', check, dataVersion }, { headers });
    }
    // 카카오가 준 행정동이 지원 데이터에 없다. 지원하지 않는 시·군·구면 그대로 '지원 지역 밖'으로 안내하고,
    // 지원 시·군·구인데 코드가 없으면(데이터 기준일 이후 행정동 변경 등) 경계 판정으로 대신하고 check로 알린다.
    if (boundary && isSupportedCode(kakao.region.code)) {
      return Response.json(
        { status: 'ok', region: summarize(boundary), source: 'boundary', check: 'kakao-code-not-in-data', kakaoCode: kakao.region.code, dataVersion },
        { headers },
      );
    }
    return Response.json({ status: 'unsupported', place: kakao.region, message: `${kakao.region.name}은(는) 아직 지원하지 않는 지역이에요.`, dataVersion }, { headers });
  }

  // 카카오 조회를 못 했을 때는 경계 데이터로만 판정하고, 그 사실을 source로 알린다.
  if (boundary) {
    return Response.json(
      { status: 'ok', region: summarize(boundary), source: 'boundary', check: 'kakao-unavailable', kakaoMessage: kakao.ok ? '행정동 없음' : kakao.message, dataVersion },
      { headers },
    );
  }
  if (kakao.ok) return Response.json({ status: 'unsupported', place: null, message: '이 위치의 행정동을 찾지 못했어요.', dataVersion }, { headers });
  return Response.json({ status: 'error', message: `${kakao.message} 지원 지역 밖이라 경계 데이터로도 판정하지 못했어요.`, dataVersion }, { status: 502, headers });
}
