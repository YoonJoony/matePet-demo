// GET /api/supabase-config → 로그인·DB용 Supabase 공개 설정 (프로젝트 주소·공개 키)
import { publicSupabaseConfig } from '@/server/publicSupabaseConfig';

export function GET() {
  return publicSupabaseConfig({ SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY });
}
