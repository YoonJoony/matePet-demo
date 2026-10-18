// 구글 지도 JavaScript API 로더 (웹). 홈 지도와 동네 지도 선택이 함께 쓴다.
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

// setOptions는 한 번만 불러야 하므로(두 번째부터는 무시되고 키가 담긴 경고가 출력됨) 로딩을 한 번만 한다.
let googleMapsLoading: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  googleMapsLoading ??= (async () => {
    const response = await fetch('/api/maps-config');
    const body = (await response.json()) as { googleMapsApiKey?: string; error?: string };
    if (!body.googleMapsApiKey) throw new Error(body.error ?? '구글 지도 키를 불러오지 못했어요.');
    setOptions({ key: body.googleMapsApiKey, v: 'weekly', language: 'ko', region: 'KR' });
    await Promise.all([importLibrary('maps'), importLibrary('core')]);
  })().catch((error: Error) => {
    googleMapsLoading = null; // 실패하면 다음에 다시 시도할 수 있게 비운다.
    throw error;
  });
  return googleMapsLoading;
}
