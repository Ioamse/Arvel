import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Свой переключатель вместо системного <Switch>: у нативного Android-виджета
// при нажатии рисуется системная рябь (ripple) вокруг ползунка — её нельзя
// убрать стилями, потому что это часть нативной отрисовки виджета, а не
// React Native слоя. Здесь вместо этого — плавная анимация цвета трека и
// сдвига ползунка, без какой-либо ripple-подсветки.
const WIDTH = 50;
const HEIGHT = 30;
const PADDING = 2;
const THUMB = HEIGHT - PADDING * 2;

export default function Toggle({ value, onValueChange, disabled = false }) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: false, // цвет трека нельзя анимировать нативным драйвером
    }).start();
  }, [value, progress]);

  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceAlt, colors.accent],
  });

  const thumbX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, WIDTH - THUMB - PADDING * 2],
  });

  return (
    <Pressable
      onPress={() => onValueChange?.(!value)}
      disabled={disabled}
      hitSlop={8}
      style={disabled && styles.disabled}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    padding: PADDING,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
  },
  disabled: { opacity: 0.5 },
});
