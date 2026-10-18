// 반려동물 교배·입양 등록 글 데이터 (기획서 7.1~7.5).
// 데모에서는 앱 메모리에만 두며 새로고침하면 샘플 상태로 돌아간다.
import { distanceBetween, LatLng } from '@/data/places';

export type PetPurpose = 'mating' | 'adoption';
export type PetKind = 'bird' | 'dog' | 'cat';
export type PetSex = 'male' | 'female' | 'unknown';
export type PostStatus = 'recruiting' | 'consulting' | 'done' | 'paused';
export type Vaccination = 'done' | 'partial' | 'none' | 'unknown';
export type Neutered = 'yes' | 'no' | 'unknown';

export const purposeLabels: Record<PetPurpose, string> = { mating: '교배', adoption: '입양' };
export const purposeColors: Record<PetPurpose, string> = { mating: '#9B6BFF', adoption: '#2DBE6C' };
export const kindLabels: Record<PetKind, string> = { bird: '조류', dog: '강아지', cat: '고양이' };
export const sexLabels: Record<PetSex, string> = { male: '수컷', female: '암컷', unknown: '미확인' };
export const sexSymbols: Record<PetSex, string> = { male: '♂', female: '♀', unknown: '?' };
export const statusLabels: Record<PostStatus, string> = { recruiting: '모집 중', consulting: '상담 중', done: '완료', paused: '일시 중지' };
export const vaccinationLabels: Record<Vaccination, string> = { done: '접종 완료', partial: '일부 접종', none: '미접종', unknown: '모름' };
export const neuteredLabels: Record<Neutered, string> = { yes: '중성화 완료', no: '중성화 안 함', unknown: '모름' };
// 요약 시트에 쓰는 등록 목적 설명 (기획서 4.3)
export const purposeGoalLabels: Record<PetPurpose, string> = { mating: '교배 상대 찾기', adoption: '입양 가족 찾기' };

// 종류별 품종·종 목록. 모름·믹스를 함께 둔다 (기획서 5.1).
export const breedsByKind: Record<PetKind, string[]> = {
  dog: ['모름', '믹스', '말티즈', '푸들', '포메라니안', '비숑 프리제', '시바견', '웰시코기', '골든 리트리버', '진돗개'],
  cat: ['모름', '코리안 숏헤어', '러시안 블루', '브리티시 숏헤어', '스코티시 폴드', '페르시안', '랙돌', '먼치킨'],
  bird: ['모름', '사랑앵무', '왕관앵무', '모란앵무', '코뉴어', '문조', '카나리아', '십자매'],
};

// 접종·중성화는 강아지·고양이만 받고 필수로 둔다 (기획서 7.2 — 종류에 따라 표시·필수 여부를 다르게).
export function usesHealthChecks(kind: PetKind): boolean {
  return kind === 'dog' || kind === 'cat';
}

// 공개 위치로 쓰는 동네 중심점 (데모용 근사 좌표). 실제 주소 대신 이 지점으로만 지도 표시·거리 계산을 한다.
export type Neighborhood = { name: string; latitude: number; longitude: number };
// 성남시(수정·중원·분당구)와 이웃 지역(강남·송파·용인 수지). 성남시청이 있는 여수동이 데모 사용자의 기본 동네다.
export const neighborhoods: Neighborhood[] = [
  { name: '여수동', latitude: 37.42, longitude: 127.1267 },
  { name: '신흥동', latitude: 37.4405, longitude: 127.1474 },
  { name: '태평동', latitude: 37.4446, longitude: 127.1338 },
  { name: '성남동', latitude: 37.4321, longitude: 127.129 },
  { name: '상대원동', latitude: 37.4355, longitude: 127.1717 },
  { name: '야탑동', latitude: 37.4114, longitude: 127.1279 },
  { name: '서현동', latitude: 37.3847, longitude: 127.1235 },
  { name: '수내동', latitude: 37.3786, longitude: 127.1146 },
  { name: '정자동', latitude: 37.3667, longitude: 127.1086 },
  { name: '삼평동', latitude: 37.4012, longitude: 127.1086 },
  { name: '구미동', latitude: 37.3503, longitude: 127.106 },
  { name: '수서동', latitude: 37.4874, longitude: 127.1018 },
  { name: '문정동', latitude: 37.4859, longitude: 127.1222 },
  { name: '죽전동', latitude: 37.3247, longitude: 127.1074 },
];

