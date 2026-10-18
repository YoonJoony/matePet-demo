import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NearbyPost, PetCompactRow } from '@/components/pets/PetMapSheet';
import { colors } from '@/components/theme';
import { distanceToPost, me } from '@/data/pets';
import { useMapState } from '@/state/mapState';
import { usePetPosts } from '@/state/petPosts';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// 홈·글 목록 상단의 프로필 버튼으로 들어오는 화면 (기획서 3.2 — 내 등록 글, 찜 목록).
export default function ProfileScreen() {
  const { posts, likedIds } = usePetPosts();
  const { searchCenter, likedPlaceIds } = useMapState();
  const withDistance = (list: typeof posts): NearbyPost[] => list.map((post) => ({ post, distance: distanceToPost(searchCenter, post) }));
  const myPosts = withDistance(posts.filter((post) => post.authorId === me.id));
  // 찜 목록에서는 완료·일시 중지 글도 상태와 함께 보여 준다 (기획서 7.5).
  const likedPosts = withDistance(posts.filter((post) => likedIds.has(post.id)));
  const openPost = (id: string) => router.push({ pathname: '/pet/[id]', params: { id } });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable testID="profile-back" accessibilityLabel="뒤로 가기" hitSlop={8} onPress={goBack}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>나의 프로필</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.user}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={colors.subText} />
          </View>
          <View>
            <Text style={styles.name}>{me.nickname}</Text>
            <Text style={styles.meta}>
              기본 동네 {me.homeRegion.name} · {me.homeRegion.sido} {me.homeRegion.sigungu}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat label="내 등록 글" value={myPosts.length} />
          <Stat label="찜한 글" value={likedPosts.length} />
          <Stat label="관심 장소" value={likedPlaceIds.size} />
        </View>

        <Section title="내 등록 글" empty="아직 등록한 글이 없어요." items={myPosts} onSelect={openPost} />
        <Section title="찜한 글" empty="찜한 글이 없어요." items={likedPosts} onSelect={openPost} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, empty, items, onSelect }: { title: string; empty: string; items: NearbyPost[]; onSelect: (id: string) => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        items.map(({ post, distance }) => <PetCompactRow key={post.id} post={post} distance={distance} onPress={() => onSelect(post.id)} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  headerSpace: { width: 28 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { marginTop: 2, fontSize: 14, color: colors.subText },
  stats: { flexDirection: 'row', paddingVertical: 14, borderRadius: 12, backgroundColor: colors.surface },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 13, color: colors.subText },
  section: { marginTop: 28 },
  sectionTitle: { marginBottom: 4, fontSize: 18, fontWeight: '700', color: colors.text },
  empty: { paddingVertical: 16, fontSize: 15, color: colors.subText },
});
