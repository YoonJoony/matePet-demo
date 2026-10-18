import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NearbyPost, PetCompactRow } from '@/components/pets/PetMapSheet';
import { colors } from '@/components/theme';
import { distanceToPost, me } from '@/data/pets';
import { useAuth } from '@/state/auth';
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
        <AccountCard />

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

// 로그인 영역. 로그인 전에는 데모 샘플 사용자로 보여 주고 카카오로 시작하기를 띄운다.
// (글·찜은 아직 데모 데이터다 — 다음 단계에서 DB로 옮긴다.)
function AccountCard() {
  const { status, profile, message, signInWithKakao, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const start = () => {
    setError(null);
    signInWithKakao().catch((e: Error) => setError(e.message));
  };

  if (status === 'loading') return <ActivityIndicator color={colors.subText} style={styles.loading} />;
  if (status === 'ready' && profile) {
    return (
      <View>
        <View style={styles.user}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} accessibilityLabel="프로필 사진" />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={30} color={colors.subText} />
            </View>
          )}
          <View style={styles.flex}>
            <Text style={styles.name}>{profile.nickname}</Text>
            <Text style={styles.meta}>
              기본 동네 {profile.homeRegion.name} · {profile.homeRegion.sido} {profile.homeRegion.sigungu}
            </Text>
          </View>
        </View>
        <View style={styles.accountActions}>
          <Pressable testID="profile-edit" accessibilityRole="button" onPress={() => router.push('/profile-setup')} style={styles.smallButton}>
            <Text style={styles.smallButtonText}>프로필 수정</Text>
          </Pressable>
          <Pressable testID="profile-sign-out" accessibilityRole="button" onPress={() => void signOut()} style={styles.smallButton}>
            <Text style={styles.smallButtonText}>로그아웃</Text>
          </Pressable>
        </View>
        <Text style={styles.notice}>아래 글·찜 목록은 아직 데모 샘플 데이터예요.</Text>
      </View>
    );
  }
  return (
    <View>
      <View style={styles.user}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={30} color={colors.subText} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.name}>{me.nickname} (데모)</Text>
          <Text style={styles.meta}>
            기본 동네 {me.homeRegion.name} · {me.homeRegion.sido} {me.homeRegion.sigungu}
          </Text>
        </View>
      </View>
      {status === 'needsProfile' ? (
        <Pressable testID="profile-continue-setup" accessibilityRole="button" onPress={() => router.push('/profile-setup')} style={styles.setupButton}>
          <Text style={styles.setupButtonText}>프로필 설정을 마쳐 주세요</Text>
        </Pressable>
      ) : status === 'unavailable' ? (
        <Text style={styles.notice}>{message ?? '로그인 준비 중이에요.'}</Text>
      ) : (
        <Pressable testID="profile-kakao-login" accessibilityRole="button" accessibilityLabel="카카오로 시작하기" onPress={start} style={styles.kakaoButton}>
          <Ionicons name="chatbubble" size={18} color={colors.kakaoText} />
          <Text style={styles.kakaoText}>카카오로 시작하기</Text>
        </Pressable>
      )}
      {error ? <Text style={styles.notice}>{error}</Text> : null}
    </View>
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
  flex: { flex: 1 },
  loading: { paddingVertical: 28 },
  notice: { marginBottom: 12, fontSize: 13, color: colors.subText },
  accountActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  smallButton: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  smallButtonText: { fontSize: 14, fontWeight: '700', color: colors.text },
  kakaoButton: { height: 48, marginBottom: 16, flexDirection: 'row', gap: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.kakao },
  kakaoText: { fontSize: 16, fontWeight: '700', color: colors.kakaoText },
  setupButton: { height: 48, marginBottom: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  setupButtonText: { fontSize: 16, fontWeight: '700', color: colors.textStrong },
});