export function findNeighborhood(name: string): Neighborhood {
  return neighborhoods.find((item) => item.name === name) ?? neighborhoods[0];
}

// 데모 사용자 (실제 개인정보 대신 샘플 값).
// id: 작성자 판별용 고유 키 (닉네임은 겹칠 수 있어 비교에 쓰지 않는다).
export const me = {
  id: 'user-demo',
  nickname: '데모 보호자',
  defaultNeighborhood: '여수동',
  defaultAddressDetail: '성남대로 000 (샘플 주소)',
  phone: '010-0000-0000',
};

export type PetPhoto = { uri: string };

export type PetPost = {
  id: string;
  purpose: PetPurpose;
  status: PostStatus;
  title: string;
  description: string;
  pet: {
    name: string;
    kind: PetKind;
    breed: string;
    sex: PetSex;
    birthDate: string; // YYYY-MM-DD, 모르면 빈 값
    estimatedAge: string; // 예: "약 2살", 생년월일을 모를 때
  };
  health: { condition: string; vaccination: Vaccination | null; neutered: Neutered | null };
  mating: { wantKind: PetKind | null; wantBreed: string; wantSex: PetSex | null; memo: string } | null;
  adoption: { reason: string; personality: string; habits: string } | null;
  photos: PetPhoto[];
  placeholder: { emoji: string; color: string }; // 사진이 없을 때 대신 보여 줄 그림
  area: Neighborhood; // 공개 위치 (동네 중심점)
  addressDetail: string; // 비공개 상세 주소 — 화면에 표시하지 않는다
  contact: { chat: boolean; phone: string | null };
  memo: string;
  authorId: string; // 작성자 고유 키 — 내 글 여부는 이것으로만 판단한다
  author: string; // 화면에 보여 줄 닉네임
  createdAt: number;
};

const minutesAgo = (minutes: number) => Date.now() - minutes * 60_000;

// 샘플 프로필 사진 (public/pets, generated-assets/pet-profiles-2026-10-18을 480px로 줄인 것). 웹에서 그대로 제공된다.
const samplePhoto = (file: string): PetPhoto => ({ uri: `/pets/${file}.jpg` });

const base: Pick<PetPost, 'description' | 'health' | 'mating' | 'adoption' | 'photos' | 'addressDetail' | 'contact' | 'memo'> = {
  description: '',
  health: { condition: '건강해요', vaccination: null, neutered: null },
  mating: null,
  adoption: null,
  photos: [],
  addressDetail: '',
  contact: { chat: true, phone: null },
  memo: '',
};

