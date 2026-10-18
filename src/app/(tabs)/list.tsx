import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { FilterEmptyState, PetFilterBar } from '@/components/pets/PetFilterBar';
import { PetImage, PurposeBadge } from '@/components/pets/ui';
import { WriteMenu } from '@/components/pets/WriteMenu';
import { colors } from '@/components/theme';
import { formatApproxDistance, kindLabels, nearbyListedPosts, nearestNeighborhood, petAgeLabel, PetPost, sexSymbols, statusLabels, timeAgoLabel } from '@/data/pets';
import { useMapState } from '@/state/mapState';
import { usePetPosts } from '@/state/petPosts';

// 글 목록: 주변 교배·입양 등록 글 (기획서 6). 기본은 가까운 순, 모집 중·상담 중 글만 보여 준다.
export default function PetPostListScreen() {
  const { posts, filter } = usePetPosts();
  const { searchCenter } = useMapState();

  const items = useMemo(() => nearbyListedPosts(posts, searchCenter, filter), [posts, filter, searchCenter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.town}>
          <Ionicons name="location-sharp" size={20} color={colors.text} />
          <Text style={styles.headerTitle}>{nearestNeighborhood(searchCenter).name}</Text>
        </View>
        <View style={styles.headerIcons}>
          <Ionicons name="search-outline" size={24} color={colors.text} />
          <Pressable testID="list-filter-button" accessibilityRole="button" accessibilityLabel="필터" hitSlop={8} onPress={() => router.push('/pet-filter')}>
            <Ionicons name="options-outline" size={24} color={colors.text} />
          </Pressable>
          <Pressable testID="list-profile-button" accessibilityRole="button" accessibilityLabel="내 프로필" hitSlop={8} onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle-outline" size={28} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View>
        <PetFilterBar testIDPrefix="list-filter" />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.post.id}
        renderItem={({ item }) => <PetRow post={item.post} distance={item.distance} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<FilterEmptyState />}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 56 }}
      />

      <WriteMenu />
    </SafeAreaView>
  );
}

function PetRow({ post, distance }: { post: PetPost; distance: number }) {
  const { likedIds } = usePetPosts();
  const liked = likedIds.has(post.id);
  const { pet } = post;

  return (
    <Pressable
      testID={`pet-row-${post.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${post.title}, ${post.area.name}`}
      onPress={() => router.push({ pathname: '/pet/[id]', params: { id: post.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <PetImage post={post} style={styles.thumb} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <PurposeBadge purpose={post.purpose} />
          <Text style={styles.title} numberOfLines={1}>
            {post.title}
          </Text>
        </View>
        <Text style={styles.petLine} numberOfLines={1}>
          {kindLabels[pet.kind]} · {pet.breed} · {sexSymbols[pet.sex]} · {petAgeLabel(pet)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {post.area.name} 부근 · {formatApproxDistance(distance)} · {timeAgoLabel(post.createdAt)}
        </Text>
        <View style={styles.bottomLine}>
          {post.status !== 'recruiting' ? <Text style={styles.status}>{statusLabels[post.status]}</Text> : <View />}
          {liked ? <Ionicons name="heart" size={16} color={colors.primary} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  town: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  row: { flexDirection: 'row', padding: 16, gap: 16 },
  rowPressed: { backgroundColor: colors.surface },
  thumb: { width: 110, height: 110, borderRadius: 8 },
  info: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 16, color: colors.text },
  petLine: { fontSize: 14, color: colors.text },
  meta: { fontSize: 13, color: colors.subText },
  bottomLine: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { fontSize: 12, fontWeight: '600', color: colors.subText },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, backgroundColor: colors.border },
});
