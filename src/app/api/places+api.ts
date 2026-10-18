// 구글 Places API (New) 중간 서버. 키는 서버에서만 읽는다.
// GET /api/places?x=경도&y=위도&types=veterinary_care,pet_store&radius=3000 → 주변 검색 (Nearby Search, 반경 안만)
// GET /api/places?x=경도&y=위도&query=애견미용&type=pet_care&radius=3000    → 키워드 검색 (Text Search, 위치 우선)
// 유형을 지정하면 구글의 기본 유형(primaryType)이 그 유형인 곳만 남긴다. 보조 유형만 맞는 곳(예: 동물병원 검색의 약국,
// 애견미용 검색의 사람 미용실·학원)이 섞여 나오기 때문이다. 키워드 검색은 반경 밖 결과도 오므로 반경으로 다시 거른다.
// 결과는 저장하지 않고 필요한 필드만 골라 돌려준다.
import { callPlaces, errorResponse, GooglePlace, isKoreaCoordinate, LIST_FIELDS, toPlace } from '@/server/googlePlaces';

const DEFAULT_RADIUS_METERS = 1000;
const MAX_RADIUS_METERS = 5000;
const TYPE_PATTERN = /^[a-z_]{2,40}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const x = Number(url.searchParams.get('x'));
  const y = Number(url.searchParams.get('y'));
  const query = url.searchParams.get('query')?.trim().slice(0, 50);
  const types = (url.searchParams.get('types') ?? '').split(',').filter((type) => TYPE_PATTERN.test(type)).slice(0, 5);
  const queryType = url.searchParams.get('type') ?? '';
  const keywordType = TYPE_PATTERN.test(queryType) ? queryType : null;
  const radiusParam = Number(url.searchParams.get('radius'));
  const radius = Number.isFinite(radiusParam) && radiusParam > 0 ? Math.min(Math.max(radiusParam, 100), MAX_RADIUS_METERS) : DEFAULT_RADIUS_METERS;

  if (!isKoreaCoordinate(x, y)) return errorResponse(400, '좌표가 올바르지 않아요.');
  if (!query && types.length === 0) return errorResponse(400, 'types 또는 query가 필요해요.');

  const origin = { latitude: y, longitude: x };
  const circle = { center: origin, radius };
  const common = { languageCode: 'ko', regionCode: 'KR', maxResultCount: 20 };

  const result = query
    ? await callPlaces('/places:searchText', {
        method: 'POST',
        fieldMask: LIST_FIELDS,
        body: JSON.stringify({
          ...common,
          textQuery: query,
          rankPreference: 'DISTANCE',
          locationBias: { circle },
          ...(keywordType ? { includedType: keywordType, strictTypeFiltering: true } : {}),
        }),
      })
    : await callPlaces('/places:searchNearby', {
        method: 'POST',
        fieldMask: LIST_FIELDS,
        body: JSON.stringify({ ...common, includedPrimaryTypes: types, rankPreference: 'DISTANCE', locationRestriction: { circle } }),
      });
  if (result.error) return result.error;

  const allowedTypes = query ? (keywordType ? [keywordType] : null) : types;
  const places = ((result.body?.places as GooglePlace[] | undefined) ?? [])
    .filter((place) => !allowedTypes || (place.primaryType !== undefined && allowedTypes.includes(place.primaryType)))
    .map((place) => toPlace(place, origin))
    .filter((place) => !query || place.distanceMeters === null || place.distanceMeters <= radius)
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  return Response.json({ places }, { headers: { 'Cache-Control': 'no-store' } });
}
