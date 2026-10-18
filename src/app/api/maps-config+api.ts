// 구글 지도 JavaScript API 키를 브라우저에 전달한다.
// 지도 키는 구조상 브라우저에서 쓰여 노출될 수밖에 없으므로, Google Cloud 콘솔에서
// HTTP 리퍼러(예: http://localhost:8081/*)와 Maps JavaScript API로 사용을 제한해야 한다.
export function GET() {
  const googleMapsApiKey = process.env.GOOGLE_REST_API_KEY;
  if (!googleMapsApiKey) {
    return Response.json({ error: '서버에 GOOGLE_REST_API_KEY가 설정되지 않았어요.' }, { status: 500 });
  }
  return Response.json({ googleMapsApiKey }, { headers: { 'Cache-Control': 'no-store' } });
}
