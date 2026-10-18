import { router, usePathname } from 'expo-router';
import { ReactNode, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/components/theme';
import { useAuth } from '@/state/auth';

// 로그인 상태에 따라 들어갈 수 있는 화면을 정한다.
// 로그인 전 → 로그인 화면, 로그인했지만 프로필 없음 → 프로필 설정(동네 선택 포함), 준비 완료·데모 → 앱.
const ALLOWED: Record<'signedOut' | 'unavailable' | 'needsProfile', string[]> = {
  signedOut: ['/login', '/auth/callback'],
  unavailable: ['/login', '/auth/callback'],
  needsProfile: ['/profile-setup', '/region-select', '/auth/callback'],
};

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();

  const target =
    status === 'loading'
      ? null
      : status === 'ready' || status === 'demo'
        ? pathname === '/login'
          ? '/'
          : null
        : ALLOWED[status].includes(pathname)
          ? null
          : status === 'needsProfile'
            ? '/profile-setup'
            : '/login';

  useEffect(() => {
    if (target) router.replace(target);
  }, [target]);

  // 화면은 항상 그려 두고(이동하려면 내비게이터가 있어야 함), 확인 중이거나 이동할 때는 덮개로 가린다.
  return (
    <View style={styles.container}>
      {children}
      {status === 'loading' || target ? (
        <View style={styles.cover}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cover: { ...StyleSheet.absoluteFill, zIndex: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
