-- 사용자 프로필 (카카오 로그인 후 '프로필 설정'에서 만든다)
-- Supabase 대시보드 > SQL Editor에서 한 번 실행한다.
-- 공개 위치 규칙(기획서 7.4.1): 동네는 행정동 코드와 대표 위치만 저장한다. 정확한 좌표·GPS는 저장하지 않는다.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 12),
  avatar_url text,
  home_region_code text not null check (home_region_code ~ '^[0-9]{10}$'), -- 행정안전부 10자리 행정기관코드
  home_region_name text not null,
  home_region_sido text not null,
  home_region_sigungu text not null,
  home_latitude double precision not null,  -- 동네 대표 위치(공개 위치)
  home_longitude double precision not null,
  agreed_terms_at timestamptz not null,     -- 필수 약관·만 14세 이상 확인 시각
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 닉네임은 대소문자 구분 없이 하나만
create unique index if not exists profiles_nickname_key on public.profiles (lower(nickname));

-- 권한: 닉네임·사진·동네 이름은 글 작성자 표시에 쓰이므로 누구나 읽고, 쓰기·수정은 본인만
alter table public.profiles enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles for select using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 수정 시각 자동 갱신
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
