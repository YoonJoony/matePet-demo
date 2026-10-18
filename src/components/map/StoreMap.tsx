import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';

import type { StoreMapProps } from './StoreMap.types';

// iOS·Android 앱에서는 react-native-maps(구글 지도 공급자)로 바꿔야 한다.
// 이번 데모는 웹(브라우저 패널)에서만 구글 지도를 그린다.
export function StoreMap(_props: StoreMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>앱에서는 react-native-maps 연동 후 지도가 표시돼요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  text: {
    color: colors.subText,
  },
});
