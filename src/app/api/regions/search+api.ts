// GET /api/regions/search?q=정자 → 지원 지역 행정동 이름 검색 (경계 데이터의 실제 행정동 목록 대상)
import { regionDataMeta, searchRegions } from '@/server/regions';

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 30);
  const items = searchRegions(q, 20);
  return Response.json({ items, supported: regionDataMeta.supported, dataVersion: regionDataMeta.version }, { headers: { 'Cache-Control': 'no-store' } });
}
