import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { colors } from '@/components/theme';
import { PetPurpose, purposeColors } from '@/data/pets';

// 글쓰기 메뉴 항목(id·text·icon·color). 지금은 앱 안에 고정하고, 나중에 서버에서 받도록 바꿀 수 있게 목록으로 둔다.
// 항목을 늘릴 때는 이 목록에만 추가하면 된다.
type WriteMenuItem = { id: PetPurpose; text: string; icon: ComponentProps<typeof Ionicons>['name']; color: string };
const writeMenuItems: WriteMenuItem[] = [
  { id: 'mating', text: '교배등록', icon: 'heart-circle', color: purposeColors.mating },
  { id: 'adoption', text: '입양등록', icon: 'home', color: purposeColors.adoption },
];

// "+ 등록하기" 버튼. 누르면 위에 메뉴가 열리고 버튼은 닫기(✕)로 바뀐다.
// bottom: 화면 아래에서 버튼까지 거리 (지도에서는 하단 시트 위에 띄운다). 기본은 탭 바 바로 위.
export function WriteMenu({ bottom = TAB_BAR_SPACE }: { bottom?: number }) {
  const [open, setOpen] = useState(false);

  const select = (item: WriteMenuItem) => {
    setOpen(false);
    router.push({ pathname: '/pet-write', params: { purpose: item.id } });
  };

  return (
    <>
      {open && <Pressable testID="write-menu-backdrop" accessibilityLabel="메뉴 닫기" style={styles.backdrop} onPress={() => setOpen(false)} />}
      <View pointerEvents="box-none" style={[styles.anchor, { bottom }]}>
        {open && (
          <View testID="write-menu" style={styles.panel}>
            {writeMenuItems.map((item) => (
              <Pressable key={item.id} testID={`write-menu-${item.id}`} accessibilityRole="menuitem" onPress={() => select(item)} style={styles.item}>
                <Ionicons name={item.icon} size={26} color={item.color} />
                <Text style={styles.itemText}>{item.text}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {open ? (
          <Pressable testID="write-menu-close" accessibilityLabel="메뉴 닫기" onPress={() => setOpen(false)} style={styles.closeButton}>
            <Ionicons name="close" size={30} color={colors.text} />
          </Pressable>
        ) : (
          <Pressable testID="write-button" accessibilityRole="button" accessibilityLabel="등록하기" onPress={() => setOpen(true)} style={styles.fab}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.fabText}>등록하기</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // 지도 하단 시트(zIndex 5)·지도보기 버튼(6)보다 위
  backdrop: { ...StyleSheet.absoluteFill, zIndex: 7, backgroundColor: 'rgba(0,0,0,0.45)' },
  anchor: { position: 'absolute', zIndex: 7, right: 16, alignItems: 'flex-end', gap: 12 },
  panel: { minWidth: 200, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.surfaceRaised },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 },
  itemText: { fontSize: 17, fontWeight: '600', color: colors.text },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  fabText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  closeButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
});
