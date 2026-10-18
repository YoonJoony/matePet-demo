import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ComponentProps, ReactNode, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog, PetImage, PurposeBadge } from '@/components/pets/ui';
import { colors } from '@/components/theme';
import {
  distanceToPost,
  formatApproxDistance,
  kindLabels,
  me,
  neuteredLabels,
  petAgeLabel,
  PostStatus,
  sexLabels,
  statusLabels,
  timeAgoLabel,
  usesHealthChecks,
  vaccinationLabels,
} from '@/data/pets';
import { useChats } from '@/state/chats';
import { useMapState } from '@/state/mapState';
import { usePetPosts } from '@/state/petPosts';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

type Notice = { title: string; message: string } | null;

// 등록 글 상세 (기획서 7.3 순서): 사진 → 목적·제목·상태 → 종류·품종·성별·나이 → 건강 → 지역·거리 → 소개·메모 → 작성자
export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findPost, likedIds, toggleLike, updatePost } = usePetPosts();
  const { openRoomForPost } = useChats();
  const [statusOpen, setStatusOpen] = useState(false);
  const { myLocation } = useMapState();
  const { width } = useWindowDimensions();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const post = findPost(id);

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar />
        <View style={styles.center}>
          <Text style={styles.meta}>등록 글을 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const liked = likedIds.has(post.id);
  const mine = post.authorId === me.id;
  // 나와의 거리는 실제 현재 위치를 알 때만, 모르면 기본 지역 기준으로 구분해 표시한다 (기획서 5.3).
  const located = myLocation.status === 'granted';
  // 위치를 모르면 기본 동네의 대표 위치에서 잰다.
  const distance = formatApproxDistance(distanceToPost(located ? myLocation.location : me.homeRegion, post));
  const distanceLabel = located ? `나와의 거리 ${distance}` : `기본 동네(${me.homeRegion.name}) 기준 ${distance}`;
  const photoWidth = Math.min(width, 480);
  const { pet, health } = post;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TopBar area={post.area.name} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 1. 사진 */}
        {post.photos.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / photoWidth))}
              scrollEventThrottle={32}
            >
              {post.photos.map((photo, index) => (
                <Image key={photo.uri} source={{ uri: photo.uri }} style={{ width: photoWidth, height: photoWidth }} accessibilityLabel={`${post.title} 사진 ${index + 1}`} />
              ))}
            </ScrollView>
            <Text style={styles.photoIndex}>
              {photoIndex + 1} / {post.photos.length}
            </Text>
          </View>
        ) : (
          <PetImage post={post} style={{ width: '100%', aspectRatio: 1 }} emojiSize={120} />
        )}

        <View style={styles.body}>
          {/* 2. 목적·제목·상태 */}
          <View style={styles.badgeRow}>
            <PurposeBadge purpose={post.purpose} />
            <Text testID="pet-status" style={[styles.status, post.status === 'recruiting' && styles.statusOpen]}>
              {statusLabels[post.status]}
            </Text>
          </View>
          <Text testID="pet-title" style={styles.title}>
            {post.title}
          </Text>
          <Text style={styles.meta}>{timeAgoLabel(post.createdAt)}</Text>

          {/* 3. 종류·품종·성별·나이 */}
          <Section title="동물 정보">
            <Row label="이름" value={pet.name || '정보 없음'} />
            <Row label="종류·품종" value={`${kindLabels[pet.kind]} · ${pet.breed}`} />
            <Row label="성별" value={sexLabels[pet.sex]} />
            <Row label="나이" value={petAgeLabel(pet)} />
          </Section>

          {/* 4. 건강 */}
          <Section title="건강 정보">
            <Row label="건강 상태" value={health.condition || '정보 없음'} />
            {usesHealthChecks(pet.kind) ? (
              <>
                <Row label="예방접종" value={health.vaccination ? vaccinationLabels[health.vaccination] : '정보 없음'} />
                <Row label="중성화" value={health.neutered ? neuteredLabels[health.neutered] : '정보 없음'} />
              </>
            ) : null}
            <Text style={styles.small}>보호자가 입력한 내용이에요. 앱이 건강 상태를 확인하거나 판정하지 않아요.</Text>
          </Section>

          {/* 목적별 정보 */}
          {post.mating ? (
            <Section title="찾는 상대">
              <Row label="종류·품종" value={[post.mating.wantKind ? kindLabels[post.mating.wantKind] : '', post.mating.wantBreed].filter(Boolean).join(' · ') || '상관없음'} />
              <Row label="성별" value={post.mating.wantSex ? sexLabels[post.mating.wantSex] : '상관없음'} />
              {post.mating.memo ? <Text style={styles.paragraph}>{post.mating.memo}</Text> : null}
            </Section>
          ) : null}

          {/* 5. 지역·거리 (공개 위치 기준) */}
          <Section title="등록 지역">
            <Text testID="pet-area" style={styles.paragraph}>
              {post.area.name} 부근 ({post.area.sigungu}) · {distanceLabel}
            </Text>
            <Text style={styles.small}>실시간 위치가 아니라 등록한 동네 기준이에요. 만날 장소는 채팅으로 정해 주세요.</Text>
          </Section>

          {/* 6. 소개·메모 */}
          {post.description || post.adoption || post.memo ? (
            <Section title="소개">
              {post.description ? <Text style={styles.paragraph}>{post.description}</Text> : null}
              {post.adoption?.reason ? <Row label="입양 사유" value={post.adoption.reason} /> : null}
              {post.adoption?.personality ? <Row label="성격" value={post.adoption.personality} /> : null}
              {post.adoption?.habits ? <Row label="생활 습관" value={post.adoption.habits} /> : null}
              {post.memo ? <Text style={styles.paragraph}>{post.memo}</Text> : null}
            </Section>
          ) : null}

          {/* 7. 작성자 */}
          <Section title="작성자">
            <View style={styles.author}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={colors.subText} />
              </View>
              <View>
                <Text style={styles.authorName}>{post.author}</Text>
                <Text style={styles.meta}>{post.area.name}</Text>
              </View>
            </View>
          </Section>
        </View>
      </ScrollView>

      {/* 하단: 찜하기·전화하기·채팅하기 (댓글 없음). 내 글이면 상태 변경·수정하기 (기획서 7.5) */}
      {mine ? (
        <View style={styles.bottomBar}>
          <ActionButton icon="swap-horizontal" label="상태 변경" onPress={() => setStatusOpen(true)} />
          <ActionButton
            icon="create-outline"
            label="수정하기"
            primary
            onPress={() => router.push({ pathname: '/pet-write', params: { purpose: post.purpose, editId: post.id } })}
          />
        </View>
      ) : (
        <View style={styles.bottomBar}>
          <Pressable testID="pet-like" accessibilityLabel={liked ? '찜 해제' : '찜하기'} accessibilityState={{ selected: liked }} onPress={() => toggleLike(post.id)} hitSlop={8}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={28} color={liked ? colors.primary : colors.text} />
          </Pressable>
          <ActionButton
            icon="call"
            label="전화하기"
            disabled={!post.contact.phone}
            onPress={() => setNotice({ title: '전화하기 (데모)', message: `데모에서는 실제로 전화를 걸지 않아요.\n등록된 번호: ${post.contact.phone}` })}
          />
          <ActionButton
            icon="chatbubble-ellipses"
            label="채팅하기"
            primary
            disabled={!post.contact.chat}
            onPress={() => router.push({ pathname: '/chat-room/[id]', params: { id: openRoomForPost(post) } })}
          />
        </View>
      )}

      <StatusPicker
        visible={statusOpen}
        current={post.status}
        onSelect={(status) => {
          updatePost(post.id, { status });
          setStatusOpen(false);
        }}
        onDismiss={() => setStatusOpen(false)}
      />

      <ConfirmDialog visible={!!notice} title={notice?.title ?? ''} message={notice?.message} onDismiss={() => setNotice(null)} actions={[{ label: '확인', primary: true, onPress: () => setNotice(null) }]} />
    </SafeAreaView>
  );
}