// 성남 주변 샘플 (기획서 10.2): 조류·강아지·고양이 × 교배·입양, 같은 동네 겹침(정자동 3건), 먼 글(죽전동),
// 상담 중·완료 글, 사진 없는 글, 데모 사용자 본인 글(p12)을 포함한다. p1·p2는 샘플 채팅방과 연결된다.
export const samplePosts: PetPost[] = [
  {
    ...base,
    id: 'p1', purpose: 'mating', status: 'recruiting', title: '말티즈 남아 교배 상대 찾아요',
    description: '온순하고 사람을 좋아하는 아이예요. 건강검진 결과를 공유할 수 있어요.',
    pet: { name: '콩이', kind: 'dog', breed: '말티즈', sex: 'male', birthDate: '2023-03-14', estimatedAge: '' },
    health: { condition: '정기 검진 이상 없음', vaccination: 'done', neutered: 'no' },
    mating: { wantKind: 'dog', wantBreed: '말티즈', wantSex: 'female', memo: '같은 품종, 3살 이하를 원해요.' },
    photos: [samplePhoto('dog-profile')],
    placeholder: { emoji: '🐶', color: '#4A3F55' }, area: findNeighborhood('정자동'),
    contact: { chat: true, phone: '010-0000-0101' }, authorId: 'user-1', author: '콩이네', createdAt: minutesAgo(12),
  },
  {
    ...base,
    id: 'p2', purpose: 'adoption', status: 'recruiting', title: '코숏 고양이 가족을 찾아요',
    description: '이사 때문에 함께하기 어려워져 좋은 가족을 찾습니다.',
    pet: { name: '나비', kind: 'cat', breed: '코리안 숏헤어', sex: 'female', birthDate: '', estimatedAge: '약 2살' },
    health: { condition: '건강해요', vaccination: 'done', neutered: 'yes' },
    adoption: { reason: '해외 이사', personality: '조용하고 애교가 많아요', habits: '화장실 잘 가리고 밤에 잘 자요' },
    photos: [samplePhoto('cat-profile')],
    placeholder: { emoji: '🐱', color: '#3B4A3F' }, area: findNeighborhood('서현동'), authorId: 'user-2', author: '나비집사', createdAt: minutesAgo(45),
  },
  {
    ...base,
    id: 'p3', purpose: 'mating', status: 'consulting', title: '왕관앵무 짝을 찾습니다',
    pet: { name: '해피', kind: 'bird', breed: '왕관앵무', sex: 'female', birthDate: '2024-05-01', estimatedAge: '' },
    mating: { wantKind: 'bird', wantBreed: '왕관앵무', wantSex: 'male', memo: '' },
    photos: [samplePhoto('bird-profile')],
    placeholder: { emoji: '🦜', color: '#4A4A2E' }, area: findNeighborhood('야탑동'), authorId: 'user-3', author: '앵무사랑', createdAt: minutesAgo(130),
  },
  {
    ...base,
    id: 'p4', purpose: 'adoption', status: 'recruiting', title: '장난꾸러기 고등어 코숏 입양 보내요',
    description: '에너지가 넘쳐서 놀아 줄 시간이 많은 가족이면 좋겠어요.',
    pet: { name: '호랑', kind: 'cat', breed: '코리안 숏헤어', sex: 'male', birthDate: '', estimatedAge: '약 1살' },
    health: { condition: '건강해요', vaccination: 'done', neutered: 'yes' },
    adoption: { reason: '다른 고양이와 합사가 어려워요', personality: '활발하고 호기심이 많아요', habits: '새벽에 우다다를 해요' },
    photos: [samplePhoto('cat-profile2')],
    placeholder: { emoji: '🐈', color: '#3F4A4F' }, area: findNeighborhood('태평동'), authorId: 'user-4', author: '호랑이네', createdAt: minutesAgo(200),
  },
  {
    ...base,
    id: 'p5', purpose: 'adoption', status: 'recruiting', title: '치즈 아기 고양이 가족 찾아요',
    pet: { name: '치즈', kind: 'cat', breed: '코리안 숏헤어', sex: 'male', birthDate: '2026-07-20', estimatedAge: '' },
    health: { condition: '1차 접종 완료', vaccination: 'partial', neutered: 'no' },
    adoption: { reason: '구조한 아기 고양이예요', personality: '잠이 많고 순해요', habits: '모래 화장실 사용' },
    photos: [samplePhoto('cat-profile3')],
    placeholder: { emoji: '🐱', color: '#4F453B' }, area: findNeighborhood('정자동'), authorId: 'user-5', author: '구조맘', createdAt: minutesAgo(90),
  },
  {
    ...base,
    id: 'p6', purpose: 'adoption', status: 'recruiting', title: '믹스견 입양 보내요 (중형)',
    description: '산책을 정말 좋아해요. 마당 있는 집이면 더 좋아요.',
    pet: { name: '보리', kind: 'dog', breed: '믹스', sex: 'male', birthDate: '', estimatedAge: '약 4살' },
    health: { condition: '슬개골 1기 (생활에는 지장 없음)', vaccination: 'partial', neutered: 'yes' },
    adoption: { reason: '가족 알레르기', personality: '활발하고 낯을 조금 가려요', habits: '하루 두 번 산책' },
    placeholder: { emoji: '🐕', color: '#4F3B2E' }, area: findNeighborhood('수내동'),
    contact: { chat: true, phone: '010-0000-0106' }, authorId: 'user-6', author: '보리아빠', createdAt: minutesAgo(300),
  },
  {
    ...base,
    id: 'p7', purpose: 'mating', status: 'recruiting', title: '러시안 블루 여아 교배 상대 구해요',
    pet: { name: '루나', kind: 'cat', breed: '러시안 블루', sex: 'female', birthDate: '2022-11-20', estimatedAge: '' },
    health: { condition: '건강해요', vaccination: 'done', neutered: 'no' },
    mating: { wantKind: 'cat', wantBreed: '러시안 블루', wantSex: 'male', memo: '혈통서 있는 아이를 원해요.' },
    placeholder: { emoji: '🐈', color: '#2E3F4F' }, area: findNeighborhood('삼평동'), authorId: 'user-7', author: '루나맘', createdAt: minutesAgo(600),
  },
  {
    ...base,
    id: 'p8', purpose: 'adoption', status: 'recruiting', title: '사랑앵무 한 쌍 입양처 찾아요',
    pet: { name: '초록이', kind: 'bird', breed: '사랑앵무', sex: 'unknown', birthDate: '', estimatedAge: '약 1살' },
    adoption: { reason: '돌볼 시간이 부족해요', personality: '사람 손을 잘 타요', habits: '아침에 잘 울어요' },
    placeholder: { emoji: '🐦', color: '#2E4F45' }, area: findNeighborhood('정자동'), authorId: 'user-8', author: '새집', createdAt: minutesAgo(1440),
  },
  {
    ...base,
    id: 'p9', purpose: 'mating', status: 'recruiting', title: '포메 남아 교배 문의 받아요',
    pet: { name: '솜이', kind: 'dog', breed: '포메라니안', sex: 'male', birthDate: '', estimatedAge: '약 3살' },
    health: { condition: '건강해요', vaccination: 'done', neutered: 'no' },
    mating: { wantKind: 'dog', wantBreed: '포메라니안', wantSex: 'female', memo: '' },
    placeholder: { emoji: '🐩', color: '#55463B' }, area: findNeighborhood('수서동'), authorId: 'user-9', author: '솜이네', createdAt: minutesAgo(2880),
  },
  {
    ...base,
    id: 'p10', purpose: 'mating', status: 'recruiting', title: '모란앵무 수컷 짝 구해요',
    pet: { name: '망고', kind: 'bird', breed: '모란앵무', sex: 'male', birthDate: '', estimatedAge: '약 1살' },
    mating: { wantKind: 'bird', wantBreed: '모란앵무', wantSex: 'female', memo: '' },
    placeholder: { emoji: '🐤', color: '#4F4A2E' }, area: findNeighborhood('문정동'), authorId: 'user-10', author: '망고집', createdAt: minutesAgo(3000),
  },
  {
    ...base,
    id: 'p11', purpose: 'adoption', status: 'done', title: '(완료) 페르시안 입양 보냈어요',
    pet: { name: '구름', kind: 'cat', breed: '페르시안', sex: 'male', birthDate: '', estimatedAge: '약 5살' },
    health: { condition: '건강해요', vaccination: 'done', neutered: 'yes' },
    adoption: { reason: '', personality: '', habits: '' },
    placeholder: { emoji: '😺', color: '#44404F' }, area: findNeighborhood('죽전동'), authorId: 'user-11', author: '구름집사', createdAt: minutesAgo(4320),
  },
  // 데모 사용자 본인의 글 — 상세에서 수정·상태 변경 흐름을 확인한다 (기획서 7.5, 11).
  {
    ...base,
    id: 'p12', purpose: 'mating', status: 'recruiting', title: '말티즈 여아 교배 상대 찾아요',
    description: '사람을 잘 따르는 순한 아이예요.',
    pet: { name: '하양', kind: 'dog', breed: '말티즈', sex: 'female', birthDate: '2023-08-10', estimatedAge: '' },
    health: { condition: '건강해요', vaccination: 'done', neutered: 'no' },
    mating: { wantKind: 'dog', wantBreed: '말티즈', wantSex: 'male', memo: '' },
    photos: [samplePhoto('dog-profile2')],
    placeholder: { emoji: '🐶', color: '#4A4F55' }, area: findNeighborhood(me.defaultNeighborhood), addressDetail: me.defaultAddressDetail,
    contact: { chat: true, phone: null }, authorId: me.id, author: me.nickname, createdAt: minutesAgo(25),
  },
];

