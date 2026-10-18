import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PetImage, PurposeBadge } from '@/components/pets/ui';
import { colors } from '@/components/theme';
import { clockLabel } from '@/data/chats';
import { statusLabels } from '@/data/pets';
import { useChats } from '@/state/chats';
import { usePetPosts } from '@/state/petPosts';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/chat');
}

// 개별 채팅방 (기획서 9.2). 상단에 어떤 동물·등록 글에 관한 대화인지 보여 주고, 보낸 메시지는 이 기기에만 저장된다.
export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findRoom, sendMessage, markRead } = useChats();
  const { findPost } = usePetPosts();
  const room = findRoom(id);
  const post = room ? findPost(room.postId) : undefined;
  const [text, setText] = useState('');
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // 방을 열면 읽음 처리한다.
  const unread = room?.unread ?? 0;
  useEffect(() => {
    if (unread > 0) markRead(id);
  }, [id, unread, markRead]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || !room) return;
    sendMessage(room.id, trimmed);
    setText('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable testID="chat-back" accessibilityLabel="뒤로 가기" hitSlop={8} onPress={goBack}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {room?.partner ?? '대화'}
        </Text>
        <View style={styles.headerSpace} />
      </View>

      {post ? (
        <Pressable
          testID="chat-post"
          accessibilityRole="button"
          accessibilityLabel={`${post.title} 글 보기`}
          onPress={() => router.push({ pathname: '/pet/[id]', params: { id: post.id } })}
          style={styles.postBar}
        >
          <PetImage post={post} emojiSize={22} style={styles.postThumb} />
          <View style={styles.postInfo}>
            <View style={styles.postBadges}>
              <PurposeBadge purpose={post.purpose} />
              <Text style={styles.postStatus}>{statusLabels[post.status]}</Text>
            </View>
            <Text style={styles.postTitle} numberOfLines={1}>
              {post.pet.name} · {post.title}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
        </Pressable>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {!room ? <Text style={styles.notice}>대화를 찾을 수 없어요.</Text> : null}
        <Text style={styles.notice}>데모에서는 메시지가 이 기기에만 저장되고 상대에게 전송되지 않아요.</Text>
        {room?.messages.map((message) => {
          const mine = message.from === 'me';
          return (
            <View key={message.id} style={[styles.messageRow, mine && styles.messageRowMine]}>
              {mine ? <Text style={styles.time}>{clockLabel(message.at)}</Text> : null}
              <Text testID={mine ? 'chat-message-mine' : 'chat-message-partner'} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubblePartner]}>
                {message.text}
              </Text>
              {!mine ? <Text style={styles.time}>{clockLabel(message.at)}</Text> : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          testID="chat-input"
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder="메시지 보내기"
          placeholderTextColor={colors.mutedText}
          maxLength={500}
          style={styles.input}
        />
        <Pressable
          testID="chat-send"
          accessibilityRole="button"
          accessibilityLabel="보내기"
          accessibilityState={{ disabled: !text.trim() }}
          disabled={!text.trim()}
          onPress={send}
          style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  headerSpace: { width: 28 },
  postBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  postThumb: { width: 40, height: 40, borderRadius: 8 },
  postInfo: { flex: 1, gap: 2 },
  postBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postStatus: { fontSize: 12, fontWeight: '600', color: colors.subText },
  postTitle: { fontSize: 14, color: colors.text },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },
  notice: { alignSelf: 'center', marginBottom: 4, fontSize: 12, color: colors.mutedText, textAlign: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  messageRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, overflow: 'hidden', fontSize: 15, lineHeight: 21 },
  bubbleMine: { backgroundColor: colors.primary, color: '#FFFFFF' },
  bubblePartner: { backgroundColor: colors.surfaceRaised, color: colors.text },
  time: { fontSize: 11, color: colors.mutedText },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, height: 42, paddingHorizontal: 14, borderRadius: 21, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceRaised },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sendDisabled: { opacity: 0.4 },
});
