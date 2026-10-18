// GET /api/place-photo?name=places/{id}/photos/{photo}&w=400
// 구글 사진 주소를 서버에서 받아(키 사용) 키가 없는 googleusercontent 이미지 주소로 넘겨준다(302).
// 브라우저의 <img>에 키를 넣지 않기 위한 중계다. 사진은 저장하지 않는다.
import { callPlaces, errorResponse } from '@/server/googlePlaces';

const NAME_PATTERN = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name') ?? '';
  const width = Math.min(Math.max(Number(url.searchParams.get('w')) || 400, 100), 1200);
  if (!NAME_PATTERN.test(name)) return errorResponse(400, '사진 이름이 올바르지 않아요.');

  const result = await callPlaces(`/${name}/media?maxWidthPx=${width}&skipHttpRedirect=true`, { method: 'GET', fieldMask: '*' });
  if (result.error) return result.error;

  const photoUri = result.body?.photoUri;
  if (typeof photoUri !== 'string' || !photoUri.startsWith('https://')) return errorResponse(502, '사진 주소를 받지 못했어요.');
  return new Response(null, { status: 302, headers: { Location: photoUri, 'Cache-Control': 'no-store' } });
}
