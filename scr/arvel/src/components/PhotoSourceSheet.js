import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, font } from '../theme';
import { CameraIcon, ImageIcon, CloseIcon } from './Icons';

// Квадратный аватар: камера или галерея, с запросом нужного разрешения.
// Возвращает ассет expo-image-picker или null, если человек передумал.
export async function pickAvatarFromLibrary() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее в настройках, чтобы выбрать аватар.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  return res.canceled ? null : res.assets[0];
}

export async function takeAvatarPhoto() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Нет доступа к камере', 'Разрешите доступ к камере в настройках, чтобы сделать фото.');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  return res.canceled ? null : res.assets[0];
}

// Строка-опция внутри шторки выбора фото
function SheetOption({ icon, label, sub, danger, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
      onPress={onPress}
    >
      <View style={[styles.sheetIcon, danger && styles.sheetIconDanger]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sheetLabel, danger && { color: colors.danger }]}>{label}</Text>
        {!!sub && <Text style={styles.sheetSub}>{sub}</Text>}
      </View>
    </Pressable>
  );
}

// Шторка выбора фото профиля — вместо системного Alert.
// onPick(asset) вызывается с выбранным/снятым фото; onRemove — если передан,
// показывается пункт «Удалить фото».
export default function PhotoSourceSheet({ visible, onClose, onPick, onRemove, title = 'Фото профиля' }) {
  // Закрываем шторку и после закрытия запускаем действие.
  // Небольшая задержка нужна, чтобы Modal успел скрыться до открытия
  // нативного пикера — иначе на Android они конфликтуют.
  const run = (action) => {
    onClose();
    setTimeout(action, 250);
  };
  const pickWith = (picker) => run(async () => {
    const asset = await picker();
    if (asset) onPick(asset);
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        {/* Тап по самой шторке не закрывает её */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>

          <SheetOption
            icon={<CameraIcon size={20} color={colors.accent} />}
            label="Сделать фото"
            sub="Откроется камера"
            onPress={() => pickWith(takeAvatarPhoto)}
          />
          <View style={styles.sheetDivider} />
          <SheetOption
            icon={<ImageIcon size={20} color={colors.accent} />}
            label="Выбрать из галереи"
            sub="Фото из вашей библиотеки"
            onPress={() => pickWith(pickAvatarFromLibrary)}
          />

          {onRemove && (
            <>
              <View style={styles.sheetDivider} />
              <SheetOption
                icon={<CloseIcon size={20} color={colors.danger} />}
                label="Удалить фото"
                danger
                onPress={() => run(onRemove)}
              />
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.sheetCancel, pressed && { opacity: 0.85 }]}
            onPress={onClose}
          >
            <Text style={styles.sheetCancelText}>Отмена</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.text, fontSize: font.sizeLG, fontWeight: '800',
    marginBottom: spacing.sm,
  },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 14,
  },
  sheetRowPressed: { opacity: 0.7 },
  sheetIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetIconDanger: { backgroundColor: 'rgba(255,69,58,0.12)' },
  sheetLabel: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  sheetSub: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
  sheetDivider: { height: 1, backgroundColor: colors.border, marginLeft: 42 + 16 },
  sheetCancel: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetCancelText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
});
