// 구글 Places API (New) 서버 전용 도우미. API 라우트(+api.ts)에서만 import 한다.
// 키는 서버에서만 읽고, 브라우저에는 필요한 필드만 정리해서 보낸다.

export const PLACES_BASE = 'https://places.googleapis.com/v1';

// 목록(주변·키워드 검색)은 비용이 낮은 등급 필드만 요청한다. 별점·전화·영업시간·후기는 상세 조회에서만 받는다.
export const LIST_FIELDS = [
  'places.id',
  'places.displayName',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.shortFormattedAddress',
  'places.location',
  'places.googleMapsUri',
  'places.photos',
].join(',');

export const DETAIL_FIELDS = [
  'id',
  'displayName',
  'primaryType',
  'primaryTypeDisplayName',
  'shortFormattedAddress',
  'location',
  'googleMapsUri',
  'photos',
  'rating',
  'userRatingCount',
  'nationalPhoneNumber',
  'websiteUri',
  'currentOpeningHours.openNow',
  'regularOpeningHours.weekdayDescriptions',
  'reviews',
].join(',');

type GooglePhoto = { name: string; authorAttributions?: { displayName?: string; uri?: string }[] };

export type GooglePlace = {
  id: string;
  displayName?: { text: string };
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  shortFormattedAddress?: string;
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
  photos?: GooglePhoto[];
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  reviews?: {
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text: string };
    authorAttribution?: { displayName?: string };
  }[];
};

export function getApiKey(): string | null {
  return process.env.GOOGLE_REST_API_KEY ?? null;
}

export function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export function isKoreaCoordinate(x: number, y: number): boolean {
  return x > 124 && x < 132 && y > 33 && y < 39;
}

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)));
}

// 구글 응답 → 앱에서 쓰는 장소 형태. 사진은 이름(경로)과 작성자만 넘기고, 이미지는 /api/place-photo로 받는다.
export function toPlace(place: GooglePlace, origin?: { latitude: number; longitude: number }) {
  const location = place.location ?? { latitude: 0, longitude: 0 };
  return {
    id: place.id,
    name: place.displayName?.text ?? '',
    category: place.primaryTypeDisplayName?.text ?? '',
    primaryType: place.primaryType ?? '',
    address: place.shortFormattedAddress ?? '',
    latitude: location.latitude,
    longitude: location.longitude,
    distanceMeters: origin ? distanceMeters(origin, location) : null,
    mapsUrl: place.googleMapsUri ?? '',
    photos: (place.photos ?? []).slice(0, 10).map((photo) => ({
      name: photo.name,
      author: photo.authorAttributions?.[0]?.displayName ?? '',
    })),
  };
}

export function toPlaceDetail(place: GooglePlace) {
  return {
    ...toPlace(place),
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? 0,
    phone: place.nationalPhoneNumber ?? '',
    website: place.websiteUri ?? '',
    openNow: place.currentOpeningHours?.openNow ?? null,
    weekdayHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    reviews: (place.reviews ?? []).map((review, index) => ({
      id: `${place.id}-${index}`,
      author: review.authorAttribution?.displayName ?? '',
      rating: review.rating ?? 0,
      text: review.text?.text ?? '',
      when: review.relativePublishTimeDescription ?? '',
    })),
  };
}

export async function callPlaces(path: string, init: RequestInit & { fieldMask: string }) {
  const apiKey = getApiKey();
  if (!apiKey) return { error: errorResponse(500, '서버에 GOOGLE_REST_API_KEY가 설정되지 않았어요.') };
  const { fieldMask, headers, ...rest } = init;
  const response = await fetch(`${PLACES_BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fieldMask, ...headers },
  });
  const body = (await response.json().catch(() => null)) as ({ error?: { message?: string } } & Record<string, unknown>) | null;
  if (!response.ok) {
    // 구글 오류 메시지만 전달하고 키·요청 헤더는 돌려주지 않는다.
    return { error: errorResponse(response.status === 403 ? 502 : response.status, `Google Places 오류 (${response.status}): ${body?.error?.message ?? '알 수 없음'}`) };
  }
  return { body };
}
