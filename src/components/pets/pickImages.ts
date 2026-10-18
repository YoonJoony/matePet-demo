import { Alert } from 'react-native';

// 앱(iOS·Android)에서는 expo-image-picker 연동이 필요하다. 이번 데모는 웹에서만 사진을 고른다.
export async function pickImages(_maxCount: number): Promise<{ uri: string }[]> {
  Alert.alert('사진 선택', '앱에서는 사진 선택 기능을 아직 연결하지 않았어요.');
  return [];
}
