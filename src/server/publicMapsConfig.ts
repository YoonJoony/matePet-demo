// 브라우저 키는 Google Cloud에서 Maps JavaScript API와 배포 도메인으로 제한한다.
// 이 함수는 비밀 키가 공개 API 응답으로 넘어가지 않도록 잘못된 설정도 거부한다.
export function publicMapsConfig(env: {
  GOOGLE_MAPS_BROWSER_API_KEY?: string;
  GOOGLE_REST_API_KEY?: string;
}): Response {
  const key = env.GOOGLE_MAPS_BROWSER_API_KEY?.trim();
  const headers = { 'Cache-Control': 'no-store' };
  if (!key || key === env.GOOGLE_REST_API_KEY?.trim()) {
    return Response.json(
      { error: '지도 표시용 키 설정이 필요해요. 서버에서 별도의 GOOGLE_MAPS_BROWSER_API_KEY를 설정해 주세요.' },
      { status: 503, headers },
    );
  }
  return Response.json({ googleMapsApiKey: key }, { headers });
}
