// 공개 배포에서 유료·할당량 API(구글 Places, 카카오 로컬)를 남용하지 못하게 막는다. 서버 API 라우트에서만 쓴다.
// 1) 다른 사이트에서 온 요청 거부  2) 접속자(IP)별 1분 횟수 제한  3) API별 하루 전체 상한
// 횟수는 서버 메모리에 센다. 배포 환경(Workers)은 서버 인스턴스가 여러 개이고 수시로 바뀌어 각자 따로 세므로
// '최선 노력' 제한이다. 확실한 상한은 Google Cloud 콘솔의 할당량으로 건다.

export type GuardedApi = 'placesSearch' | 'placeDetails' | 'placePhoto' | 'regionLocate';

export const API_LIMITS: Record<GuardedApi, { label: string; perMinute: number; perDay: number }> = {
  placesSearch: { label: '시설 검색', perMinute: 10, perDay: 300 },
  placeDetails: { label: '시설 상세', perMinute: 10, perDay: 100 },
  // 상세 한 곳에 사진 3장, '사진 더 보기'를 누르면 최대 7장 더
  placePhoto: { label: '시설 사진', perMinute: 30, perDay: 300 },
  // 지도에서 동네 고르기는 지도를 움직일 때마다 조회한다
  regionLocate: { label: '동네 확인', perMinute: 60, perDay: 3000 },
};

const MINUTE_MS = 60_000;
const MAX_TRACKED_CLIENTS = 5000;

type Window = { start: number; count: number };
type GuardStore = { clientWindows: Map<string, Window>; dailyCounts: Map<GuardedApi, { day: string; count: number }> };
// 개발 서버는 요청마다 API 모듈을 다시 읽으므로, 횟수는 모듈 변수가 아니라 프로세스(배포에서는 인스턴스) 전역에 둔다.
const globalStore = globalThis as typeof globalThis & { __apiGuardStore?: GuardStore };
const { clientWindows, dailyCounts } = (globalStore.__apiGuardStore ??= { clientWindows: new Map(), dailyCounts: new Map() });

// 하루 기준은 한국 시간 자정
const koreanDay = (now: number) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);

// 접속자 IP: Cloudflare(cf-connecting-ip), Expo 공식 호스팅(x-real-ip), 일반 프록시(x-forwarded-for) 순서로 본다.
function clientId(request: Request): string {
  const { headers } = request;
  return headers.get('cf-connecting-ip') ?? headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

// 브라우저가 보내는 Sec-Fetch-Site·Origin으로 다른 사이트에서 부른 요청을 가려낸다.
// 헤더가 없는 요청(직접 만든 스크립트 등)은 구분할 수 없으므로 아래 횟수 제한에 맡긴다.
function isCrossSite(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return true;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  // 호스팅이 요청을 넘기면서 내부 주소로 바꿀 수 있어, 원래 호스트(X-Forwarded-Host)도 같은 사이트로 본다.
  // (Expo 공식 호스팅은 Origin을 공개 주소로 붙이고, 요청 주소는 내부 호스트다.)
  const ownHosts = [new URL(request.url).host, request.headers.get('host'), request.headers.get('x-forwarded-host')];
  try {
    return !ownHosts.includes(new URL(origin).host);
  } catch {
    return true;
  }
}

function reject(status: number, message: string, retryAfterSeconds?: number): Response {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (retryAfterSeconds) headers['Retry-After'] = String(retryAfterSeconds);
  return Response.json({ error: message }, { status, headers });
}

// 막아야 하면 오류 응답을, 통과면 null을 돌려준다. 바깥 API를 부르기 바로 전에 호출한다.
export function guardApi(request: Request, api: GuardedApi, now = Date.now()): Response | null {
  if (isCrossSite(request)) return reject(403, '이 사이트에서 보낸 요청만 받아요.');

  const limit = API_LIMITS[api];
  const key = `${api}|${clientId(request)}`;
  let window = clientWindows.get(key);
  if (!window || now - window.start >= MINUTE_MS) {
    if (clientWindows.size >= MAX_TRACKED_CLIENTS) {
      for (const [oldKey, old] of clientWindows) if (now - old.start >= MINUTE_MS) clientWindows.delete(oldKey);
    }
    window = { start: now, count: 0 };
    clientWindows.set(key, window);
  }
  window.count += 1;
  if (window.count > limit.perMinute) {
    return reject(429, `${limit.label} 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.`, Math.ceil((window.start + MINUTE_MS - now) / 1000));
  }

  const day = koreanDay(now);
  const daily = dailyCounts.get(api);
  const used = daily?.day === day ? daily.count : 0;
  if (used >= limit.perDay) return reject(429, `오늘 ${limit.label} 조회 한도를 다 썼어요. 내일 다시 이용해 주세요.`);
  dailyCounts.set(api, { day, count: used + 1 });
  return null;
}
