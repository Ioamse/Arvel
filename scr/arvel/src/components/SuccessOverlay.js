import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors, spacing, font } from '../theme';

function CheckGlyph({ size = 48, color = colors.accentText }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="4 13 9.5 18.5 20 6" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Переиспользуемый оверлей успеха: иконка-галочка + заголовок + текст + кнопка.
// Используется и для публикации товара, и для других успешных действий (например, сделки) —
// меняются только title/message/buttonText, структура остаётся неизменной.
export default function SuccessOverlay({ visible, title, message, buttonText = 'Отлично', onClose }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, progress]);

  if (!visible) return null;

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: progress, transform: [{ scale }] }]}>
          <View style={styles.iconCircle}>
            <CheckGlyph size={48} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: { alignItems: 'center', width: '100%' },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title: { color: colors.text, fontSize: 23, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  message: {
    color: '#AAAAAA', fontSize: 15, textAlign: 'center', lineHeight: 22.5,
    maxWidth: 280, marginBottom: 32,
  },
  button: {
    width: '100%', maxWidth: 300, height: 54, borderRadius: 24,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { color: colors.accentText, fontSize: font.sizeMD, fontWeight: '800' },
});
