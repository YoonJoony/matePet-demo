// 지도 JavaScript 전용 키만 브라우저에 전달한다. 서버용 Places 키는 절대 대체값으로 쓰지 않는다.
import { publicMapsConfig } from '@/server/publicMapsConfig';

export function GET() {
  return publicMapsConfig({
    GOOGLE_MAPS_BROWSER_API_KEY: process.env.GOOGLE_MAPS_BROWSER_API_KEY,
    GOOGLE_REST_API_KEY: process.env.GOOGLE_REST_API_KEY,
  });
}
