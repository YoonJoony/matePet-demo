import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { formatDistance, photoUrl, Place, PlaceCategory, placeCategories, placeEmoji } from '@/data/places';
import { useMapState } from '@/state/mapState';

const PREVIEW_COUNT = 6;

type Props = {
  selectedCategory: PlaceCategory | null;
  onSelectCategory: (category: PlaceCategory | null) => void;
  places: Place[];
  loading: boolean;
  error: string | null;
  locationMessage?: string;
  onSelectPlace: (place: Place) => void;
};

// 주변 시설 모드에서 시설을 고르지 않았을 때 하단 시트 내용: 반려동물 시설 카테고리 + 내 주변 실제 시설 (기획서 8).
export function ExploreContent({ selectedCategory, onSelectCategory, places, loading, error, locationMessage, onSelectPlace }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? places : places.slice(0, PREVIEW_COUNT);
  const title = selectedCategory ? `내 주변 ${selectedCategory.label}` : '내 주변 동물병원·반려용품';

  return (
    <View>
      <View style={styles.categoryGrid}>
        {placeCategories.map((category) => {
          const active = category.label === selectedCategory?.label;
          return (
            <Pressable
              key={category.label}
              testID={`category-${category.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelectCategory(active ? null : category)}
              style={styles.category}
            >
              <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              </View>
              <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{category.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!loading && !error && <Text style={styles.count}>{places.length}곳</Text>}
        </View>
        {locationMessage ? <Text style={styles.notice}>{locationMessage}</Text> : null}

        {loading ? (
          <ActivityIndicator testID="places-loading" color={colors.subText} style={styles.status} />
        ) : error ? (
          <Text testID="places-error" style={[styles.notice, styles.status]}>
            {error}
          </Text>
        ) : places.length === 0 ? (
          <Text style={[styles.notice, styles.status]}>반경 3km 안에 결과가 없어요.</Text>
        ) : (
          <>
            <View style={styles.cards}>
              {visible.map((place) => (
                <PlaceCard key={place.id} place={place} onPress={() => onSelectPlace(place)} />
              ))}
            </View>
            {places.length > PREVIEW_COUNT && (
              <Pressable testID="toggle-all-places" style={styles.moreButton} onPress={() => setShowAll(!showAll)}>
                <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text} />
                <Text style={styles.moreText}>{showAll ? '접기' : `${places.length - PREVIEW_COUNT}곳 더 보기`}</Text>
              </Pressable>
            )}
          </>
        )}
        <Text style={styles.source}>장소 정보·사진: Google</Text>
      </View>
    </View>
  );
}

function PlaceCard({ place, onPress }: { place: Place; onPress: () => void }) {
  const { likedPlaceIds, togglePlaceLike } = useMapState();
  const liked = likedPlaceIds.has(place.id);

  return (
    <Pressable testID={`place-card-${place.id}`} onPress={onPress} style={styles.card}>
      <View style={styles.cardImage}>
        {place.photos[0] ? (
          <Image source={{ uri: photoUrl(place.photos[0], 400) }} style={styles.cardPhoto} accessibilityLabel={`사진 제공: ${place.photos[0].author}`} />
        ) : (
          <Text style={styles.cardEmoji}>{placeEmoji(place)}</Text>
        )}
        <Pressable accessibilityLabel={liked ? '관심 해제' : '관심 등록'} hitSlop={8} onPress={() => togglePlaceLike(place.id)} style={styles.cardHeart}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? colors.primary : '#FFFFFF'} />
        </Pressable>
      </View>
      <Text style={styles.cardName} numberOfLines={1}>
        {place.name}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {place.category} · {formatDistance(place.distanceMeters)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  categoryGrid: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 4 },
  category: { flex: 1, alignItems: 'center', gap: 6 },
  categoryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  categoryIconActive: { backgroundColor: colors.surfaceStrong },
  categoryEmoji: { fontSize: 32 },
  categoryLabel: { fontSize: 13, color: colors.text },
  categoryLabelActive: { color: colors.primary, fontWeight: '700' },
  section: { marginTop: 28, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  count: { fontSize: 14, color: colors.subText },
  notice: { marginTop: 6, fontSize: 14, color: colors.subText },
  status: { marginVertical: 24, textAlign: 'center' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14, rowGap: 18 },
  card: { width: '48.5%' },
  cardImage: { aspectRatio: 1.35, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  cardPhoto: { ...StyleSheet.absoluteFill },
  cardEmoji: { fontSize: 44 },
  cardHeart: { position: 'absolute', top: 8, right: 8 },
  cardName: { marginTop: 8, fontSize: 16, fontWeight: '700', color: colors.text },
  cardMeta: { marginTop: 2, fontSize: 13, color: colors.subText },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    marginTop: 18,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
  moreText: { fontSize: 15, fontWeight: '600', color: colors.text },
  source: { marginTop: 14, fontSize: 12, color: colors.mutedText },
});
