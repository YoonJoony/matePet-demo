import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { colors } from '@/components/theme';

type Props = { title: string; icon: ComponentProps<typeof Ionicons>['name'] };

// 이번 데모 범위 밖의 탭에 보여 주는 화면.
export function ComingSoon({ title, icon }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        <Ionicons name={icon} size={48} color={colors.mutedText} />
        <Text style={styles.message}>데모에서는 준비 중인 화면이에요.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: TAB_BAR_SPACE,
  },
  message: {
    fontSize: 15,
    color: colors.subText,
  },
});
