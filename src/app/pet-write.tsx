import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ComponentRef, ReactNode, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DraftErrors,
  DraftField,
  draftToPost,
  emptyDraft,
  fieldOrder,
  isDraftDirty,
  MAX_PHOTOS,
  PetDraft,
  postToDraft,
  TEXT_MAX,
  TITLE_MAX,
  validateDraft,
} from '@/components/pets/petForm';
import { pickImages } from '@/components/pets/pickImages';
import { CheckRow, ChoiceChips, ConfirmDialog, Field, Input, SectionTitle } from '@/components/pets/ui';
import { colors } from '@/components/theme';
import {
  breedsByKind,
  kindLabels,
  me,
  neuteredLabels,
  PetKind,
  PetPurpose,
  purposeColors,
  purposeLabels,
  sexLabels,
  usesHealthChecks,
  vaccinationLabels,
} from '@/data/pets';
import { regionParents } from '@/data/regions';
import { usePetPosts } from '@/state/petPosts';
import { useRegionPicker } from '@/state/regionPicker';

const kindOptions = (Object.keys(kindLabels) as PetKind[]).map((value) => ({ value, label: kindLabels[value] }));
const sexOptions = (Object.keys(sexLabels) as (keyof typeof sexLabels)[]).map((value) => ({ value, label: sexLabels[value] }));
const vaccinationOptions = (Object.keys(vaccinationLabels) as (keyof typeof vaccinationLabels)[]).map((value) => ({ value, label: vaccinationLabels[value] }));
const neuteredOptions = (Object.keys(neuteredLabels) as (keyof typeof neuteredLabels)[]).map((value) => ({ value, label: neuteredLabels[value] }));
const breedOptions = (kind: PetKind) => breedsByKind[kind].map((breed) => ({ value: breed, label: breed }));

// 입력 화면을 다시 그려도 입력칸이 새로 만들어지지 않도록 화면 밖에 둔다.
function Anchor({ onY, children }: { onY: (y: number) => void; children: ReactNode }) {
  return <View onLayout={(event) => onY(event.nativeEvent.layout.y)}>{children}</View>;
}

