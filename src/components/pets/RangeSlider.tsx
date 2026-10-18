import { RefObject, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, PanResponderGestureState, StyleSheet, View } from 'react-native';

import { colors } from '@/components/theme';

const THUMB_SIZE = 28;

type Range = [number, number];
type Latest = { value: Range; onChange: (value: Range) => void; trackWidth: number; min: number; max: number; step: number };
type Props = {
  min: number;
  max: number;
  step: number;
  value: Range;
  onChange: (value: Range) => void;
  // 화면 낭독기에 읽어 줄 값 (예: 20km)
  formatValue: (value: number) => string;
  testID: string;
};

// 손잡이 하나의 끌기 동작. 최신 값은 렌더 뒤에 갱신되는 ref에서 읽는다.
function createThumbPan(latest: RefObject<Latest>, index: 0 | 1) {
  let startX = 0;
  let tied = false; // 두 손잡이가 겹친 상태에서 잡으면 끄는 방향으로 움직일 손잡이를 정한다.
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      const s = latest.current;
      tied = s.value[0] === s.value[1];
      startX = ((s.value[index] - s.min) / (s.max - s.min)) * s.trackWidth;
    },
    onPanResponderMove: (_: unknown, gesture: PanResponderGestureState) => {
      const s = latest.current;
      if (s.trackWidth <= 0) return;
      const target = tied ? (gesture.dx < 0 ? 0 : 1) : index;
      const raw = s.min + ((startX + gesture.dx) / s.trackWidth) * (s.max - s.min);
      const next = Math.min(Math.max(Math.round(raw / s.step) * s.step, s.min), s.max);
      const [low, high] = s.value;
      const range: Range = target === 0 ? [Math.min(next, high), high] : [low, Math.max(next, low)];
      if (range[0] !== low || range[1] !== high) s.onChange(range);
    },
  });
}

// 두 손잡이 범위 슬라이더 (기획서 5.2). 손잡이를 끌어 최소·최대값을 고르고, 최소값이 최대값을 넘지 않게 막는다.
export function RangeSlider({ min, max, step, value, onChange, formatValue, testID }: Props) {
  const [trackWidth, setTrackWidth] = useState(0); // 손잡이가 움직일 수 있는 폭 (전체 폭 - 손잡이 크기)
  // 제스처 콜백은 한 번만 만들고, 최신 값은 렌더 뒤에 ref로 넘겨 읽는다.
  const latest = useRef<Latest>({ value, onChange, trackWidth, min, max, step });
  useEffect(() => {
    latest.current = { value, onChange, trackWidth, min, max, step };
  });

  // ref는 제스처 콜백 안에서만 읽고 렌더 중에는 읽지 않는다.
  // eslint-disable-next-line react-hooks/refs
  const [lowPan] = useState(() => createThumbPan(latest, 0));
  // eslint-disable-next-line react-hooks/refs
  const [highPan] = useState(() => createThumbPan(latest, 1));

  const toX = (v: number) => ((v - min) / (max - min)) * trackWidth;
  const [low, high] = value;
  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(Math.max(event.nativeEvent.layout.width - THUMB_SIZE, 0));
  // 두 손잡이가 끝(최대값)에서 겹치면 최소 손잡이를 위에 둬야 왼쪽으로 끌 수 있다.
  const lowOnTop = low === high && low > min;

  return (
    <View testID={testID} style={styles.container} onLayout={onLayout}>
      <View style={styles.track} />
      <View style={[styles.selected, { left: THUMB_SIZE / 2 + toX(low), width: toX(high) - toX(low) }]} />
      <View
        {...lowPan.panHandlers}
        testID={`${testID}-min`}
        accessibilityRole="adjustable"
        accessibilityLabel="최소 거리"
        accessibilityValue={{ min, max, now: low, text: formatValue(low) }}
        style={[styles.thumb, { left: toX(low), zIndex: lowOnTop ? 2 : 1 }]}
      />
      <View
        {...highPan.panHandlers}
        testID={`${testID}-max`}
        accessibilityRole="adjustable"
        accessibilityLabel="최대 거리"
        accessibilityValue={{ min, max, now: high, text: formatValue(high) }}
        style={[styles.thumb, { left: toX(high), zIndex: lowOnTop ? 1 : 2 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE + 16,
    justifyContent: 'center',
    // 웹에서 손잡이를 끌 때 글자가 선택되지 않게 한다.
    userSelect: 'none',
  },
  track: { position: 'absolute', left: THUMB_SIZE / 2, right: THUMB_SIZE / 2, height: 4, borderRadius: 2, backgroundColor: colors.surfaceStrong },
  selected: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: colors.primary },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
});
