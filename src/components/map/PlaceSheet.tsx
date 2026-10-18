import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { fetchPlaceDetail, formatDistance, Place, PlaceDetail, placeEmoji, photoUrl } from '@/data/places';
import { useMapState } from '@/state/mapState';

type IconName = ComponentProps<typeof Ionicons>['name'];
const detailTabs = ['홈', '사진', '후기'] as const;
type DetailTab = (typeof detailTabs)[number];

type DetailState = { id: string; detail: PlaceDetail | null; error: string | null };

// 가게를 고르면 상세(별점·전화·영업시간·후기·사진 전체)를 한 번 더 조회한다.
function usePlaceDetail(place: Place): { detail: PlaceDetail | null; loading: boolean; error: string | null } {
  const [state, setState] = useState<DetailState>({ id: '', detail: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    fetchPlaceDetail(place.id, controller.signal)
      .then((detail) => setState({ id: place.id, detail, error: null }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setState({ id: place.id, detail: null, error: error.message });
      });
    return () => controller.abort();
  }, [place.id]);
  const current = state.id === place.id;
  return { detail: current ? state.detail : null, loading: !current, error: current ? state.error : null };
}

function openUrl(url: string) {
  if (url) Linking.openURL(url);
}

// 시트 윗부분(끌 수 있는 영역). 중간 단계는 가게 이름 줄, 끝까지 올리면 아이콘 줄.
export function PlaceSheetHeader({ place, expanded, onClose }: { place: Place; expanded: boolean; onClose: () => void }) {
  const { likedPlaceIds, togglePlaceLike } = useMapState();
  const liked = likedPlaceIds.has(place.id);

  const actions = (
    <View style={styles.headerActions}>
      <Pressable testID="place-like" accessibilityLabel={liked ? '관심 해제' : '관심 등록'} hitSlop={8} onPress={() => togglePlaceLike(place.id)}>
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? colors.primary : colors.text} />
      </Pressable>
      <Pressable testID="place-close" accessibilityLabel="닫기" hitSlop={8} onPress={onClose}>
        <Ionicons name="close" size={28} color={colors.text} />
      </Pressable>
    </View>
  );

  if (expanded) return <View style={[styles.headerRow, styles.headerRowEnd]}>{actions}</View>;

  return (
    <View style={styles.headerRow}>
      <Text style={styles.compactName} numberOfLines={1}>
        {place.name} <Text style={styles.compactCategory}>{place.category}</Text>
      </Text>
      <View style={styles.flex} />
      {actions}
    </View>
  );
}

