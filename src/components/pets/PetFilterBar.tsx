import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import {
  activeFilterCount,
  defaultPetFilter,
  distanceRangeLabel,
  kindLabels,
  purposeFilterOptions,
  quickMaxDistancesKm,
  sexLabels,
} from '@/data/pets';
import { usePetPosts } from '@/state/petPosts';

const openFilter = () => router.push('/pet-filter');

// 지도·글 목록 위의 필터 줄: 필터 화면 버튼, 목적 `전체 / 교배 상대 / 입양`, 빠른 필터 `종류 / 품종 / 성별 / 거리` (기획서 4.1).
// 빠른 필터 칩은 지금 적용 중인 값을 보여 주고, 누르면 필터 화면을 연다. floating은 지도 위에 띄울 때.
export function PetFilterBar({ floating, testIDPrefix }: { floating?: boolean; testIDPrefix: string }) {
  const { filter, setFilter } = usePetPosts();
  const count = activeFilterCount(filter);
  const [defaultMin, defaultMax] = defaultPetFilter.distanceKm;
  const quickChips = [
    { key: 'kind', label: filter.kind === 'all' ? '종류' : kindLabels[filter.kind], active: filter.kind !== 'all' },
    { key: 'breed', label: filter.breed === 'all' ? '품종' : filter.breed, active: filter.breed !== 'all' },
    { key: 'sex', label: filter.sex === 'all' ? '성별' : sexLabels[filter.sex], active: filter.sex !== 'all' },
    {
      key: 'distance',
      label: distanceRangeLabel(filter.distanceKm),
      active: filter.distanceKm[0] !== defaultMin || filter.distanceKm[1] !== defaultMax,
    },
  ];
  const chipStyle = [styles.chip, floating && styles.chipFloating];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, !floating && styles.rowPlain]}>
      <Pressable
        testID={`${testIDPrefix}-open`}
        accessibilityRole="button"
        accessibilityLabel={count > 0 ? `필터, ${count}개 적용 중` : '필터'}
        onPress={openFilter}
        style={[...chipStyle, styles.iconChip, count > 0 && styles.chipSelected]}
      >
        <Ionicons name="options-outline" size={18} color={count > 0 ? colors.background : colors.text} />
        {count > 0 ? <Text style={[styles.chipText, styles.chipTextSelected]}>{count}</Text> : null}
      </Pressable>
      {purposeFilterOptions.map((option) => {
        const selected = option.value === filter.purpose;
        return (
          <Pressable
            key={option.value}
            testID={`${testIDPrefix}-purpose-${option.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setFilter({ ...filter, purpose: option.value })}
            style={[...chipStyle, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
      <View style={styles.divider} />
      {quickChips.map((chip) => (
        <Pressable
          key={chip.key}
          testID={`${testIDPrefix}-${chip.key}`}
          accessibilityRole="button"
          accessibilityHint="필터 화면을 열어요"
          onPress={openFilter}
          style={[...chipStyle, styles.quickChip, chip.active && styles.chipSelected]}
        >
          <Text style={[styles.chipText, chip.active && styles.chipTextSelected]}>{chip.label}</Text>
          <Ionicons name="chevron-down" size={14} color={chip.active ? colors.background : colors.subText} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

// 결과가 없을 때: 거리 넓히기 또는 조건 초기화. 필터 범위는 자동으로 바꾸지 않는다 (기획서 5.3).
export function FilterEmptyState() {
  const { filter, setFilter } = usePetPosts();
  const [min, max] = filter.distanceKm;
  const nextMax = quickMaxDistancesKm.find((km) => km > max);

  return (
    <View testID="filter-empty" style={styles.empty}>
      <Text style={styles.emptyText}>조건에 맞는 등록 글이 없어요.</Text>
      <View style={styles.emptyActions}>
        {nextMax ? (
          <Pressable testID="filter-widen" onPress={() => setFilter({ ...filter, distanceKm: [min, nextMax] })} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>{nextMax}km까지 넓히기</Text>
          </Pressable>
        ) : null}
        <Pressable testID="filter-reset" onPress={() => setFilter(defaultPetFilter)} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>조건 초기화</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, alignItems: 'center' },
  rowPlain: { paddingHorizontal: 16, paddingVertical: 8 },
  chip: { height: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.surfaceRaised },
  chipFloating: { backgroundColor: 'rgba(32,34,39,0.94)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  chipSelected: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontSize: 14, color: colors.text },
  chipTextSelected: { color: colors.background, fontWeight: '700' },
  iconChip: { gap: 4, paddingHorizontal: 10 },
  quickChip: { gap: 4, paddingRight: 10 },
  divider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.mutedText },
  empty: { alignItems: 'center', gap: 14, marginVertical: 28 },
  emptyText: { fontSize: 15, color: colors.subText },
  emptyActions: { flexDirection: 'row', gap: 8 },
  emptyButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
});
