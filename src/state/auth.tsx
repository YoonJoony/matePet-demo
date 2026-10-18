// 로그인 상태 (Supabase Auth + 카카오 로그인)와 내 프로필(profiles 테이블).
// 로그인은 했지만 프로필이 없으면 '프로필 설정' 화면에서 닉네임·기본 동네·약관 동의를 받는다.
import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Region } from '@/data/regions';
import { getSupabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  homeRegion: Region;
  marketingOptIn: boolean;
};

export type ProfileInput = { nickname: string; avatarUrl: string | null; homeRegion: Region; marketingOptIn: boolean };

type ProfileRow = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  home_region_code: string;
  home_region_name: string;
  home_region_sido: string;
  home_region_sigungu: string;
  home_latitude: number;
  home_longitude: number;
  marketing_opt_in: boolean;
};

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  nickname: row.nickname,
  avatarUrl: row.avatar_url,
  homeRegion: {
    code: row.home_region_code,
    name: row.home_region_name,
    sido: row.home_region_sido,
    sigungu: row.home_region_sigungu,
    latitude: row.home_latitude,
    longitude: row.home_longitude,
  },
  marketingOptIn: row.marketing_opt_in,
});

// demo: 로그인 없이 샘플 사용자로 둘러보기(로그인 화면의 '데모 버전으로 시작하기'). 이 브라우저에 기억한다.
type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready' | 'unavailable' | 'demo';

const DEMO_KEY = 'matepet-demo-mode';
function readDemo(): boolean {
  try {
    return window.localStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}
function writeDemo(on: boolean) {
  try {
    if (on) window.localStorage.setItem(DEMO_KEY, '1');
    else window.localStorage.removeItem(DEMO_KEY);
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 데모로 둔다.
  }
}

type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  message: string | null; // 로그인 설정이 없거나 실패했을 때 안내
  // 카카오에서 받아 온 닉네임·사진 (프로필 설정 기본값)
  kakaoNickname: string | null;
  kakaoAvatarUrl: string | null;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  startDemo: () => void;
  exitDemo: () => void;
  isNicknameTaken: (nickname: string) => Promise<boolean>;
  saveProfile: (input: ProfileInput) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async (next: Session | null) => {
    setSession(next);
    if (!next) {
      setProfile(null);
      setStatus(readDemo() ? 'demo' : 'signedOut');
      return;
    }
    writeDemo(false); // 카카오로 로그인하면 데모는 끝난다
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', next.user.id).maybeSingle<ProfileRow>();
    if (error) {
      setMessage(`프로필을 불러오지 못했어요: ${error.message}`);
      setStatus('needsProfile');
      return;
    }
    setProfile(data ? toProfile(data) : null);
    setStatus(data ? 'ready' : 'needsProfile');
  }, []);

  // 첫 화면에서 저장된 세션을 읽고(카카오에서 돌아온 주소의 코드도 여기서 세션으로 바뀜), 이후 변화를 구독한다.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getSupabase()
      .then(async (supabase) => {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        await loadProfile(data.session);
        const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
          // 토큰 갱신은 프로필을 다시 읽을 필요가 없다.
          if (event === 'TOKEN_REFRESHED') setSession(next);
          else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void loadProfile(next);
        });
        unsubscribe = () => listener.subscription.unsubscribe();
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setMessage(error.message);
        setStatus(readDemo() ? 'demo' : 'unavailable');
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [loadProfile]);

  const signInWithKakao = useCallback(async () => {
    const supabase = await getSupabase();
    // 카카오 로그인 후 돌아올 곳. Supabase 대시보드의 Redirect URLs에 등록된 주소여야 한다.
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (error) throw new Error(`카카오 로그인을 시작하지 못했어요: ${error.message}`);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
  }, []);

  const startDemo = useCallback(() => {
    writeDemo(true);
    setStatus('demo');
  }, []);

  const exitDemo = useCallback(() => {
    writeDemo(false);
    setStatus('signedOut');
  }, []);

  const isNicknameTaken = useCallback(
    async (nickname: string) => {
      const supabase = await getSupabase();
      const { data, error } = await supabase.from('profiles').select('id').ilike('nickname', nickname.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(1);
      if (error) throw new Error(`닉네임을 확인하지 못했어요: ${error.message}`);
      return (data ?? []).some((row) => row.id !== session?.user.id);
    },
    [session],
  );

  const saveProfile = useCallback(
    async (input: ProfileInput) => {
      if (!session) throw new Error('로그인이 필요해요.');
      const supabase = await getSupabase();
      const { homeRegion: region } = input;
      const row = {
        id: session.user.id,
        nickname: input.nickname,
        avatar_url: input.avatarUrl,
        home_region_code: region.code,
        home_region_name: region.name,
        home_region_sido: region.sido,
        home_region_sigungu: region.sigungu,
        home_latitude: region.latitude,
        home_longitude: region.longitude,
        agreed_terms_at: new Date().toISOString(),
        marketing_opt_in: input.marketingOptIn,
      };
      const { data, error } = await supabase.from('profiles').upsert(row).select('*').single<ProfileRow>();
      if (error) {
        if (error.code === '23505') throw new Error('이미 쓰고 있는 닉네임이에요.');
        throw new Error(`프로필을 저장하지 못했어요: ${error.message}`);
      }
      setProfile(toProfile(data));
      setStatus('ready');
    },
    [session],
  );

  const metadata = session?.user.user_metadata ?? {};
  const kakaoNickname = (metadata.name ?? metadata.full_name ?? metadata.nickname ?? metadata.user_name ?? null) as string | null;
  const kakaoAvatarUrl = (metadata.avatar_url ?? metadata.picture ?? null) as string | null;

  const value = useMemo(
    () => ({ status, session, profile, message, kakaoNickname, kakaoAvatarUrl, signInWithKakao, signOut, startDemo, exitDemo, isNicknameTaken, saveProfile }),
    [status, session, profile, message, kakaoNickname, kakaoAvatarUrl, signInWithKakao, signOut, startDemo, exitDemo, isNicknameTaken, saveProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
