// 브라우저에 Supabase 공개 설정(프로젝트 주소·공개 키)만 넘긴다. 권한은 DB의 RLS 규칙이 지킨다.
// 서버 전용 키(service_role / sb_secret_)를 실수로 넣었으면 공개하지 않고 거부한다.
function isServerOnlyKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const payload = key.split('.')[1]; // 예전 형식(JWT) 키는 역할(role)이 들어 있다
  if (!payload) return false;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json?.role === 'service_role';
  } catch {
    return false;
  }
}

export function publicSupabaseConfig(env: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string }): Response {
  const url = env.SUPABASE_URL?.trim();
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  const headers = { 'Cache-Control': 'no-store' };
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !anonKey || isServerOnlyKey(anonKey)) {
    return Response.json({ error: '로그인 설정이 필요해요. 서버에 SUPABASE_URL과 공개(anon) 키를 설정해 주세요.' }, { status: 503, headers });
  }
  return Response.json({ url, anonKey }, { headers });
}
