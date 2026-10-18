import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/components/theme';
import { ChatsProvider } from '@/state/chats';
import { MapStateProvider } from '@/state/mapState';
import { PetPostsProvider } from '@/state/petPosts';
import { RegionPickerProvider } from '@/state/regionPicker';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* 서버 출력 모드에서는 app.json 이름이 웹 제목으로 들어가지 않아 직접 지정한다. */}
      <Head>
        <title>반려동물 매칭 데모</title>
      </Head>
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
