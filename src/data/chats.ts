// 상담 채팅 데이터 (기획서 9.2). 데모는 샘플 대화와 이 기기 안에서만의 전송으로 흐름을 보여 준다
// (실시간 전송·푸시 알림은 범위 밖). 새로고침하면 샘플 상태로 돌아간다.

export type ChatMessage = { id: string; from: 'me' | 'partner'; text: string; at: number };
// 데모 사용자는 글 하나당 그 글의 작성자와 대화방 하나를 가진다.
export type ChatRoom = { id: string; postId: string; partner: string; messages: ChatMessage[]; unread: number };

export const roomIdForPost = (postId: string) => `room-${postId}`;

const minutesAgo = (minutes: number) => Date.now() - minutes * 60_000;

export const sampleRooms: ChatRoom[] = [
  {
    id: roomIdForPost('p1'),
    postId: 'p1',
    partner: '콩이네',
    unread: 1,
    messages: [
      { id: 'm1', from: 'me', text: '안녕하세요! 콩이 교배 글 보고 연락드려요.', at: minutesAgo(40) },
      { id: 'm2', from: 'partner', text: '반가워요. 아이 품종이랑 나이가 어떻게 되나요?', at: minutesAgo(35) },
      { id: 'm3', from: 'partner', text: '건강검진 결과도 서로 공유하면 좋겠어요.', at: minutesAgo(34) },
    ],
  },
  {
    id: roomIdForPost('p2'),
    postId: 'p2',
    partner: '나비집사',
    unread: 2,
    messages: [
      { id: 'm4', from: 'me', text: '나비 입양 문의드려요. 아직 가족 찾고 있나요?', at: minutesAgo(180) },
      { id: 'm5', from: 'partner', text: '네, 아직 찾고 있어요!', at: minutesAgo(120) },
      { id: 'm6', from: 'partner', text: '집 환경을 간단히 알려 주실 수 있을까요?', at: minutesAgo(119) },
    ],
  },
];

// 채팅방 말풍선 옆 시각 (예: 오후 3:05)
export function clockLabel(at: number): string {
  const date = new Date(at);
  const hours = date.getHours();
  return `${hours < 12 ? '오전' : '오후'} ${hours % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')}`;
}
