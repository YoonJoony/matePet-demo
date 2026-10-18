import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { ChatRoom, roomIdForPost, sampleRooms } from '@/data/chats';
import type { PetPost } from '@/data/pets';

type ChatsValue = {
  rooms: ChatRoom[];
  unreadTotal: number;
  findRoom: (id: string) => ChatRoom | undefined;
  // 상세의 채팅하기: 그 글의 대화방이 있으면 그 방, 없으면 새로 만든다 (채팅 탭과 같은 방으로 이어짐).
  openRoomForPost: (post: PetPost) => string;
  sendMessage: (roomId: string, text: string) => void;
  markRead: (roomId: string) => void;
};

const ChatsContext = createContext<ChatsValue | null>(null);

// 대화방·메시지를 앱 메모리에만 둔다 (새로고침하면 샘플 상태로 돌아감).
export function ChatsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<ChatRoom[]>(sampleRooms);

  const openRoomForPost = useCallback((post: PetPost) => {
    const id = roomIdForPost(post.id);
    setRooms((prev) => (prev.some((room) => room.id === id) ? prev : [...prev, { id, postId: post.id, partner: post.author, messages: [], unread: 0 }]));
    return id;
  }, []);

  const sendMessage = useCallback((roomId: string, text: string) => {
    const at = Date.now();
    setRooms((prev) =>
      prev.map((room) => (room.id === roomId ? { ...room, messages: [...room.messages, { id: `m-${at}`, from: 'me' as const, text, at }] } : room)),
    );
  }, []);

  const markRead = useCallback((roomId: string) => {
    setRooms((prev) => (prev.some((room) => room.id === roomId && room.unread > 0) ? prev.map((room) => (room.id === roomId ? { ...room, unread: 0 } : room)) : prev));
  }, []);

  const value = useMemo<ChatsValue>(
    () => ({
      rooms,
      unreadTotal: rooms.reduce((sum, room) => sum + room.unread, 0),
      findRoom: (id) => rooms.find((room) => room.id === id),
      openRoomForPost,
      sendMessage,
      markRead,
    }),
    [rooms, openRoomForPost, sendMessage, markRead],
  );

  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}

export function useChats(): ChatsValue {
  const context = useContext(ChatsContext);
  if (!context) throw new Error('useChats must be used inside ChatsProvider');
  return context;
}
