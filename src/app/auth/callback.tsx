import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { useAuth } from '@/state/auth';

// 카카오 로그인 후 돌아오는 화면. 주소의 인증 코드는 Supabase 클라이언트가 세션으로 바꾸고(state/auth),
// 여기서는 결과에 따라 프로필 설정(처음 가입) 또는 앱 첫 화면으로 보낸다.
export default function AuthCallbackScreen() {
  const { status, message } = useAuth();
  const params = useLocalSearchParams<{ error?: string; error_description?: string }>();
  const failed = params.error ? (params.error_description ?? params.error) : null;

  useEffect(() => {
    if (failed) return;
    if (status === 'needsProfile') router.replace('/profile-setup');
    else if (status === 'ready') router.replace('/');
  }, [status, failed]);

  const errorText = failed ?? (status === 'signedOut' || status === 'unavailable' ? (message ?? '로그인을 마치지 못했어요.') : null);
  return (
    <View style={styles.container}>
      {errorText ? (
        <>
          <Text style={styles.title}>로그인을 마치지 못했어요</Text>
          <Text style={styles.text}>{errorText}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/login')} style={styles.button}>
            <Text style={styles.buttonText}>로그인 화면으로</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.text}>카카오 로그인 중이에요…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, color: colors.subText, textAlign: 'center' },
  button: { marginTop: 8, height: 44, paddingHorizontal: 18, borderRadius: 10, justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  buttonText: { fontSize: 15, fontWeight: '700', color: colors.text },
});
