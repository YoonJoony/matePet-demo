import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';

import type { RegionMapPickerProps } from './RegionMapPicker.types';

// iOS·Android 앱에서는 모바일 지도 라이브러리를 연결한 뒤 같은 방식(고정 핀 + 행정동 조회)으로 구현해야 한다.
export function RegionMapPicker({ onCancel }: RegionMapPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>앱에서는 지도 선택이 아직 준비 중이에요. 동네 검색이나 주변 목록을 이용해 주세요.</Text>
      <Pressable onPress={onCancel} style={styles.button}>
        <Text style={styles.buttonText}>돌아가기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  text: { textAlign: 'center', fontSize: 15, color: colors.subText },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  buttonText: { fontSize: 15, color: colors.text },
});
