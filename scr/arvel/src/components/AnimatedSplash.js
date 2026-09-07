import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, font } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Длины путей — считаны геометрически из Logo.js (те же координаты),
// с небольшим запасом, чтобы обводка не «доскакивала» рывком в конце.
const LEFT_LEG_LEN = 82;
const RIGHT_LEG_LEN = 83;
const CHECK_LEN = 56;

const LOGO_SIZE = 108;

// Заставка холодного старта: буква «А» дорисовывается штрихами (левая
// ножка → правая ножка → перекладина-галочка), затем плавно проявляются
// название и слоган. Без bounce и лишних эффектов — тот стиль зарезервирован
// для отдельного экрана «успешного входа».
export default function AnimatedSplash({ onFinish }) {
  const leftLeg = useRef(new Animated.Value(0)).current;
  const rightLeg = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stroke = (value, delay, duration) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // strokeDashoffset не поддерживается native driver
      });
    const fadeUp = (value, delay, duration) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });

    const anim = Animated.parallel([
      stroke(leftLeg, 100, 500),
      stroke(rightLeg, 300, 500),
      stroke(check, 750, 450),
      fadeUp(title, 1200, 500),
      fadeUp(tagline, 1400, 500),
    ]);

    anim.start(() => onFinish?.());

    return () => anim.stop();
  }, []);

  const dashoffset = (value, length) =>
    value.interpolate({ inputRange: [0, 1], outputRange: [length, 0] });

  const fadeStyle = (value) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
      },
    ],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.center}>
        <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 100 100" fill="none">
          <AnimatedPath
            d="M23 88 L49 12"
            stroke={colors.accent}
            strokeWidth={7.5}
            strokeLinecap="round"
            strokeDasharray={[LEFT_LEG_LEN, LEFT_LEG_LEN]}
            strokeDashoffset={dashoffset(leftLeg, LEFT_LEG_LEN)}
          />
          <AnimatedPath
            d="M49 12 L77 88"
            stroke={colors.accent}
            strokeWidth={7.5}
            strokeLinecap="round"
            strokeDasharray={[RIGHT_LEG_LEN, RIGHT_LEG_LEN]}
            strokeDashoffset={dashoffset(rightLeg, RIGHT_LEG_LEN)}
          />
          <AnimatedPath
            d="M36 64 L45 78 L65 47"
            stroke={colors.accent}
            strokeWidth={7.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[CHECK_LEN, CHECK_LEN]}
            strokeDashoffset={dashoffset(check, CHECK_LEN)}
          />
        </Svg>

        <Animated.Text style={[styles.title, fadeStyle(title)]}>ARVELL</Animated.Text>
      </View>

      <Animated.Text style={[styles.tagline, fadeStyle(tagline)]}>
        одежда с гарантией подлинности
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center' },
  title: {
    marginTop: 40,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  tagline: {
    position: 'absolute',
    bottom: 40,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
