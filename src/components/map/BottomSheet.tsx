import { ComponentRef, ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, PanResponderGestureState, ScrollView, StyleSheet, View } from 'react-native';

import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { colors } from '@/components/theme';

export type SheetSnap = 'collapsed' | 'mid' | 'full';

// 시트 위쪽 둥근 모서리 반지름. 지도가 이만큼 시트 아래로 들어가야 모서리 바깥에 지도가 보인다.
export const SHEET_RADIUS = 20;
const order: SheetSnap[] = ['full', 'mid', 'collapsed'];

type Props = {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  // 각 단계에서 시트 윗변의 y 위치 (화면 위쪽 기준)
  positions: Record<SheetSnap, number>;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

// 손잡이나 내부를 끌어 3단계(내림/중간/끝까지)로 멈추는 하단 시트. 손잡이를 누르면 다음 단계로 바뀐다.
export function BottomSheet({ snap, onSnapChange, positions, header, footer, children }: Props) {
  const [top] = useState(() => new Animated.Value(positions[snap]));
  const dragStart = useRef(positions[snap]);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(0); // 내부 스크롤 위치 (끝까지 단계에서 맨 위인지 판단)
  const stateRef = useRef({ snap, positions, onSnapChange });
  useEffect(() => {
    stateRef.current = { snap, positions, onSnapChange };
  }, [snap, positions, onSnapChange]);

  useEffect(() => {
    Animated.spring(top, { toValue: positions[snap], useNativeDriver: false, bounciness: 0, speed: 18 }).start();
    // 맨 위로 되돌리면 onScroll이 불려 scrollY도 0이 된다.
    if (snap !== 'full') scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [snap, positions, top]);

  // 손잡이와 시트 내부 끌기가 함께 쓰는 동작. ref는 제스처 콜백 안에서만 읽고 렌더 중에는 읽지 않는다.
  const [dragHandlers] = useState(() => ({
    onPanResponderGrant: () => {
      dragStart.current = stateRef.current.positions[stateRef.current.snap];
    },
    onPanResponderMove: (_: unknown, gesture: PanResponderGestureState) => {
      const { positions: p } = stateRef.current;
      top.setValue(Math.min(Math.max(dragStart.current + gesture.dy, p.full), p.collapsed));
    },
    onPanResponderRelease: (_: unknown, gesture: PanResponderGestureState) => {
      const { positions: p, snap: current, onSnapChange: change } = stateRef.current;
      if (Math.abs(gesture.dy) < 4) {
        // 탭: 다음 단계로
        change(current === 'collapsed' ? 'mid' : current === 'mid' ? 'full' : 'mid');
        return;
      }
      // 놓는 순간의 속도만큼 이동 방향으로 더 간 위치를 기준으로 가까운 단계를 고른다 (속도는 ±3px/ms로 제한).
      const velocity = Math.max(-3, Math.min(3, gesture.vy));
      const y = dragStart.current + gesture.dy + velocity * 120;
      let next = order.reduce((best, s) => (Math.abs(p[s] - y) < Math.abs(p[best] - y) ? s : best), current);
      // 조금만 끌어도(30px 이상) 끈 방향으로 한 단계 움직인다.
      if (next === current && Math.abs(gesture.dy) > 30) {
        const index = order.indexOf(current) + (gesture.dy < 0 ? -1 : 1);
        next = order[Math.min(Math.max(index, 0), order.length - 1)];
      }
      if (next === current) {
        Animated.spring(top, { toValue: p[current], useNativeDriver: false, bounciness: 0 }).start();
      }
      change(next);
    },
  }));

  // 손잡이·헤더: 누르면 다음 단계, 끌면 시트 이동
  const [handlePan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      ...dragHandlers,
    }),
  );

  // 시트 내부: 누르기는 카드·버튼에 맡기고, 세로로 끌 때만 시트가 가져간다.
  // - 중간·내림 단계: 위아래로 끌면 시트를 움직인다 (끝까지 올린 뒤부터 내부 스크롤).
  // - 끝까지 단계: 내부 스크롤이 맨 위일 때 아래로 끌면 시트를 내린다. 그 밖에는 내부 스크롤.
  // eslint-disable-next-line react-hooks/refs
  const [contentPan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        if (Math.abs(gesture.dy) < 6 || Math.abs(gesture.dy) < Math.abs(gesture.dx)) return false;
        if (stateRef.current.snap !== 'full') return true;
        return gesture.dy > 0 && scrollY.current <= 0;
      },
      onPanResponderTerminationRequest: () => false,
      ...dragHandlers,
    }),
  );

  return (
    <Animated.View style={[styles.sheet, { top }]} testID="bottom-sheet">
      <View {...handlePan.panHandlers} style={styles.dragArea}>
        {/* Pressable로 감싸면 터치를 먼저 가져가 끌기가 동작하지 않으므로 일반 View로 둔다. */}
        <View testID="sheet-handle" accessibilityRole="adjustable" accessibilityLabel={`하단 시트, 현재 ${snap}`} style={styles.handleHit}>
          <View style={styles.handle} />
        </View>
        {header}
      </View>
      <View {...contentPan.panHandlers} style={styles.content}>
        <ScrollView
          ref={scrollRef}
          scrollEnabled={snap === 'full'}
          onScroll={(event) => {
            scrollY.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + (footer ? 72 : 24) }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    // 지도 컨트롤(z-index 2)보다 위에 그린다.
    zIndex: 5,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    // 웹에서 마우스로 시트 내부를 끌 때 글자가 선택(파란 블록)되지 않게 한다.
    userSelect: 'none',
  },
  dragArea: {
    // 웹에서 손잡이를 끌 때 텍스트가 선택되지 않게 한다.
    userSelect: 'none',
  },
  handleHit: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.mutedText,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: TAB_BAR_SPACE - 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
});
