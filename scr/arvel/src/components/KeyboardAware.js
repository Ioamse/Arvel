import React, { useEffect, useRef } from 'react';
import {
  Platform, TouchableWithoutFeedback, Keyboard,
  Animated, Dimensions, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Обёртка, которая поднимает контент над клавиатурой и прячет
// клавиатуру по тапу вне поля.
//
// edgeToEdgeEnabled в app.json отключает системный adjustResize, поэтому
// ни iOS, ни Android не сжимают окно под клавиатуру сами — обе платформы
// подняты здесь одним и тем же ручным Animated-паддингом:
//
// iOS: слушаем keyboardWillShow/keyboardWillHide — они стреляют ДО начала
// системной анимации клавиатуры и несут её реальные duration/easing,
// поэтому наш Animated.timing можно запустить синхронно с клавиатурой и с
// той же длительностью/кривой — движение получается слитным, как в
// мессенджерах.
//
// Android: аналога keyboardWill* нет — keyboardDidShow стреляет уже ПОСЛЕ
// того, как клавиатура полностью появилась, поэтому используем короткую
// быструю "довозку" (см. ниже), а не пытаемся синхронизировать с
// несуществующим временем анимации.
//
// iOS: подъём считаем по ВЕРХНЕЙ КРОМКЕ клавиатуры (endCoordinates.screenY),
// а не по её высоте — на многих прошивках высота приходит с запасом.
//   подъём = высота окна − screenY − insets.bottom
// insets.bottom вычитаем потому, что этот отступ уже добавляют сами
// экраны (SafeAreaView edges=['bottom'] у панели ввода / паддинг футера),
// и без вычитания он считался бы дважды.
//
// Android: screenY здесь непригоден. В ReactRootView.java (RN, метод
// checkForKeyboardEvents, API 30+) screenY = mVisibleViewArea.bottom, а
// при edgeToEdgeEnabled окно физически не ресайзится — mVisibleViewArea
// остаётся на всю высоту экрана независимо от клавиатуры, из-за чего
// "высота окна − screenY" всегда давала ~0 и футер не поднимался вовсе.
// endCoordinates.height в той же нативной ветке, наоборот, считается
// честно через WindowInsets.Type.ime() и уже исключает нижний системный
// бар — его и берём напрямую, без вычитания insets.bottom.
export default function KeyboardAware({ children, style, dismissOnTap = true }) {
  const padding = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const insetsBottom = useRef(insets.bottom);
  insetsBottom.current = insets.bottom;

  useEffect(() => {
    // edgeToEdgeEnabled (app.json) отключает системный adjustResize и на
    // Android — окно больше не сжимается само, футер остаётся под
    // клавиатурой. Поэтому поднимаем контент вручную на обеих платформах;
    // отличаются только события и длительность анимации.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const lift = (e) => {
      let to;
      if (Platform.OS === 'ios') {
        const screenH = Dimensions.get('window').height;
        const kbTop = e?.endCoordinates?.screenY ?? screenH;
        to = Math.max(0, screenH - kbTop - insetsBottom.current);
      } else {
        to = Math.max(0, e?.endCoordinates?.height ?? 0);
      }
      Animated.timing(padding, {
        toValue: to,
        // iOS: keyboardWillShow стреляет ДО анимации клавиатуры и несёт её
        // реальные duration — подъём синхронен с клавиатурой. Android:
        // keyboardDidShow стреляет уже ПОСЛЕ появления клавиатуры (своей
        // duration не несёт), поэтому это только короткая быстрая "довозка"
        // футера на уже видимое место.
        duration: Platform.OS === 'ios' ? (e?.duration ?? 250) : 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false, // padding нельзя анимировать нативным драйвером
      }).start();
    };

    const drop = (e) => {
      Animated.timing(padding, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration ?? 250) : 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    };

    const show = Keyboard.addListener(showEvent, lift);
    const hide = Keyboard.addListener(hideEvent, drop);

    return () => {
      show.remove();
      hide.remove();
    };
  }, [padding]);

  const content = (
    <Animated.View style={[{ flex: 1, paddingBottom: padding }, style]}>
      {children}
    </Animated.View>
  );

  if (!dismissOnTap) return content;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {content}
    </TouchableWithoutFeedback>
  );
}