// ---- 거리 (기획서 7.4.1) ----

// 기준점 ↔ 공개 위치(동네 중심점) 직선거리(m).
export function distanceToPost(from: LatLng, post: PetPost): number {
  return distanceBetween(from, post.area);
}

// 공개 위치가 대략적인 값이므로 반올림해서 보여 준다.
export function formatApproxDistance(meters: number): string {
  if (meters < 1000) return '1km 이내';
  const km = meters / 1000;
  const rounded = km < 10 ? Math.round(km * 2) / 2 : Math.round(km);
  return `약 ${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}km`;
}

export function petAgeLabel(pet: PetPost['pet']): string {
  if (pet.birthDate) {
    const born = new Date(pet.birthDate);
    if (!Number.isNaN(born.getTime())) {
      const months = (new Date().getFullYear() - born.getFullYear()) * 12 + (new Date().getMonth() - born.getMonth());
      return months < 12 ? `${Math.max(months, 0)}개월` : `${Math.floor(months / 12)}살`;
    }
  }
  return pet.estimatedAge || '나이 모름';
}

export function timeAgoLabel(createdAt: number): string {
  const minutes = Math.floor((Date.now() - createdAt) / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

// 기본 검색에는 모집 중·상담 중 글만 보여 준다 (기획서 7.5).
export function isListed(post: PetPost): boolean {
  return post.status === 'recruiting' || post.status === 'consulting';
}

// ---- 필터: 지도·목록 공용 (기획서 5.1, 5.2) ----

export type PetFilter = {
  purpose: PetPurpose | 'all';
  kind: PetKind | 'all';
  breed: string; // 'all' 또는 고른 종류의 품종·종. 종류를 바꾸면 'all'로 되돌린다.
  sex: PetSex | 'all';
  distanceKm: [number, number]; // 검색 중심에서 최소~최대 직선거리
};

export const DISTANCE_LIMIT_KM = 100;
export const quickMaxDistancesKm = [5, 10, 20, 50, 100];
export const defaultPetFilter: PetFilter = { purpose: 'all', kind: 'all', breed: 'all', sex: 'all', distanceKm: [0, 20] };

export const purposeFilterOptions: { value: PetFilter['purpose']; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'mating', label: '교배 상대' },
  { value: 'adoption', label: '입양' },
];
export const kindFilterOptions: { value: PetFilter['kind']; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'bird', label: kindLabels.bird },
  { value: 'dog', label: kindLabels.dog },
  { value: 'cat', label: kindLabels.cat },
];
export const sexFilterOptions: { value: PetFilter['sex']; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'male', label: sexLabels.male },
  { value: 'female', label: sexLabels.female },
  { value: 'unknown', label: sexLabels.unknown },
];

