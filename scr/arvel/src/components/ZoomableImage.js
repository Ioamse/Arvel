import React, { useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

const clampScale = (v) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

// Пинч-зум на голом PanResponder ненадёжен под New Architecture (newArchEnabled
// в app.json) — RN там не всегда отдаёт стабильный touches[] для двух пальцев
// одновременно. react-native-gesture-handler использует нативные жест-распознаватели
// и с этим не имеет проблем; reanimated не подключаем — обходимся Animated.event
// из react-native, как в официальном примере пинч-зума из документации RNGH.
export default function ZoomableImage({ uri, style, onSingleTap }) {
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = useRef(Animated.multiply(baseScale, pinchScale)).current;
  const scaleValue = useRef(1);

  const baseTranslateX = useRef(new Animated.Value(0)).current;
  const baseTranslateY = useRef(new Animated.Value(0)).current;
  const panTranslateX = useRef(new Animated.Value(0)).current;
  const panTranslateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(Animated.add(baseTranslateX, panTranslateX)).current;
  const translateY = useRef(Animated.add(baseTranslateY, panTranslateY)).current;
  const translateValue = useRef({ x: 0, y: 0 });

  const [zoomed, setZoomed] = useState(false);

  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const doubleTapRef = useRef(null);

  const reset = () => {
    scaleValue.current = 1;
    translateValue.current = { x: 0, y: 0 };
    setZoomed(false);
    Animated.parallel([
      Animated.spring(baseScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(baseTranslateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(baseTranslateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const zoomTo = (next) => {
    scaleValue.current = next;
    setZoomed(next > 1.01);
    Animated.spring(baseScale, { toValue: next, useNativeDriver: true }).start();
  };

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true },
  );

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const next = clampScale(scaleValue.current * event.nativeEvent.scale);
      pinchScale.setValue(1);
      if (next <= MIN_SCALE) reset();
      else zoomTo(next);
    }
  };

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: panTranslateX, translationY: panTranslateY } }],
    { useNativeDriver: true },
  );

  const onPanStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      translateValue.current = {
        x: translateValue.current.x + event.nativeEvent.translationX,
        y: translateValue.current.y + event.nativeEvent.translationY,
      };
      baseTranslateX.setValue(translateValue.current.x);
      baseTranslateY.setValue(translateValue.current.y);
      panTranslateX.setValue(0);
      panTranslateY.setValue(0);
    }
  };

  const onDoubleTapStateChange = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      if (scaleValue.current > 1.01) reset();
      else zoomTo(DOUBLE_TAP_SCALE);
    }
  };

  const onSingleTapStateChange = (event) => {
    if (event.nativeEvent.state === State.ACTIVE && scaleValue.current <= 1.01) {
      onSingleTap?.();
    }
  };

  return (
    <TapGestureHandler onHandlerStateChange={onSingleTapStateChange} waitFor={doubleTapRef}>
      <TapGestureHandler ref={doubleTapRef} numberOfTaps={2} onHandlerStateChange={onDoubleTapStateChange}>
        <PanGestureHandler
          ref={panRef}
          simultaneousHandlers={pinchRef}
          onGestureEvent={onPanEvent}
          onHandlerStateChange={onPanStateChange}
          minPointers={1}
          maxPointers={1}
          enabled={zoomed}
        >
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={panRef}
            onGestureEvent={onPinchEvent}
            onHandlerStateChange={onPinchStateChange}
          >
            <Animated.View style={styles.flex}>
              <Animated.Image
                source={{ uri }}
                resizeMode="contain"
                style={[style, { transform: [{ translateX }, { translateY }, { scale }] }]}
              />
            </Animated.View>
          </PinchGestureHandler>
        </PanGestureHandler>
      </TapGestureHandler>
    </TapGestureHandler>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
