import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/components/theme';
import type { Region } from '@/data/regions';
import { useAuth } from '@/state/auth';
import { useRegionPicker } from '@/state/regionPicker';

const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9_]{2,12}$/;

// 필수 약관과 선택 항목. 약관 본문은 정식 출시 전에 법무 검토를 거쳐 붙인다(데모에서는 제목만).
const REQUIRED_TERMS = [
  { key: 'service', label: '서비스 이용약관 동의' },
  { key: 'privacy', label: '개인정보 수집·이용 동의' },
  { key: 'location', label: '위치기반서비스 이용약관 동의' },
  { key: 'age', label: '만 14세 이상입니다' },
] as const;
type TermKey = (typeof REQUIRED_TERMS)[number]['key'] | 'marketing';

// 카카오 로그인 후 처음 한 번 거치는 '프로필 설정' (닉네임·기본 동네·약관). 이미 만든 프로필이면 수정 화면으로 쓴다.
export default function ProfileSetupScreen() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (status !== 'needsProfile' && status !== 'ready') {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.help}>카카오로 로그인한 뒤 프로필을 설정할 수 있어요.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/profile')} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>프로필로 가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  // 로그인 확인이 끝난 뒤에 폼을 만들어야 카카오 닉네임·기존 프로필이 기본값으로 들어간다.
  return <ProfileForm />;
}

function ProfileForm() {
  const { profile, kakaoNickname, kakaoAvatarUrl, isNicknameTaken, saveProfile } = useAuth();
  const { pickPostRegion } = useRegionPicker();
  const [nickname, setNickname] = useState(profile?.nickname ?? (kakaoNickname ?? '').replace(/\s+/g, '').slice(0, 12));
  const [region, setRegion] = useState<Region | null>(profile?.homeRegion ?? null);
  const [agreed, setAgreed] = useState<Record<TermKey, boolean>>({
    service: Boolean(profile),
    privacy: Boolean(profile),
    location: Boolean(profile),
    age: Boolean(profile),
    marketing: profile?.marketingOptIn ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarUrl = profile?.avatarUrl ?? kakaoAvatarUrl;
  const trimmed = nickname.trim();
  const nicknameValid = NICKNAME_PATTERN.test(trimmed);
  const allRequired = REQUIRED_TERMS.every((term) => agreed[term.key]);
  const canSubmit = nicknameValid && region !== null && allRequired && !saving;

  const toggle = (key: TermKey) => setAgreed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAll = () => {
    const next = !(allRequired && agreed.marketing);
    setAgreed({ service: next, privacy: next, location: next, age: next, marketing: next });
  };
  const chooseRegion = async () => {
    const picked = await pickPostRegion(region, '기본 동네 선택');
    if (picked) setRegion(picked);
  };
  const submit = async () => {
    if (!canSubmit || !region) return;
    setSaving(true);
    setError(null);
    try {
      if (trimmed !== profile?.nickname && (await isNicknameTaken(trimmed))) throw new Error('이미 쓰고 있는 닉네임이에요.');
      const firstTime = !profile;
      await saveProfile({ nickname: trimmed, avatarUrl, homeRegion: region, marketingOptIn: agreed.marketing });
      // 처음 설정이면 앱 첫 화면으로, 수정이면 프로필로 돌아간다.
      if (firstTime) router.replace('/');
      else if (router.canGoBack()) router.back();
      else router.replace('/profile');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{profile ? '프로필 수정' : '프로필 설정'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} accessibilityLabel="카카오 프로필 사진" />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={34} color={colors.subText} />
            </View>
          )}
          <Text style={styles.help}>프로필 사진은 카카오 사진을 써요.</Text>
        </View>

        <Text style={styles.label}>닉네임</Text>
        <TextInput
          testID="setup-nickname"
          value={nickname}
          onChangeText={setNickname}
          placeholder="2~12자 (한글·영문·숫자·_)"
          placeholderTextColor={colors.mutedText}
          maxLength={12}
          style={styles.input}
        />
        {!nicknameValid && trimmed.length > 0 ? <Text style={styles.error}>2~12자의 한글·영문·숫자·_만 쓸 수 있어요.</Text> : null}

        <Text style={styles.label}>기본 동네</Text>
        <Pressable testID="setup-region" accessibilityRole="button" onPress={chooseRegion} style={styles.regionButton}>
          <Ionicons name="location-sharp" size={18} color={region ? colors.primary : colors.subText} />
          <Text style={[styles.regionText, !region && styles.placeholder]} numberOfLines={1}>
            {region ? `${region.name} · ${region.sido} ${region.sigungu}` : '동네를 골라 주세요'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subText} />
        </Pressable>
        <Text style={styles.help}>글을 등록할 때 기본으로 쓰는 동네예요. 지도에는 동네 대표 위치만 보여요.</Text>

        <Text style={styles.label}>약관 동의</Text>
        <View style={styles.terms}>
          <Check testID="setup-agree-all" label="전체 동의 (선택 항목 포함)" checked={allRequired && agreed.marketing} onPress={toggleAll} strong />
          {REQUIRED_TERMS.map((term) => (
            <Check key={term.key} testID={`setup-agree-${term.key}`} label={`[필수] ${term.label}`} checked={agreed[term.key]} onPress={() => toggle(term.key)} />
          ))}
          <Check testID="setup-agree-marketing" label="[선택] 이벤트·소식 알림 받기" checked={agreed.marketing} onPress={() => toggle('marketing')} />
        </View>
        <Text style={styles.help}>
          수집 항목: 닉네임·프로필 사진·기본 동네(필수), 카카오계정 이메일(카카오에서 동의한 경우만). 데모라 약관 본문은 아직 없고, 정식 출시 전에 법무 검토 후 붙입니다.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable testID="setup-submit" accessibilityRole="button" disabled={!canSubmit} onPress={submit} style={[styles.submit, !canSubmit && styles.submitDisabled]}>
          {saving ? <ActivityIndicator color={colors.textStrong} /> : <Text style={styles.submitText}>{profile ? '저장' : '시작하기'}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Check({ label, checked, onPress, strong, testID }: { label: string; checked: boolean; onPress: () => void; strong?: boolean; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.check}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? colors.primary : colors.subText} />
      <Text style={[styles.checkText, strong && styles.checkStrong]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  header: { height: 52, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  avatarRow: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  label: { marginTop: 22, marginBottom: 8, fontSize: 15, fontWeight: '700', color: colors.text },
  input: { height: 48, paddingHorizontal: 14, borderRadius: 10, fontSize: 16, color: colors.text, backgroundColor: colors.surface },
  regionButton: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.surface },
  regionText: { flex: 1, fontSize: 16, color: colors.text },
  placeholder: { color: colors.mutedText },
  help: { marginTop: 6, fontSize: 13, color: colors.subText },
  error: { marginTop: 8, fontSize: 14, color: colors.caution },
  terms: { gap: 2, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.surface },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  checkText: { flex: 1, fontSize: 15, color: colors.text },
  checkStrong: { fontWeight: '700' },
  submit: { marginTop: 28, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 17, fontWeight: '700', color: colors.textStrong },
  secondaryButton: { height: 44, paddingHorizontal: 18, borderRadius: 10, justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  secondaryText: { fontSize: 15, fontWeight: '700', color: colors.text },
});