// 최소값이 0이면 `20km 이내`, 아니면 `5~20km`
export function distanceRangeLabel([min, max]: [number, number]): string {
  return min === 0 ? `${max}km 이내` : `${min}~${max}km`;
}

// 목적 외에 기본값과 다른 조건 수 (필터 버튼 배지)
export function activeFilterCount(filter: PetFilter): number {
  const [min, max] = filter.distanceKm;
  const [defaultMin, defaultMax] = defaultPetFilter.distanceKm;
  return [filter.kind !== 'all', filter.breed !== 'all', filter.sex !== 'all', min !== defaultMin || max !== defaultMax].filter(Boolean).length;
}

function matchesFilter(post: PetPost, distance: number, filter: PetFilter): boolean {
  const [min, max] = filter.distanceKm;
  return (
    (filter.purpose === 'all' || post.purpose === filter.purpose) &&
    (filter.kind === 'all' || post.pet.kind === filter.kind) &&
    (filter.breed === 'all' || post.pet.breed === filter.breed) &&
    (filter.sex === 'all' || post.pet.sex === filter.sex) &&
    distance >= min * 1000 &&
    distance <= max * 1000
  );
}

// 검색 중심 기준으로 필터에 맞는 모집 중·상담 중 글을 가까운 순으로 고른다.
export function nearbyListedPosts(posts: PetPost[], center: LatLng, filter: PetFilter): { post: PetPost; distance: number }[] {
  return posts
    .filter(isListed)
    .map((post) => ({ post, distance: distanceToPost(center, post) }))
    .filter(({ post, distance }) => matchesFilter(post, distance, filter))
    .sort((a, b) => a.distance - b.distance);
}

// 상단에 보여 줄 검색 지역 이름: 검색 중심에서 가장 가까운 동네 (데모 동네 표 기준).
export function nearestNeighborhood(point: LatLng): Neighborhood {
  return neighborhoods.reduce((best, item) => (distanceBetween(point, item) < distanceBetween(point, best) ? item : best));
}