const statusOrder: PostStatus[] = ['recruiting', 'consulting', 'done', 'paused'];
const statusHints: Record<PostStatus, string> = {
  recruiting: '지도와 목록에 보여요.',
  consulting: '지도와 목록에 상담 중으로 보여요.',
  done: '지도와 목록에서 빠지고, 찜한 사람은 완료로 확인해요.',
  paused: '지도와 목록에서 잠시 빠져요.',
};

// 작성자의 글 상태 변경 (모집 중 / 상담 중 / 완료 / 일시 중지)
function StatusPicker({ visible, current, onSelect, onDismiss }: { visible: boolean; current: PostStatus; onSelect: (status: PostStatus) => void; onDismiss: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.pickerBackdrop} onPress={onDismiss}>
        <Pressable style={styles.picker} onPress={() => undefined}>
          <Text style={styles.pickerTitle}>글 상태 변경</Text>
          {statusOrder.map((status) => {
            const selected = status === current;
            return (
              <Pressable
                key={status}
                testID={`status-${status}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onSelect(status)}
                style={styles.pickerRow}
              >
                <View style={styles.pickerText}>
                  <Text style={[styles.pickerLabel, selected && styles.pickerLabelSelected]}>{statusLabels[status]}</Text>
                  <Text style={styles.pickerHint}>{statusHints[status]}</Text>
                </View>
                {selected ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TopBar({ area }: { area?: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable testID="back-button" accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={goBack} hitSlop={8}>
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>
      {area ? <Text style={styles.topBarTitle}>{area}</Text> : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  primary,
  disabled,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`pet-${label}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, primary && styles.actionPrimary, disabled && styles.actionDisabled]}
    >
      <Ionicons name={icon} size={18} color={primary ? '#FFFFFF' : colors.text} />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{disabled ? `${label} 불가` : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  backIcon: { fontSize: 36, lineHeight: 40, color: colors.text },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  scroll: { paddingBottom: 24 },
  photoIndex: { position: 'absolute', right: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', fontSize: 12, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.5)' },
  body: { padding: 16 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { fontSize: 13, fontWeight: '600', color: colors.subText },
  statusOpen: { color: '#2DBE6C' },
  title: { marginTop: 8, fontSize: 22, fontWeight: '700', color: colors.text },
  meta: { marginTop: 4, fontSize: 13, color: colors.subText },
  section: { marginTop: 24, gap: 10, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', gap: 12 },
  rowLabel: { width: 80, fontSize: 15, color: colors.subText },
  rowValue: { flex: 1, fontSize: 15, color: colors.text },
  paragraph: { fontSize: 15, lineHeight: 22, color: colors.text },
  small: { fontSize: 12, color: colors.mutedText },
  author: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  authorName: { fontSize: 16, fontWeight: '700', color: colors.text },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  action: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, backgroundColor: colors.surfaceRaised },
  actionPrimary: { backgroundColor: colors.primary },
  actionDisabled: { opacity: 0.4 },
  actionText: { fontSize: 16, fontWeight: '700', color: colors.text },
  actionTextPrimary: { color: '#FFFFFF' },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  picker: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.surfaceRaised },
  pickerTitle: { marginBottom: 6, fontSize: 18, fontWeight: '700', color: colors.text },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pickerText: { flex: 1, gap: 2 },
  pickerLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  pickerLabelSelected: { color: colors.primary },
  pickerHint: { fontSize: 13, color: colors.subText },
});
