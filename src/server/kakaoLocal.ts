// 카카오 로컬 API (서버 전용). REST API 키는 서버 환경변수 KAKAO_REST_API_KEY에서만 읽고 응답에 담지 않는다.

export type KakaoRegion = { code: string; name: string; sido: string; sigungu: string };
export type KakaoLookup = { ok: true; region: KakaoRegion | null } | { ok: false; reason: 'no-key' | 'error'; message: string };

// 좌표 → 행정구역 (coord2regioncode). 행정동(region_type 'H')만 쓰고 법정동('B')은 쓰지 않는다.
// x = 경도, y = 위도, 좌표계 WGS84.
export async function coord2RegionCode(lng: number, lat: number, signal?: AbortSignal): Promise<KakaoLookup> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return { ok: false, reason: 'no-key', message: '서버에 KAKAO_REST_API_KEY가 설정되지 않았어요.' };

  const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}&input_coord=WGS84`;
  try {
    const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, signal });
    if (!response.ok) return { ok: false, reason: 'error', message: `카카오 행정구역 조회 실패 (${response.status})` };
    const body = (await response.json()) as {
      documents?: { region_type: string; code: string; region_1depth_name: string; region_2depth_name: string; region_3depth_name: string }[];
    };
    const admin = body.documents?.find((doc) => doc.region_type === 'H');
    if (!admin) return { ok: true, region: null };
    return {
      ok: true,
      region: { code: admin.code, name: admin.region_3depth_name, sido: admin.region_1depth_name, sigungu: admin.region_2depth_name },
    };
  } catch (error) {
    return { ok: false, reason: 'error', message: `카카오 행정구역 조회 실패: ${(error as Error).message}` };
  }
}