export default function PetWriteScreen() {
  const params = useLocalSearchParams<{ purpose?: string; editId?: string }>();
  const { drafts, saveDraft, clearDraft, addPost, updatePost, findPost } = usePetPosts();
  // editId가 있으면 그 글을 수정한다 (기획서 11 — 등록·수정 후 관련 화면에 반영). 수정에는 임시저장을 쓰지 않는다.
  // 글이 없거나(새로고침 등) 내 글이 아니면 수정 폼을 열지 않는다 — 새 글로 바뀌어 중복 등록되는 것을 막는다.
  const target = params.editId ? findPost(params.editId) : undefined;
  const editing = target && target.authorId === me.id ? target : undefined;
  const editBlocked = params.editId !== undefined && !editing;
  const purpose: PetPurpose = editing?.purpose ?? (params.purpose === 'adoption' ? 'adoption' : 'mating');
  const savedDraft = editing ? undefined : drafts[purpose];
  const [initialDraft] = useState<PetDraft>(() => (editing ? postToDraft(editing) : (savedDraft ?? emptyDraft())));

  // 임시저장한 글이 있으면 불러와서 시작한다.
  const [draft, setDraft] = useState<PetDraft>(initialDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [toast, setToast] = useState<string | null>(savedDraft ? '임시저장한 글을 불러왔어요.' : null);
  const [addressNotice, setAddressNotice] = useState<string | null>(null);
  const { pickPostRegion } = useRegionPicker();
  const [confirmExit, setConfirmExit] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [fieldY, setFieldY] = useState<Partial<Record<DraftField, number>>>({});

  const update = (patch: Partial<PetDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    // 고친 항목의 오류 표시는 바로 지운다.
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch)) delete next[key as DraftField];
      if ('chat' in patch || 'showPhone' in patch || 'phone' in patch) delete next.contact;
      if ('ageMode' in patch) delete next.birthDate;
      if ('region' in patch) delete next.neighborhood;
      return next;
    });
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 2200);
  };

  // 종류를 바꾸면 이전 종류에만 해당하는 품종은 초기화한다 (기획서 5.1). 조류는 접종·중성화를 받지 않는다.
  const changeKind = (kind: PetKind) => {
    if (kind === draft.kind) return;
    update({
      kind,
      breed: '',
      ...(usesHealthChecks(kind) ? {} : { vaccination: null, neutered: null }),
      ...(purpose === 'mating' && (draft.wantKind === null || draft.wantKind === draft.kind) ? { wantKind: kind, wantBreed: '' } : {}),
    });
  };

  const addPhotos = async () => {
    const remaining = MAX_PHOTOS - draft.photos.length;
    if (remaining <= 0) return showToast(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`);
    const picked = await pickImages(remaining);
    if (picked.length) update({ photos: [...draft.photos, ...picked].slice(0, MAX_PHOTOS) });
  };

  // 등록 동네 변경: 공통 동네 선택 화면을 열고, 고른 동네만 이 작성 화면에 반영한다(다른 입력값·홈 탐색 위치·기본 동네는 그대로).
  const changeRegion = async () => {
    const picked = await pickPostRegion(draft.region);
    if (!picked || picked.code === draft.region?.code) return;
    update({ region: picked });
    // 상세 주소는 덮어쓰지 않고, 새 동네와 맞는지 확인하도록 안내만 한다.
    setAddressNotice(
      draft.addressDetail.trim() ? `등록 동네를 ${picked.name}(으)로 바꿨어요. 아래 상세 주소가 새 동네와 맞는지 확인해 주세요.` : null,
    );
  };

  const save = () => {
    saveDraft(purpose, draft);
    showToast('임시저장했어요.');
  };

  const close = () => {
    const unchanged = editing || savedDraft ? JSON.stringify(initialDraft) === JSON.stringify(draft) : !isDraftDirty(draft);
    if (unchanged) router.back();
    else setConfirmExit(true);
  };

  const submit = () => {
    const found = validateDraft(draft);
    const firstError = fieldOrder.find((field) => found[field]);
    if (firstError) {
      setErrors(found);
      showToast(`확인이 필요한 항목이 ${Object.keys(found).length}개 있어요.`);
      scrollRef.current?.scrollTo({ y: Math.max((fieldY[firstError] ?? 0) - 16, 0), animated: true });
      return;
    }
    const post = draftToPost(purpose, draft);
    if (editing) {
      // 글 번호·상태·작성 시각·작성자는 그대로 두고 내용만 바꾼다.
      updatePost(editing.id, { ...post, id: editing.id, status: editing.status, createdAt: editing.createdAt, authorId: editing.authorId, author: editing.author });
      router.back();
      return;
    }
    addPost(post);
    clearDraft(purpose);
    router.replace({ pathname: '/pet/[id]', params: { id: post.id } });
  };

  // 오류가 난 항목으로 스크롤하기 위해 각 항목의 위치를 기억한다.
  const remember = (name: DraftField) => (y: number) => setFieldY((prev) => (prev[name] === y ? prev : { ...prev, [name]: y }));

  const healthChecks = draft.kind ? usesHealthChecks(draft.kind) : false;

  if (editBlocked) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable testID="write-close" accessibilityLabel="닫기" hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="close" size={30} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>글 수정</Text>
          <View style={styles.headerSpace} />
        </View>
        <Text testID="write-edit-blocked" style={styles.blocked}>
          {target ? '내가 쓴 글만 수정할 수 있어요.' : '수정할 글을 찾을 수 없어요. 새로고침하면 데모 데이터가 처음 상태로 돌아가요.'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable testID="write-close" accessibilityLabel="닫기" hitSlop={8} onPress={close}>
          <Ionicons name="close" size={30} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {editing ? `${purposeLabels[purpose]} 글 수정` : `${draft.region?.name ?? '동네'}에 ${purposeLabels[purpose]} 등록`}
        </Text>
        {editing ? (
          <View style={styles.headerSpace} />
        ) : (
          <Pressable testID="write-save-draft" hitSlop={8} onPress={save}>
            <Text style={styles.headerAction}>임시저장</Text>
          </Pressable>
        )}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.purposeBanner, { borderColor: purposeColors[purpose] }]}>
          <Text style={[styles.purposeText, { color: purposeColors[purpose] }]}>
            {purpose === 'mating' ? '교배 상대를 찾는 글이에요' : '입양 가족을 찾는 글이에요'}
          </Text>
        </View>

        {/* 사진 */}
        <Anchor onY={remember('photos')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            <Pressable testID="write-add-photo" accessibilityLabel="사진 추가" onPress={addPhotos} style={[styles.photoAdd, errors.photos && styles.photoAddError]}>
              <Ionicons name="camera" size={26} color={colors.subText} />
              <Text style={styles.photoCount}>
                {draft.photos.length}/{MAX_PHOTOS}
              </Text>
            </Pressable>
            {draft.photos.map((photo, index) => (
              <View key={photo.uri} style={styles.photoThumb}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                {index === 0 && <Text style={styles.photoMain}>대표 사진</Text>}
                <Pressable
                  accessibilityLabel={`사진 ${index + 1} 삭제`}
                  onPress={() => update({ photos: draft.photos.filter((item) => item.uri !== photo.uri) })}
                  style={styles.photoRemove}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          {errors.photos ? <Text style={styles.errorText}>{errors.photos}</Text> : <Text style={styles.hintText}>선명한 대표 사진을 먼저 올려 주세요.</Text>}
        </Anchor>

        {/* 글 정보 */}
        <Anchor onY={remember('title')}>
          <Field label="제목" required error={errors.title} hint={`${draft.title.length}/${TITLE_MAX}`}>
            <Input testID="write-title" value={draft.title} onChangeText={(title) => update({ title })} placeholder="제목을 입력해 주세요." maxLength={TITLE_MAX} error={!!errors.title} />
          </Field>
        </Anchor>
        <Field label="자세한 설명">
          <Input
            testID="write-description"
            value={draft.description}
            onChangeText={(description) => update({ description })}
            placeholder={purpose === 'mating' ? '아이의 특징과 교배를 원하는 이유를 적어 주세요.' : '아이를 소개하고 입양을 보내는 이유를 적어 주세요.'}
            multiline
            maxLength={TEXT_MAX}
          />
        </Field>

        {/* 동물 정보 */}
        <SectionTitle>동물 정보</SectionTitle>
        <Field label="이름">
          <Input testID="write-name" value={draft.name} onChangeText={(name) => update({ name })} placeholder="예: 콩이" maxLength={20} />
        </Field>
        <Anchor onY={remember('kind')}>
          <Field label="종류" required error={errors.kind}>
            <ChoiceChips testIDPrefix="write-kind" options={kindOptions} value={draft.kind} onChange={changeKind} />
          </Field>
        </Anchor>
        <Field label="품종 또는 종" hint={draft.kind ? '모르면 모름, 섞였으면 믹스를 골라 주세요.' : '종류를 먼저 골라 주세요.'}>
          {draft.kind ? <ChoiceChips testIDPrefix="write-breed" options={breedOptions(draft.kind)} value={draft.breed || null} onChange={(breed) => update({ breed })} /> : null}
        </Field>
        <Anchor onY={remember('sex')}>
          <Field label="성별" required error={errors.sex}>
            <ChoiceChips testIDPrefix="write-sex" options={sexOptions} value={draft.sex} onChange={(sex) => update({ sex })} />
          </Field>
        </Anchor>
        <Anchor onY={remember('birthDate')}>
          <Field label="나이" error={errors.birthDate} hint="정확한 생일을 모르면 추정 나이로 적어도 돼요.">
            <ChoiceChips
              testIDPrefix="write-age-mode"
              options={[
                { value: 'estimate', label: '추정 나이' },
                { value: 'birth', label: '생년월일' },
              ]}
              value={draft.ageMode}
              onChange={(ageMode) => update({ ageMode })}
            />
            {draft.ageMode === 'birth' ? (
              <Input testID="write-birth" value={draft.birthDate} onChangeText={(birthDate) => update({ birthDate })} placeholder="2024-05-01" maxLength={10} error={!!errors.birthDate} />
            ) : (
              <Input testID="write-estimated-age" value={draft.estimatedAge} onChangeText={(estimatedAge) => update({ estimatedAge })} placeholder="예: 약 2살" maxLength={20} />
            )}
          </Field>
        </Anchor>

        {/* 건강 정보 */}
        <SectionTitle>건강 정보</SectionTitle>
        <Field label="건강 상태" hint="보호자가 알고 있는 내용을 적어 주세요. 앱이 건강 상태를 판정하지는 않아요.">
          <Input testID="write-condition" value={draft.condition} onChangeText={(condition) => update({ condition })} placeholder="예: 정기 검진 이상 없음" maxLength={200} />
        </Field>
        {healthChecks ? (
          <>
            <Anchor onY={remember('vaccination')}>
              <Field label="예방접종" required error={errors.vaccination}>
                <ChoiceChips testIDPrefix="write-vaccination" options={vaccinationOptions} value={draft.vaccination} onChange={(vaccination) => update({ vaccination })} />
              </Field>
            </Anchor>
            <Anchor onY={remember('neutered')}>
              <Field label="중성화" required error={errors.neutered}>
                <ChoiceChips testIDPrefix="write-neutered" options={neuteredOptions} value={draft.neutered} onChange={(neutered) => update({ neutered })} />
              </Field>
            </Anchor>
          </>
        ) : (
          <Text style={styles.hintText}>{draft.kind === 'bird' ? '조류는 예방접종·중성화 항목을 받지 않아요.' : '종류를 고르면 예방접종·중성화 항목이 나타나요.'}</Text>
        )}

        {/* 목적별 입력 (기획서 7.2) */}
        {purpose === 'mating' ? (
          <>
            <SectionTitle>찾는 상대</SectionTitle>
            <Field label="상대 종류">
              <ChoiceChips testIDPrefix="write-want-kind" options={kindOptions} value={draft.wantKind} onChange={(wantKind) => update({ wantKind, wantBreed: '' })} />
            </Field>
            {draft.wantKind ? (
              <Field label="상대 품종">
                <ChoiceChips testIDPrefix="write-want-breed" options={breedOptions(draft.wantKind)} value={draft.wantBreed || null} onChange={(wantBreed) => update({ wantBreed })} />
              </Field>
            ) : null}
            <Field label="상대 성별">
              <ChoiceChips testIDPrefix="write-want-sex" options={sexOptions.filter((option) => option.value !== 'unknown')} value={draft.wantSex} onChange={(wantSex) => update({ wantSex })} />
            </Field>
            <Field label="희망 조건 메모">
              <Input testID="write-want-memo" value={draft.wantMemo} onChangeText={(wantMemo) => update({ wantMemo })} placeholder="예: 같은 품종, 3살 이하" multiline maxLength={TEXT_MAX} />
            </Field>
          </>
        ) : (
          <>
            <SectionTitle>아이 소개</SectionTitle>
            <Field label="입양 사유">
              <Input testID="write-reason" value={draft.reason} onChangeText={(reason) => update({ reason })} placeholder="예: 해외 이사로 함께하기 어려워요" maxLength={200} />
            </Field>
            <Field label="성격">
              <Input testID="write-personality" value={draft.personality} onChangeText={(personality) => update({ personality })} placeholder="예: 조용하고 애교가 많아요" maxLength={200} />
            </Field>
            <Field label="생활 습관">
              <Input testID="write-habits" value={draft.habits} onChangeText={(habits) => update({ habits })} placeholder="예: 하루 두 번 산책, 배변 훈련 완료" maxLength={200} />
            </Field>
          </>
        )}

        {/* 위치 (기획서 7.4) */}
        <SectionTitle>등록 위치</SectionTitle>
        <Anchor onY={remember('neighborhood')}>
          <Field label="등록 동네" required error={errors.neighborhood}>
            <View testID="write-region" style={styles.regionCard}>
              <View style={styles.regionInfo}>
                <Text style={styles.regionName}>{draft.region?.name ?? '동네를 선택해 주세요'}</Text>
                {draft.region ? <Text style={styles.regionParents}>{regionParents(draft.region)}</Text> : null}
              </View>
              <Pressable testID="write-region-change" accessibilityRole="button" onPress={changeRegion} style={styles.regionChange}>
                <Text style={styles.regionChangeText}>변경</Text>
              </Pressable>
            </View>
            {draft.region ? <Text style={styles.hintText}>지도와 글에는 ‘{draft.region.name} 부근’으로 표시돼요.</Text> : null}
            {addressNotice ? (
              <Text testID="write-address-notice" style={styles.noticeText}>
                {addressNotice}
              </Text>
            ) : null}
          </Field>
        </Anchor>
        <Field label="상세 주소 (비공개)" hint={`지도와 글에는 '${draft.region?.name ?? '등록 동네'} 부근'으로만 표시되고 상세 주소는 공개되지 않아요.`}>
          <Input testID="write-address" value={draft.addressDetail} onChangeText={(addressDetail) => update({ addressDetail })} placeholder="예: 테헤란로 000" maxLength={100} />
        </Field>

        {/* 연락 */}
        <SectionTitle>연락 방법</SectionTitle>
        <Anchor onY={remember('contact')}>
          <View style={styles.contact}>
            <CheckRow testID="write-chat" checked={draft.chat} label="채팅으로 연락 받기" onToggle={() => update({ chat: !draft.chat })} />
            <CheckRow testID="write-show-phone" checked={draft.showPhone} label="전화번호 공개하기" onToggle={() => update({ showPhone: !draft.showPhone })} />
            {draft.showPhone ? (
              <Input testID="write-phone" value={draft.phone} onChangeText={(phone) => update({ phone })} placeholder="010-0000-0000" keyboardType="phone-pad" maxLength={13} />
            ) : null}
            <Text style={styles.hintText}>데모에서는 샘플 번호를 쓰고, 실제로 전화가 걸리지 않아요.</Text>
            {errors.contact ? <Text style={styles.errorText}>{errors.contact}</Text> : null}
          </View>
        </Anchor>

        {/* 추가 정보 */}
        <Field label="추가 메모">
          <Input testID="write-memo" value={draft.memo} onChangeText={(memo) => update({ memo })} placeholder="그 밖에 알려 주고 싶은 내용을 적어 주세요." multiline maxLength={TEXT_MAX} />
        </Field>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable testID="write-submit" accessibilityRole="button" onPress={submit} style={styles.submit}>
          <Text style={styles.submitText}>{editing ? '수정 완료' : '작성 완료'}</Text>
        </Pressable>
      </View>

      {toast ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text testID="write-toast" style={styles.toastText}>
            {toast}
          </Text>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmExit && !!editing}
        title="수정을 그만둘까요?"
        message="바꾼 내용은 저장되지 않아요."
        onDismiss={() => setConfirmExit(false)}
        actions={[
          { label: '계속 수정', onPress: () => setConfirmExit(false) },
          {
            label: '그만두기',
            primary: true,
            onPress: () => {
              setConfirmExit(false);
              router.back();
            },
          },
        ]}
      />
      <ConfirmDialog
        visible={confirmExit && !editing}
        title="작성 중인 글을 저장할까요?"
        message="저장하면 다음에 같은 등록 화면을 열 때 이어서 쓸 수 있어요."
        onDismiss={() => setConfirmExit(false)}
        actions={[
          {
            label: '저장 안 함',
            onPress: () => {
              setConfirmExit(false);
              router.back();
            },
          },
          {
            label: '저장하기',
            primary: true,
            onPress: () => {
              saveDraft(purpose, draft);
              setConfirmExit(false);
              router.back();
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  headerAction: { fontSize: 16, color: colors.subText },
  headerSpace: { width: 56 },
  blocked: { margin: 32, textAlign: 'center', fontSize: 15, lineHeight: 22, color: colors.subText },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  purposeBanner: { alignSelf: 'flex-start', marginTop: 4, marginBottom: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  purposeText: { fontSize: 13, fontWeight: '700' },
  photoRow: { gap: 10, paddingVertical: 4 },
  photoAdd: {
    width: 76,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddError: { borderColor: '#FF5C5C' },
  photoCount: { fontSize: 13, color: colors.subText },
  photoThumb: { width: 76, height: 76, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surfaceRaised },
  photoImage: { width: '100%', height: '100%' },
  photoMain: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 2, textAlign: 'center', fontSize: 11, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.6)' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  hintText: { marginTop: 8, fontSize: 13, color: colors.subText },
  errorText: { marginTop: 8, fontSize: 13, color: '#FF5C5C' },
  noticeText: { marginTop: 8, fontSize: 13, lineHeight: 19, color: colors.caution },
  regionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.surfaceStrong },
  regionInfo: { flex: 1, gap: 2 },
  regionName: { fontSize: 17, fontWeight: '700', color: colors.text },
  regionParents: { fontSize: 13, color: colors.subText },
  regionChange: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  regionChangeText: { fontSize: 15, fontWeight: '600', color: colors.text },
  contact: { marginTop: 16, gap: 10 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: colors.background },
  submit: { height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  submitText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  toast: { position: 'absolute', left: 24, right: 24, bottom: 100, alignItems: 'center' },
  toastText: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, overflow: 'hidden', fontSize: 14, color: colors.background, backgroundColor: colors.text },
});
