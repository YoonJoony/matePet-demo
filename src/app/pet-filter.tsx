import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RangeSlider } from '@/components/pets/RangeSlider';
import { ChoiceChips, Field } from '@/components/pets/ui';
import { colors } from '@/components/theme';
import {
  breedsByKind,
  defaultPetFilter,
  DISTANCE_LIMIT_KM,
  distanceRangeLabel,
  kindFilterOptions,
  nearbyListedPosts,
  PetFilter,
  purposeFilterOptions,
  quickMaxDistancesKm,
  sexFilterOptions,
} from '@/data/pets';
import { useMapState } from '@/state/mapState';
import { usePetPosts } from '@/state/petPosts';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// 필터 설정 (기획서 5.1, 5.2). 고친 조건은 `적용`을 눌러야 지도·글 목록에 함께 반영된다.
export default function PetFilterScreen() {
  const { posts, filter, setFilter } = usePetPosts();
  const { searchCenter, areaLabel } = useMapState();
  const [draft, setDraft] = useState<PetFilter>(filter);
  const update = (patch: Partial<PetFilter>) => setDraft((prev) => ({ ...prev, ...patch }));
  const resultCount = useMemo(() => nearbyListedPosts(posts, searchCenter, draft).length, [posts, searchCenter, draft]);

  const breedOptions = draft.kind === 'all' ? [] : [{ value: 'all', label: '전체' }, ...breedsByKind[draft.kind].map((breed) => ({ value: breed, label: breed }))];
  const [minKm, maxKm] = draft.distanceKm;

  const apply = () => {
    setFilter(draft);
    goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable testID="filter-close" accessibilityLabel="닫기" hitSlop={8} onPress={goBack}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>필터</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Field label="목적">
          <ChoiceChips options={purposeFilterOptions} value={draft.purpose} onChange={(purpose) => update({ purpose })} testIDPrefix="filter-purpose" />
        </Field>

        <Field label="종류">
          {/* 종류를 바꾸면 이전 종류에만 있는 품종 선택은 초기화한다 (기획서 5.1). */}
          <ChoiceChips options={kindFilterOptions} value={draft.kind} onChange={(kind) => update({ kind, breed: 'all' })} testIDPrefix="filter-kind" />
        </Field>

        <Field label={draft.kind === 'bird' ? '종·품종' : '품종'} hint={draft.kind === 'all' ? '종류를 먼저 고르면 품종을 고를 수 있어요.' : undefined}>
          {breedOptions.length > 0 ? (
            <ChoiceChips options={breedOptions} value={draft.breed} onChange={(breed) => update({ breed })} testIDPrefix="filter-breed" />
          ) : null}
        </Field>

        <Field label="성별">
          <ChoiceChips options={sexFilterOptions} value={draft.sex} onChange={(sex) => update({ sex })} testIDPrefix="filter-sex" />
        </Field>

        <Field label="거리" hint={`검색 중심(${areaLabel.title} · ${areaLabel.basis})에서 등록 동네까지 직선거리`}>
          <Text testID="filter-distance-value" style={styles.distanceValue}>
            {distanceRangeLabel(draft.distanceKm)}
          </Text>
          <RangeSlider
            testID="filter-distance"
            min={0}
            max={DISTANCE_LIMIT_KM}
            step={1}
            value={draft.distanceKm}
            onChange={(distanceKm) => update({ distanceKm })}
            formatValue={(km) => `${km}km`}
          />
          <View style={styles.scale}>
            <Text style={styles.scaleText}>0km</Text>
            <Text style={styles.scaleText}>{DISTANCE_LIMIT_KM}km</Text>
          </View>
          <Text style={styles.quickTitle}>최대 거리 빠른 선택</Text>
          <ChoiceChips
            options={quickMaxDistancesKm.map((km) => ({ value: String(km), label: `${km}km` }))}
            value={String(maxKm)}
            onChange={(value) => {
              const km = Number(value);
              update({ distanceKm: [Math.min(minKm, km), km] });
            }}
            testIDPrefix="filter-max"
          />
        </Field>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable testID="filter-reset-draft" onPress={() => setDraft(defaultPetFilter)} style={styles.resetButton}>
          <Ionicons name="refresh" size={18} color={colors.text} />
          <Text style={styles.resetText}>초기화</Text>
        </Pressable>
        <Pressable testID="filter-apply" accessibilityRole="button" onPress={apply} style={styles.applyButton}>
          <Text style={styles.applyText}>{resultCount}마리 보기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  headerSpace: { width: 28 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  distanceValue: { fontSize: 18, fontWeight: '700', color: colors.primary },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  scaleText: { fontSize: 12, color: colors.mutedText },
  quickTitle: { marginTop: 8, fontSize: 14, color: colors.subText },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  resetButton: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 52, paddingHorizontal: 18, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  resetText: { fontSize: 16, fontWeight: '600', color: colors.text },
  applyButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primary },
  applyText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
