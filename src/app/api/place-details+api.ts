// GET /api/place-details?id=구글_장소_ID
// 가게를 눌렀을 때 한 번 호출한다. 별점·전화·영업시간·후기처럼 비용이 높은 필드는 여기서만 받는다.
import { callPlaces, DETAIL_FIELDS, errorResponse, GooglePlace, toPlaceDetail } from '@/server/googlePlaces';

const ID_PATTERN = /^[A-Za-z0-9_-]{10,300}$/;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!ID_PATTERN.test(id)) return errorResponse(400, '장소 ID가 올바르지 않아요.');

  const result = await callPlaces(`/places/${id}?languageCode=ko&regionCode=KR`, { method: 'GET', fieldMask: DETAIL_FIELDS });
  if (result.error) return result.error;

  return Response.json({ place: toPlaceDetail(result.body as unknown as GooglePlace) }, { headers: { 'Cache-Control': 'no-store' } });
}
