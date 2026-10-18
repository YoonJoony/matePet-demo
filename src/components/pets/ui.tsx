import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { colors } from '@/components/theme';
import { PetPost, PetPurpose, purposeColors, purposeLabels } from '@/data/pets';

// 하나만 고르는 선택 칩 묶음
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={`${testIDPrefix}-${option.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// 제목·오류 문구를 함께 보여 주는 입력 구역
export function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Input({ error, style, ...props }: TextInputProps & { error?: boolean }) {
  return <TextInput placeholderTextColor={colors.mutedText} {...props} style={[styles.input, props.multiline && styles.multiline, error && styles.inputError, style]} />;
}

export function CheckRow({ checked, label, onToggle, testID }: { checked: boolean; label: string; onToggle: () => void; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={styles.checkRow}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>{checked ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}</View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

// 웹에서도 동작하는 확인 창 (react-native의 Alert는 웹에서 버튼 여러 개를 띄우지 못한다)
export function ConfirmDialog({
  visible,
  title,
  message,
  actions,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: { label: string; onPress: () => void; primary?: boolean }[];
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.dialogBackdrop} onPress={onDismiss}>
        <Pressable style={styles.dialog} onPress={() => undefined}>
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMessage}>{message}</Text> : null}
          <View style={styles.dialogActions}>
            {actions.map((action) => (
              <Pressable key={action.label} testID={`dialog-${action.label}`} onPress={action.onPress} style={[styles.dialogButton, action.primary && styles.dialogButtonPrimary]}>
                <Text style={[styles.dialogButtonText, action.primary && styles.dialogButtonTextPrimary]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// 사진이 있으면 첫 사진, 없으면 종류별 그림
export function PetImage({ post, style, emojiSize = 44 }: { post: Pick<PetPost, 'photos' | 'placeholder' | 'title'>; style?: ViewStyle; emojiSize?: number }) {
  const photo = post.photos[0];
  return (
    <View style={[styles.petImage, { backgroundColor: post.placeholder.color }, style]}>
      {photo ? (
        <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} accessibilityLabel={`${post.title} 사진`} />
      ) : (
        <Text style={{ fontSize: emojiSize }}>{post.placeholder.emoji}</Text>
      )}
    </View>
  );
}

// 색과 글자를 함께 쓰는 목적 배지 (기획서 4.2 — 색만으로 구분하지 않음)
export function PurposeBadge({ purpose }: { purpose: PetPurpose }) {
  return (
    <View style={[styles.badge, { borderColor: purposeColors[purpose] }]}>
      <Text style={[styles.badgeText, { color: purposeColors[purpose] }]}>{purposeLabels[purpose]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: colors.surfaceStrong },
  chipSelected: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontSize: 15, color: colors.text },
  chipTextSelected: { color: colors.background, fontWeight: '700' },
  field: { marginTop: 24, gap: 8 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
  required: { color: colors.primary },
  hint: { fontSize: 13, color: colors.subText },
  error: { fontSize: 13, color: '#FF5C5C' },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceStrong,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  inputError: { borderColor: '#FF5C5C' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.mutedText, alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { fontSize: 15, color: colors.text },
  sectionTitle: { marginTop: 36, fontSize: 18, fontWeight: '700', color: colors.text },
  dialogBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: 'rgba(0,0,0,0.6)' },
  dialog: { width: '100%', maxWidth: 360, padding: 20, borderRadius: 14, backgroundColor: colors.surfaceRaised, gap: 8 },
  dialogTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  dialogMessage: { fontSize: 15, lineHeight: 22, color: colors.subText },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  dialogButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  dialogButtonPrimary: { backgroundColor: colors.primary },
  dialogButtonText: { fontSize: 15, fontWeight: '600', color: colors.text },
  dialogButtonTextPrimary: { color: '#FFFFFF' },
  petImage: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
