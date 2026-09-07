import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, font } from '../theme';

export default function PrimaryButton({ title, onPress, disabled = false }) {
  return (
    <Pressable
      style={[styles.btn, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
  },
  disabled: { backgroundColor: colors.accentDim },
  text: { color: colors.accentText, fontSize: font.sizeMD, fontWeight: '800' },
});
