import { Ionicons } from '@expo/vector-icons';
import { TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { ComponentProps } from 'react';
import { Platform, Pressable, PressableProps, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/components/theme';
import { useChats } from '@/state/chats';

type IconName = ComponentProps<typeof Ionicons>['name'];

// 탭 구성은 기획서 3.1 (홈=지도, 글 목록, 커뮤니티, 채팅). 프로필은 탭이 아니라 상단 프로필 버튼으로 들어간다.
export const tabItems: { name: string; href: '/' | '/list' | '/community' | '/chat'; label: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', href: '/', label: '홈', icon: 'home-outline', iconActive: 'home' },
  { name: 'list', href: '/list', label: '글 목록', icon: 'reader-outline', iconActive: 'reader' },
  { name: 'community', href: '/community', label: '커뮤니티', icon: 'people-outline', iconActive: 'people' },
  { name: 'chat', href: '/chat', label: '채팅', icon: 'chatbubble-ellipses-outline', iconActive: 'chatbubble-ellipses' },
];

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_BOTTOM_GAP = 12;
// 탭 바 위로 콘텐츠가 가려지지 않도록 화면 아래에 남길 여백.
export const TAB_BAR_SPACE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 16;

export function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  // 채팅 탭 배지는 읽지 않은 메시지 수
  const { unreadTotal } = useChats();

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(insets.bottom, TAB_BAR_BOTTOM_GAP) }]}>
      <View style={styles.bar}>
        {tabItems.map((item) => (
          <TabTrigger key={item.name} name={item.name} asChild>
            <TabButton label={item.label} icon={item.icon} iconActive={item.iconActive} badge={item.name === 'chat' ? unreadTotal : undefined} />
          </TabTrigger>
        ))}
      </View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & { label: string; icon: IconName; iconActive: IconName; badge?: number };

// TabTrigger가 넘겨주는 onPress 등을 Pressable에 그대로 전달한다. (ref 타입 정의가 RN 0.88 타입과 맞지 않아 변환)
function TabButton({ label, icon, iconActive, badge, isFocused, ...props }: TabButtonProps) {
  const tint = isFocused ? colors.textStrong : colors.text;

  return (
    <Pressable
      {...(props as unknown as PressableProps)}
      testID={`tab-${label}`}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={[styles.tab, isFocused && styles.tabActive]}
    >
      <View>
        <Ionicons name={isFocused ? iconActive : icon} size={24} color={tint} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    padding: 4,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(42,45,51,0.82)',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)' } as object) : {}),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: (TAB_BAR_HEIGHT - 8) / 2,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
