import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { PetImage, PurposeBadge } from '@/components/pets/ui';
import { colors } from '@/components/theme';
import { ChatRoom } from '@/data/chats';
import { timeAgoLabel } from '@/data/pets';
import { useChats } from '@/state/chats';
import { usePetPosts } from '@/state/petPosts';

// 채팅 탭: 상담 대화 목록 (기획서 9.2). 최근 메시지 순.
export default function ChatListScreen() {
  const { rooms } = useChats();
  const sorted = [...rooms].sort((a, b) => lastAt(b) - lastAt(a));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(room) => room.id}
        renderItem={({ item }) => <RoomRow room={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>아직 대화가 없어요. 등록 글 상세에서 채팅하기를 눌러 보세요.</Text>}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
      />
    </SafeAreaView>
  );
}

const lastAt = (room: ChatRoom) => room.messages.at(-1)?.at ?? 0;

function RoomRow({ room }: { room: ChatRoom }) {
  const { findPost } = usePetPosts();
  const post = findPost(room.postId);
  const last = room.messages.at(-1);

  return (
    <Pressable
      testID={`chat-room-${room.postId}`}
      accessibilityRole="button"
      accessibilityLabel={`${room.partner}와의 대화`}
      onPress={() => router.push({ pathname: '/chat-room/[id]', params: { id: room.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {post ? <PetImage post={post} emojiSize={24} style={styles.thumb} /> : <View style={styles.thumb} />}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.partner} numberOfLines={1}>
            {room.partner}
          </Text>
          {post ? <Text style={styles.meta}>{post.area.name}</Text> : null}
          {last ? <Text style={styles.meta}>· {timeAgoLabel(last.at)}</Text> : null}
        </View>
        {post ? (
          <View style={styles.postRow}>
            <PurposeBadge purpose={post.purpose} />
            <Text style={styles.postTitle} numberOfLines={1}>
              {post.pet.name} · {post.title}
            </Text>
          </View>
        ) : null}
        <Text style={styles.lastMessage} numberOfLines={1}>
          {last ? last.text : '대화를 시작해 보세요.'}
        </Text>
      </View>
      {room.unread > 0 ? (
        <View style={styles.unread}>
          <Text style={styles.unreadText}>{room.unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 52, justifyContent: 'center', paddingHorizontal: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowPressed: { backgroundColor: colors.surface },
  thumb: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceRaised },
  info: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partner: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.subText },
  postRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postTitle: { flex: 1, fontSize: 13, color: colors.subText },
  lastMessage: { fontSize: 15, color: colors.text },
  unread: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  unreadText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, backgroundColor: colors.border },
  empty: { margin: 32, textAlign: 'center', fontSize: 15, lineHeight: 22, color: colors.subText },
});
