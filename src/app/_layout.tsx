import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/components/theme';
import { AuthProvider } from '@/state/auth';
import { ChatsProvider } from '@/state/chats';
import { MapStateProvider } from '@/state/mapState';
import { PetPostsProvider } from '@/state/petPosts';
import { RegionPickerProvider } from '@/state/regionPicker';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* 서버 출력 모드에서는 app.json 이름이 웹 제목으로 들어가지 않아 직접 지정한다.
          휴대폰 브라우저는 상태 표시줄·홈 바 뒤와 당겨서 드러나는 곳에 페이지 배경을 보여 주므로,
          페이지 배경과 브라우저 바 색(theme-color)을 앱 배경과 맞춘다(지정하지 않으면 흰색). */}
      <Head>
        <title>반려동물 매칭 데모</title>
        <meta name="theme-color" content={colors.background} />
        <style>{`html, body { background-color: ${colors.background}; }`}</style>
      </Head>
      {/* 로그인 상태(카카오 로그인·내 프로필)는 모든 화면이 함께 쓴다. */}
      <AuthProvider>
        <MapStateProvider>
          <PetPostsProvider>
            <ChatsProvider>
              <RegionPickerProvider>
                <View style={styles.page}>
                  <View style={styles.app}>
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
                  </View>
                </View>
                <StatusBar style="light" />
              </RegionPickerProvider>
            </ChatsProvider>
          </PetPostsProvider>
        </MapStateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // 넓은 화면(웹)에서도 휴대폰 폭으로 보이도록 가운데에 고정한다.
  page: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  app: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
});
