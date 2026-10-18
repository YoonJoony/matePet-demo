import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/components/theme';
import { useAuth } from '@/state/auth';

// 앱 첫 화면: 로그인 전에는 이 화면만 보인다(AuthGate). 로그인 → 프로필·동네 설정 → 앱.
export default function LoginScreen() {
  const { status, message, signInWithKakao, startDemo } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setStarting(true);
    setError(null);
    signInWithKakao().catch((e: Error) => {
      setError(e.message);
      setStarting(false);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="paw" size={44} color={colors.primary} />
        </View>
        <Text style={styles.title}>반려동물 매칭</Text>
        <Text style={styles.subtitle}>우리 동네에서 교배 상대와{'\n'}입양 가족을 찾아보세요</Text>
      </View>

      <View style={styles.bottom}>
        {status === 'unavailable' ? <Text style={styles.error}>{message ?? '로그인 준비 중이에요.'}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          testID="login-kakao"
          accessibilityRole="button"
          accessibilityLabel="카카오로 시작하기"
          disabled={starting || status === 'unavailable'}
          onPress={start}
          style={[styles.kakaoButton, (starting || status === 'unavailable') && styles.disabled]}
        >
          {starting ? <ActivityIndicator color={colors.kakaoText} /> : <Ionicons name="chatbubble" size={18} color={colors.kakaoText} />}
          <Text style={styles.kakaoText}>카카오로 시작하기</Text>
        </Pressable>
        <Pressable testID="login-demo" accessibilityRole="button" onPress={startDemo} style={styles.demoButton}>
          <Text style={styles.demoText}>데모 버전으로 시작하기</Text>
        </Pressable>
        <Text style={styles.notice}>카카오로 시작하면 닉네임과 기본 동네를 설정해요.{'\n'}데모 버전은 로그인 없이 샘플 사용자로 기본 기능을 써 볼 수 있어요.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, backgroundColor: colors.background },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  logo: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  title: { fontSize: 28, fontWeight: '800', color: colors.textStrong },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.subText, textAlign: 'center' },
  bottom: { gap: 12, paddingBottom: 32 },
  kakaoButton: { height: 52, flexDirection: 'row', gap: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.kakao },
  disabled: { opacity: 0.5 },
  kakaoText: { fontSize: 16, fontWeight: '700', color: colors.kakaoText },
  demoButton: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  demoText: { fontSize: 16, fontWeight: '700', color: colors.text },
  notice: { fontSize: 13, lineHeight: 19, color: colors.subText, textAlign: 'center' },
  error: { fontSize: 14, color: colors.caution, textAlign: 'center' },
});
