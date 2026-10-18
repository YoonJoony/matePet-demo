// Supabase 클라이언트 (브라우저에서만). 설정은 서버의 /api/supabase-config에서 받아 한 번만 만든다.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let clientLoading: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  clientLoading ??= (async () => {
    const response = await fetch('/api/supabase-config');
    const body = (await response.json()) as { url?: string; anonKey?: string; error?: string };
    if (!body.url || !body.anonKey) throw new Error(body.error ?? '로그인 설정을 불러오지 못했어요.');
    // 카카오 로그인 뒤 돌아온 주소의 인증 코드를 PKCE 방식으로 세션으로 바꾼다(detectSessionInUrl).
    return createClient(body.url, body.anonKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
  })().catch((error: Error) => {
    clientLoading = null; // 실패하면 다음에 다시 시도
    throw error;
  });
  return clientLoading;
}
