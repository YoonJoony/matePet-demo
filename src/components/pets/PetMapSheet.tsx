import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FilterEmptyState } from '@/components/pets/PetFilterBar';
import { PetImage, PurposeBadge } from '@/components/pets/ui';
import { colors } from '@/components/theme';
import {
  formatApproxDistance,
  kindLabels,
  petAgeLabel,
  PetPost,
  purposeColors,
  purposeGoalLabels,
  sexLabels,
  sexSymbols,
  statusLabels,
} from '@/data/pets';
import { usePetPosts } from '@/state/petPosts';

export type SheetMode = 'pets' | 'places';
export type NearbyPost = { post: PetPost; distance: number };

const modes: { value: SheetMode; label: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'pets', label: '동물 찾기', icon: 'paw' },
  { value: 'places', label: '주변 시설', icon: 'storefront' },
];

// 하단 시트 맨 위의 `동물 찾기 / 주변 시설` 전환 (기획서 4.4)
export function SheetModeSwitch({ mode, onChange }: { mode: SheetMode; onChange: (mode: SheetMode) => void }) {
  return (
    <View style={styles.switch} accessibilityRole="tablist">
      {modes.map((item) => {
        const active = item.value === mode;
        return (
          <Pressable
            key={item.value}
            testID={`sheet-mode-${item.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.value)}
            style={[styles.switchButton, active && styles.switchButtonActive]}
          >
            <Ionicons name={item.icon} size={16} color={active ? colors.textStrong : colors.subText} />
            <Text style={[styles.switchText, active && styles.switchTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// 제목과 닫기 버튼만 있는 시트 머리 (묶음 목록·동물 요약 공용)
export function SheetTitleHeader({ title, onClose, testID }: { title: string; onClose: () => void; testID: string }) {
  return (
    <View style={styles.titleHeader}>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <Pressable testID={testID} accessibilityLabel="닫기" hitSlop={8} onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

// 동물 찾기 기본 내용: 검색 중심에서 가까운 교배·입양 글
export function PetNearbyList({ items, onSelect }: { items: NearbyPost[]; onSelect: (id: string) => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>내 주변 교배·입양</Text>
        <Text style={styles.count}>{items.length}마리</Text>
      </View>
      <Text style={styles.notice}>지도 위치는 실시간 위치가 아니라 등록한 동네 기준이에요.</Text>
      {items.length === 0 ? <FilterEmptyState /> : <PetRows items={items} onSelect={onSelect} />}
    </View>
  );
}

export function PetRows({ items, onSelect }: { items: NearbyPost[]; onSelect: (id: string) => void }) {
  if (items.length === 0) return <Text style={styles.empty}>조건에 맞는 등록 글이 없어요.</Text>;
  return (
    <View style={styles.rows}>
      {items.map(({ post, distance }) => (
        <PetCompactRow key={post.id} post={post} distance={distance} onPress={() => onSelect(post.id)} />
      ))}
    </View>
  );
}

// 원형 사진 + 이름·품종·동네를 한 줄씩 보여 주는 작은 행 (지도 시트·프로필 공용)
export function PetCompactRow({ post, distance, onPress }: { post: PetPost; distance: number; onPress: () => void }) {
  const { likedIds } = usePetPosts();
  const { pet } = post;
  return (
    <Pressable
      testID={`pet-item-${post.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${pet.name}, ${post.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <PetImage post={post} emojiSize={26} style={{ ...styles.avatar, borderColor: purposeColors[post.purpose] }} />
      <View style={styles.rowInfo}>
        <View style={styles.rowTitle}>
          <PurposeBadge purpose={post.purpose} />
          <Text style={styles.petName} numberOfLines={1}>
            {pet.name} {sexSymbols[pet.sex]}
          </Text>
          {post.status !== 'recruiting' ? <Text style={styles.status}>{statusLabels[post.status]}</Text> : null}
        </View>
        <Text style={styles.rowLine} numberOfLines={1}>
          {kindLabels[pet.kind]} · {pet.breed} · {petAgeLabel(pet)}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {post.area.name} 부근 · {formatApproxDistance(distance)}
        </Text>
      </View>
      {likedIds.has(post.id) ? <Ionicons name="heart" size={18} color={colors.primary} /> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
    </Pressable>
  );
}

// 프로필을 골랐을 때의 동물 요약 (기획서 4.3)
export function PetSummary({ post, distance }: { post: PetPost; distance: number }) {
  const { likedIds, toggleLike } = usePetPosts();
  const liked = likedIds.has(post.id);
  const { pet } = post;

  return (
    <View testID="pet-summary" style={styles.summary}>
      <View style={styles.summaryTop}>
        <PetImage post={post} emojiSize={48} style={{ ...styles.summaryPhoto, borderColor: purposeColors[post.purpose] }} />
        <View style={styles.summaryInfo}>
          <View style={styles.rowTitle}>
            <PurposeBadge purpose={post.purpose} />
            <Text style={[styles.goal, { color: purposeColors[post.purpose] }]}>{purposeGoalLabels[post.purpose]}</Text>
          </View>
          <Text style={styles.summaryLine}>
            {kindLabels[pet.kind]} · {pet.breed}
          </Text>
          <Text style={styles.summaryLine}>
            {sexLabels[pet.sex]} · {petAgeLabel(pet)}
          </Text>
          <Text style={styles.rowMeta}>
            {post.area.name} 부근 · {formatApproxDistance(distance)}
          </Text>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{statusLabels[post.status]}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.postTitle} numberOfLines={1}>
        {post.title}
      </Text>
      <View style={styles.actions}>
        <Pressable
          testID="pet-summary-like"
          accessibilityRole="button"
          accessibilityLabel={liked ? '찜 해제' : '찜하기'}
          accessibilityState={{ selected: liked }}
          onPress={() => toggleLike(post.id)}
          style={styles.likeButton}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? colors.primary : colors.text} />
          <Text style={styles.likeText}>찜</Text>
        </Pressable>
        <Pressable
          testID="pet-summary-detail"
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/pet/[id]', params: { id: post.id } })}
          style={styles.detailButton}
        >
          <Text style={styles.detailText}>상세 보기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, padding: 3, borderRadius: 10, backgroundColor: colors.background },
  switchButton: { flex: 1, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8 },
  switchButtonActive: { backgroundColor: colors.surfaceStrong },
  switchText: { fontSize: 15, fontWeight: '600', color: colors.subText },
  switchTextActive: { color: colors.textStrong, fontWeight: '700' },
  titleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 8, paddingBottom: 6 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 16, paddingTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  count: { fontSize: 14, color: colors.subText },
  notice: { marginTop: 6, fontSize: 13, color: colors.subText },
  empty: { marginVertical: 24, textAlign: 'center', fontSize: 15, color: colors.subText },
  rows: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowPressed: { opacity: 0.7 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5 },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  petName: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  status: { fontSize: 12, fontWeight: '600', color: colors.caution },
  rowLine: { fontSize: 14, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.subText },
  summary: { paddingHorizontal: 16, gap: 12 },
  summaryTop: { flexDirection: 'row', gap: 14 },
  summaryPhoto: { width: 104, height: 104, borderRadius: 14, borderWidth: 3 },
  summaryInfo: { flex: 1, gap: 4 },
  goal: { fontSize: 15, fontWeight: '700' },
  summaryLine: { fontSize: 15, color: colors.text },
  statusChip: { alignSelf: 'flex-start', marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.surfaceStrong },
  statusChipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  postTitle: { fontSize: 14, color: colors.subText },
  actions: { flexDirection: 'row', gap: 8 },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.surfaceStrong },
  likeText: { fontSize: 15, fontWeight: '600', color: colors.text },
  detailButton: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primary },
  detailText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
