import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, font } from '../theme';

// Тёмный кастомный диалог подтверждения — вместо системного Alert.alert,
// который на Android рисуется белым и выбивается из тёмной темы приложения.
export default function ConfirmDialog({
  visible, title, message,
  confirmText = 'Удалить', cancelText = 'Отмена',
  onConfirm, onCancel,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.confirmBtn]} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 320,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800', textAlign: 'center' },
  message: {
    color: colors.textMuted, fontSize: font.sizeMD, textAlign: 'center',
    lineHeight: 20, marginTop: spacing.sm,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  btn: { flex: 1, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.surfaceAlt },
  cancelText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  confirmBtn: { backgroundColor: colors.danger },
  confirmText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '800' },
});
