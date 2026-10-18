import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/components/theme';
import { formatDistance, Place, placeEmoji, searchPlaces } from '@/data/places';
import { useMapState } from '@/state/mapState';

const suggestions = ['카페', '편의점', '약국', '미용실', '헬스장', '세탁소', '빵집', '꽃집'];

type SearchState = { status: 'idle' } | { status: 'loading'; query: string } | { status: 'done'; query: string; places: Place[] } | { status: 'error'; query: string; message: string };

export default function MapSearchScreen() {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState<SearchState>({ status: 'idle' });
  const { searchCenter, selectPlace, recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useMapState();

  // 입력할 때마다 호출하면 쿼터를 빨리 쓰므로, 검색 버튼(엔터)이나 추천·최근 검색을 누를 때만 호출한다.
  const runSearch = async (value: string) => {
    const query = value.trim();
    if (!query) return;
    setKeyword(query);
    addRecentSearch(query);
    setSearch({ status: 'loading', query });
    try {
      const places = await searchPlaces({ center: searchCenter, query });
      setSearch({ status: 'done', query, places });
    } catch (error) {
      setSearch({ status: 'error', query, message: (error as Error).message });
    }
  };

  const openPlace = (place: Place) => {
    selectPlace(place);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable testID="search-back" accessibilityLabel="뒤로 가기" hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <TextInput
          testID="search-input"
          autoFocus
          value={keyword}
          onChangeText={(text) => {
            setKeyword(text);
            if (!text) setSearch({ status: 'idle' });
          }}
          onSubmitEditing={() => runSearch(keyword)}
          placeholder="동물병원·반려용품 등 시설 검색"
          placeholderTextColor={colors.subText}
          returnKeyType="search"
          style={styles.input}
        />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        {search.status === 'idle' ? (
          <>
            <Text style={styles.sectionTitle}>추천 검색</Text>
            <View style={styles.chips}>
              {suggestions.map((item) => (
                <Pressable key={item} testID={`suggestion-${item}`} onPress={() => runSearch(item)} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>최근 검색</Text>
              {recentSearches.length > 0 && (
                <Pressable onPress={clearRecentSearches}>
                  <Text style={styles.clear}>전체 삭제</Text>
                </Pressable>
              )}
            </View>
            {recentSearches.length === 0 && <Text style={styles.empty}>최근 검색 기록이 없어요.</Text>}
            {recentSearches.map((item) => (
              <View key={item.id} style={styles.recent}>
                <Pressable style={styles.recentMain} onPress={() => runSearch(item.keyword)}>
                  <Ionicons name="time-outline" size={20} color={colors.text} />
                  <Text style={styles.recentText}>{item.keyword}</Text>
                </Pressable>
                <Text style={styles.meta}>{item.date}</Text>
                <Pressable accessibilityLabel={`${item.keyword} 삭제`} hitSlop={8} onPress={() => removeRecentSearch(item.id)}>
                  <Ionicons name="close" size={18} color={colors.subText} />
                </Pressable>
              </View>
            ))}
          </>
        ) : search.status === 'loading' ? (
          <ActivityIndicator color={colors.subText} style={styles.loading} />
        ) : search.status === 'error' ? (
          <Text style={styles.empty}>{search.message}</Text>
        ) : (
          <View testID="search-results">
            {search.places.length === 0 ? (
              <Text style={styles.empty}>반경 3km 안에 ‘{search.query}’ 결과가 없어요.</Text>
            ) : (
              search.places.map((place) => (
                <Pressable key={place.id} testID={`search-result-${place.id}`} onPress={() => openPlace(place)} style={styles.result}>
                  <View style={styles.resultIcon}>
                    <Text style={styles.resultEmoji}>{placeEmoji(place)}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.resultName}>{place.name}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {place.category} · {formatDistance(place.distanceMeters)} · {place.address}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
            <Text style={styles.source}>장소 정보: Google</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
  },
  sectionTitle: { marginTop: 16, marginHorizontal: 16, fontSize: 15, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.surfaceRaised },
  chipText: { fontSize: 15, color: colors.text },
  recentHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingRight: 16, marginTop: 12 },
  clear: { fontSize: 14, color: colors.subText },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  recentMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentText: { fontSize: 16, color: colors.text },
  meta: { fontSize: 13, color: colors.subText },
  empty: { margin: 16, fontSize: 15, color: colors.subText },
  loading: { marginTop: 32 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  resultIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  resultEmoji: { fontSize: 24 },
  resultName: { fontSize: 16, fontWeight: '600', color: colors.text },
  source: { margin: 16, fontSize: 12, color: colors.mutedText },
});