export function PlaceSheetBody({ place, expanded }: { place: Place; expanded: boolean }) {
  const { detail, loading, error } = usePlaceDetail(place);
  const [tab, setTab] = useState<DetailTab>('홈');
  // 상세를 받기 전에는 목록에서 받은 사진을 먼저 보여 준다.
  const photos = detail?.photos.length ? detail.photos : place.photos;

  return (
    <View testID={expanded ? 'place-detail' : 'place-summary'}>
      <View style={styles.padded}>
        {expanded && <Text style={styles.title}>{place.name}</Text>}
        <RatingLine detail={detail} loading={loading} />
        <Text style={styles.meta}>{[formatDistance(place.distanceMeters), place.category].filter(Boolean).join(' · ')}</Text>
        <Text style={styles.address} numberOfLines={expanded ? undefined : 1}>
          {place.address}
        </Text>
        {detail?.openNow !== null && detail?.openNow !== undefined && (
          <Text style={[styles.openNow, { color: detail.openNow ? '#2DBE6C' : colors.subText }]}>{detail.openNow ? '영업 중' : '영업 종료'}</Text>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actions}>
        {detail?.phone ? <ActionButton icon="call-outline" label="전화" onPress={() => openUrl(`tel:${detail.phone}`)} /> : null}
        <ActionButton
          icon="navigate-outline"
          label="길찾기"
          onPress={() => openUrl(`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}&destination_place_id=${place.id}`)}
        />
        <ActionButton icon="map-outline" label="구글 지도" onPress={() => openUrl(place.mapsUrl)} />
        {detail?.website ? <ActionButton icon="globe-outline" label="웹사이트" onPress={() => openUrl(detail.website)} /> : null}
      </ScrollView>

      {photos.length > 0 ? (
        <ScrollView testID="place-photos" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {photos.map((photo) => (
            <PhotoTile key={photo.name} photo={photo} large={expanded} />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.noPhoto, styles.padded]}>
          <Text style={styles.noPhotoEmoji}>{placeEmoji(place)}</Text>
          <Text style={styles.meta}>등록된 사진이 없어요.</Text>
        </View>
      )}

      {expanded && (
        <>
          <View style={styles.tabs}>
            {detailTabs.map((item) => (
              <Pressable key={item} testID={`place-tab-${item}`} onPress={() => setTab(item)} style={[styles.tab, item === tab && styles.tabActive]}>
                <Text style={[styles.tabText, item === tab && styles.tabTextActive]}>
                  {item}
                  {item === '후기' && detail ? ` ${detail.reviews.length}` : ''}
                  {item === '사진' ? ` ${photos.length}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.padded}>
            {loading ? (
              <ActivityIndicator color={colors.subText} style={styles.loading} />
            ) : error ? (
              <Text style={styles.notice}>{error}</Text>
            ) : detail ? (
              <DetailTabContent detail={detail} tab={tab} photos={photos} />
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

function RatingLine({ detail, loading }: { detail: PlaceDetail | null; loading: boolean }) {
  if (loading) return <Text style={styles.stats}>…</Text>;
  if (!detail || detail.rating === null) return <Text style={styles.stats}>아직 별점이 없어요</Text>;
  return (
    <Text testID="place-rating" style={styles.stats}>
      <Text style={styles.star}>★ </Text>
      <Text style={styles.rating}>{detail.rating.toFixed(1)}</Text> · 후기 {detail.ratingCount}
    </Text>
  );
}

function DetailTabContent({ detail, tab, photos }: { detail: PlaceDetail; tab: DetailTab; photos: Place['photos'] }) {
  if (tab === '사진') {
    return (
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.name} style={styles.gridCell}>
            <Image source={{ uri: photoUrl(photo, 300) }} style={styles.gridPhoto} accessibilityLabel={`사진 제공: ${photo.author}`} />
          </View>
        ))}
        <Attribution photos={photos} />
      </View>
    );
  }
  if (tab === '후기') {
    if (detail.reviews.length === 0) return <Text style={styles.notice}>아직 후기가 없어요.</Text>;
    return (
      <View style={styles.tabBody}>
        {detail.reviews.map((review) => (
          <View key={review.id} style={styles.review}>
            <Text style={styles.reviewAuthor}>
              {review.author} <Text style={styles.star}>{'★'.repeat(Math.round(review.rating))}</Text>
            </Text>
            <Text style={styles.reviewText}>{review.text}</Text>
            <Text style={styles.meta}>{review.when}</Text>
          </View>
        ))}
        <Text style={styles.source}>후기 출처: Google</Text>
      </View>
    );
  }
  return (
    <View style={styles.tabBody}>
      <InfoRow icon="location-outline" text={detail.address || '정보 없음'} />
      <InfoRow icon="call-outline" text={detail.phone || '전화번호 정보 없음'} />
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={20} color={colors.subText} />
        <View style={styles.flex}>
          {detail.weekdayHours.length === 0 ? (
            <Text style={styles.infoText}>영업시간 정보 없음</Text>
          ) : (
            detail.weekdayHours.map((line) => (
              <Text key={line} style={styles.infoText}>
                {line}
              </Text>
            ))
          )}
        </View>
      </View>
      {detail.website ? <InfoRow icon="globe-outline" text={detail.website} /> : null}
      <Attribution photos={photos} />
    </View>
  );
}

function PhotoTile({ photo, large }: { photo: Place['photos'][number]; large: boolean }) {
  return (
    <View style={[styles.photo, large && styles.photoLarge]}>
      <Image source={{ uri: photoUrl(photo, large ? 600 : 300) }} style={styles.photoImage} accessibilityLabel={`사진 제공: ${photo.author}`} />
    </View>
  );
}

// 구글 사진은 작성자 표시가 필요하다.
function Attribution({ photos }: { photos: Place['photos'] }) {
  const authors = [...new Set(photos.map((photo) => photo.author).filter(Boolean))];
  if (authors.length === 0) return null;
  return <Text style={styles.source}>사진 제공: {authors.slice(0, 3).join(', ')}{authors.length > 3 ? ` 외 ${authors.length - 3}명` : ''} · Google</Text>;
}

// 끝까지 올렸을 때 아래 고정 버튼.
export function PlaceSheetFooter({ place }: { place: Place }) {
  return (
    <Pressable testID="open-google-maps" onPress={() => openUrl(place.mapsUrl)} style={styles.footerButton}>
      <Text style={styles.footerText}>구글 지도에서 보기</Text>
    </Pressable>
  );
}

function ActionButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
      <Ionicons name={icon} size={16} color={colors.text} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.subText} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  headerRowEnd: { justifyContent: 'flex-end' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginLeft: 12 },
  compactName: { flexShrink: 1, fontSize: 20, fontWeight: '700', color: colors.text },
  compactCategory: { fontSize: 14, fontWeight: '400', color: colors.subText },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  stats: { marginTop: 6, fontSize: 15, color: colors.text },
  star: { color: colors.primary },
  rating: { fontWeight: '700' },
  meta: { marginTop: 4, fontSize: 14, color: colors.subText },
  address: { marginTop: 4, fontSize: 15, color: colors.text },
  openNow: { marginTop: 4, fontSize: 14, fontWeight: '600' },
  actions: { gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
  actionText: { fontSize: 15, fontWeight: '600', color: colors.text },
  photos: { gap: 6, paddingHorizontal: 16 },
  photo: { width: 112, height: 136, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surfaceRaised },
  photoLarge: { width: 176, height: 220 },
  photoImage: { width: '100%', height: '100%' },
  noPhoto: { alignItems: 'center', gap: 4, paddingVertical: 12, marginHorizontal: 16, borderRadius: 8, backgroundColor: colors.surfaceRaised },
  noPhotoEmoji: { fontSize: 32 },
  tabs: { flexDirection: 'row', marginTop: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.text },
  tabText: { fontSize: 15, color: colors.subText },
  tabTextActive: { color: colors.text, fontWeight: '700' },
  tabBody: { gap: 14, paddingTop: 16 },
  loading: { marginTop: 24 },
  notice: { marginTop: 16, fontSize: 14, color: colors.subText },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text },
  review: { gap: 4, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  reviewAuthor: { fontSize: 15, fontWeight: '700', color: colors.text },
  reviewText: { fontSize: 15, lineHeight: 22, color: colors.text },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingTop: 16 },
  gridCell: { width: '32%', aspectRatio: 1, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.surfaceRaised },
  gridPhoto: { width: '100%', height: '100%' },
  source: { width: '100%', marginTop: 8, fontSize: 12, color: colors.mutedText },
  footerButton: { flex: 1, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  footerText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
