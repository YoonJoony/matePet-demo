// 구글 Places API (New)에서 받아 온 실제 장소. 결과는 화면에 보여 주는 동안만 메모리에 두고 저장하지 않는다.
export type PlacePhoto = { name: string; author: string };

export type Place = {
  id: string;
  name: string;
  category: string; // 예: "커피숍/커피 전문점"
  primaryType: string; // 예: "cafe"
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  mapsUrl: string; // 구글 지도 장소 페이지
  photos: PlacePhoto[];
};

// 가게를 눌렀을 때 상세 조회로 받는 정보.
export type PlaceDetail = Place & {
  rating: number | null;
  ratingCount: number;
  phone: string;
  website: string;
  openNow: boolean | null;
  weekdayHours: string[];
  reviews: { id: string; author: string; rating: number; text: string; when: string }[];
};

export type LatLng = { latitude: number; longitude: number };

// 위치 권한이 없을 때 쓰는 기본 위치 (성남시청 — 데모 사용자의 기본 동네 여수동).
export const DEFAULT_CENTER: LatLng = { latitude: 37.42, longitude: 127.1267 };

// 구글 장소 유형(types)이 있으면 주변 검색, 없으면 키워드 검색을 한다. keywordType은 키워드 결과를 그 유형으로 한정한다.
export type PlaceCategory = { label: string; emoji: string; types?: string[]; keyword?: string; keywordType?: string };

// 반려동물 시설 카테고리 (기획서 8.1 기본 단계). 미용은 구글 유형이 없어 키워드로 찾고 반려동물 관리(pet_care)로 한정한다
// (사람 대상 미용실과 구분). 반려용품(pet_store)에는 구글 분류상 분양샵·수족관도 함께 들어 있다.
export const placeCategories: PlaceCategory[] = [
  { label: '동물병원', emoji: '🩺', types: ['veterinary_care'] },
  { label: '반려용품', emoji: '🦴', types: ['pet_store'] },
  { label: '반려동물 미용', emoji: '✂️', keyword: '애견미용', keywordType: 'pet_care' },
];

// 카테고리를 고르지 않았을 때 보여 줄 기본 검색 (동물병원 + 반려용품).
export const defaultTypes = ['veterinary_care', 'pet_store'];

// 시설 검색 기본 거리 (기획서 5.2 — 동물 검색 거리와 별도)
export const FACILITY_RADIUS_METERS = 3000;

const emojiByType: [RegExp, string][] = [
  [/veterinary/, '🩺'],
  [/pet_store/, '🦴'],
  [/pet_care|groom/, '✂️'],
  [/pet|dog|cat/, '🐾'],
  [/cafe|coffee|tea/, '☕'],
  [/bakery/, '🥐'],
  [/restaurant|food|meal|bar|pub/, '🍲'],
  [/convenience/, '🏪'],
  [/supermarket|grocery|market/, '🛒'],
  [/pharmacy|drugstore/, '💊'],
  [/hospital|doctor|clinic|dentist/, '🏥'],
  [/hair|beauty|nail/, '💇'],
  [/gym|fitness|sport/, '🏋️'],
  [/school|academy/, '📒'],
  [/laundry/, '🧺'],
  [/lodging|hotel/, '🏨'],
];

// 지도 마커와 사진 없는 카드에 쓸 이모지.
export function placeEmoji(place: Place): string {
  return emojiByType.find(([pattern]) => pattern.test(place.primaryType))?.[1] ?? '📍';
}

export function photoUrl(photo: PlacePhoto, width = 400): string {
  return `/api/place-photo?name=${encodeURIComponent(photo.name)}&w=${width}`;
}

export function formatDistance(meters: number | null): string {
  if (meters === null) return '';
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}

// 두 좌표 사이 거리(m). "이 지역에서 다시 검색" 버튼을 띄울지 정할 때 쓴다.
export function distanceBetween(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `요청 실패 (${response.status})`);
  return body;
}

type SearchParams = { center: LatLng; category?: PlaceCategory; query?: string };

// 중간 서버(/api/places)를 거쳐 구글 Places API를 호출한다. 키는 서버에만 있다.
export async function searchPlaces({ center, category, query }: SearchParams, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ x: String(center.longitude), y: String(center.latitude), radius: String(FACILITY_RADIUS_METERS) });
  const keyword = query ?? category?.keyword;
  if (keyword) params.set('query', keyword);
  else params.set('types', (category?.types ?? defaultTypes).join(','));
  if (!query && category?.keywordType) params.set('type', category.keywordType);
  const body = await getJson<{ places: Place[] }>(`/api/places?${params}`, signal);
  return body.places;
}

export async function fetchPlaceDetail(id: string, signal?: AbortSignal): Promise<PlaceDetail> {
  const body = await getJson<{ place: PlaceDetail }>(`/api/place-details?id=${encodeURIComponent(id)}`, signal);
  return body.place;
}
