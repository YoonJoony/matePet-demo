// 교배·입양 등록 폼의 입력 상태, 검사, 등록 글 변환 (기획서 7.1·7.2·7.4.1).
import {
  findNeighborhood,
  me,
  Neutered,
  PetKind,
  PetPhoto,
  PetPost,
  PetPurpose,
  PetSex,
  usesHealthChecks,
  Vaccination,
} from '@/data/pets';

export const MAX_PHOTOS = 10;
export const TITLE_MAX = 40;
export const TEXT_MAX = 1000;

export type PetDraft = {
  photos: PetPhoto[];
  title: string;
  description: string;
  name: string;
  kind: PetKind | null;
  breed: string;
  sex: PetSex | null;
  ageMode: 'birth' | 'estimate';
  birthDate: string;
  estimatedAge: string;
  condition: string;
  vaccination: Vaccination | null;
  neutered: Neutered | null;
  wantKind: PetKind | null;
  wantBreed: string;
  wantSex: PetSex | null;
  wantMemo: string;
  reason: string;
  personality: string;
  habits: string;
  neighborhood: string;
  addressDetail: string;
  chat: boolean;
  showPhone: boolean;
  phone: string;
  memo: string;
};

// 등록 위치와 연락처는 사용자 기본 설정값을 미리 채운다 (기획서 2.1·7.1).
export function emptyDraft(): PetDraft {
  return {
    photos: [],
    title: '',
    description: '',
    name: '',
    kind: null,
    breed: '',
    sex: null,
    ageMode: 'estimate',
    birthDate: '',
    estimatedAge: '',
    condition: '',
    vaccination: null,
    neutered: null,
    wantKind: null,
    wantBreed: '',
    wantSex: null,
    wantMemo: '',
    reason: '',
    personality: '',
    habits: '',
    neighborhood: me.defaultNeighborhood,
    addressDetail: me.defaultAddressDetail,
    chat: true,
    showPhone: false,
    phone: me.phone,
    memo: '',
  };
}

// 글 수정: 등록된 글을 폼 입력 상태로 되돌린다.
export function postToDraft(post: PetPost): PetDraft {
  const { pet, health, mating, adoption, contact } = post;
  return {
    ...emptyDraft(),
    photos: post.photos,
    title: post.title,
    description: post.description,
    name: pet.name,
    kind: pet.kind,
    breed: pet.breed,
    sex: pet.sex,
    ageMode: pet.birthDate ? 'birth' : 'estimate',
    birthDate: pet.birthDate,
    estimatedAge: pet.estimatedAge,
    condition: health.condition,
    vaccination: health.vaccination,
    neutered: health.neutered,
    wantKind: mating?.wantKind ?? null,
    wantBreed: mating?.wantBreed ?? '',
    wantSex: mating?.wantSex ?? null,
    wantMemo: mating?.memo ?? '',
    reason: adoption?.reason ?? '',
    personality: adoption?.personality ?? '',
    habits: adoption?.habits ?? '',
    neighborhood: post.area.name,
    addressDetail: post.addressDetail,
    chat: contact.chat,
    showPhone: contact.phone !== null,
    phone: contact.phone ?? me.phone,
    memo: post.memo,
  };
}

export function isDraftDirty(draft: PetDraft): boolean {
  return JSON.stringify(draft) !== JSON.stringify(emptyDraft());
}

export type DraftField = 'photos' | 'title' | 'kind' | 'sex' | 'neighborhood' | 'vaccination' | 'neutered' | 'birthDate' | 'contact';
export type DraftErrors = Partial<Record<DraftField, string>>;

// 필수: 사진 1장 이상, 제목, 종류, 성별, 등록 동네. 강아지·고양이는 예방접종·중성화도 필수 (기획서 7.4.1).
export function validateDraft(draft: PetDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.photos.length === 0) errors.photos = '사진을 1장 이상 올려 주세요.';
  if (!draft.title.trim()) errors.title = '제목을 적어 주세요.';
  if (!draft.kind) errors.kind = '동물 종류를 골라 주세요.';
  if (!draft.sex) errors.sex = '성별을 골라 주세요. 모르면 미확인을 고르면 돼요.';
  if (!draft.neighborhood) errors.neighborhood = '등록 동네를 골라 주세요.';
  if (draft.kind && usesHealthChecks(draft.kind)) {
    if (!draft.vaccination) errors.vaccination = '예방접종 여부를 골라 주세요.';
    if (!draft.neutered) errors.neutered = '중성화 여부를 골라 주세요.';
  }
  if (draft.ageMode === 'birth' && draft.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)) {
    errors.birthDate = '생년월일은 2024-05-01 형식으로 적어 주세요.';
  }
  if (!draft.chat && !(draft.showPhone && draft.phone.trim())) errors.contact = '채팅이나 전화 중 하나는 연락 방법으로 열어 두어야 해요.';
  return errors;
}

// 오류를 위에서부터 보여 주기 위한 순서
export const fieldOrder: DraftField[] = ['photos', 'title', 'kind', 'sex', 'birthDate', 'vaccination', 'neutered', 'neighborhood', 'contact'];

const placeholderByKind: Record<PetKind, { emoji: string; color: string }> = {
  dog: { emoji: '🐶', color: '#4A3F55' },
  cat: { emoji: '🐱', color: '#3B4A3F' },
  bird: { emoji: '🦜', color: '#4A4A2E' },
};

export function draftToPost(purpose: PetPurpose, draft: PetDraft): PetPost {
  const kind = draft.kind ?? 'dog';
  const healthChecks = usesHealthChecks(kind);
  return {
    id: `my-${Date.now()}`,
    purpose,
    status: 'recruiting',
    title: draft.title.trim(),
    description: draft.description.trim(),
    pet: {
      name: draft.name.trim(),
      kind,
      breed: draft.breed || '모름',
      sex: draft.sex ?? 'unknown',
      birthDate: draft.ageMode === 'birth' ? draft.birthDate : '',
      estimatedAge: draft.ageMode === 'estimate' ? draft.estimatedAge.trim() : '',
    },
    health: {
      condition: draft.condition.trim(),
      vaccination: healthChecks ? draft.vaccination : null,
      neutered: healthChecks ? draft.neutered : null,
    },
    mating: purpose === 'mating' ? { wantKind: draft.wantKind, wantBreed: draft.wantBreed, wantSex: draft.wantSex, memo: draft.wantMemo.trim() } : null,
    adoption:
      purpose === 'adoption' ? { reason: draft.reason.trim(), personality: draft.personality.trim(), habits: draft.habits.trim() } : null,
    photos: draft.photos,
    placeholder: placeholderByKind[kind],
    area: findNeighborhood(draft.neighborhood), // 공개 위치 = 동네 중심점
    addressDetail: draft.addressDetail.trim(), // 비공개
    contact: { chat: draft.chat, phone: draft.showPhone && draft.phone.trim() ? draft.phone.trim() : null },
    memo: draft.memo.trim(),
    authorId: me.id,
    author: me.nickname,
    createdAt: Date.now(),
  };
}
