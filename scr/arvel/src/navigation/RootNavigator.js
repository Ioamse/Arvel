import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainTabs from './MainTabs';
import ConversationScreen from '../screens/ConversationScreen';
import AnimatedSplash from '../components/AnimatedSplash';

const Stack = createNativeStackNavigator();

// Модалка авторизации: открывается поверх MainTabs, когда гость пытается
// купить товар, зайти в чат или в профиль. Как только вход завершён
// (isLoggedIn стал true), сама закрывается — пользователь возвращается туда,
// откуда её открыл.
function AuthModal({ navigation }) {
  const { isLoggedIn } = useAuth();
  useEffect(() => {
    if (isLoggedIn) navigation.goBack();
  }, [isLoggedIn, navigation]);
  return <AuthNavigator />;
}

export default function RootNavigator() {
  const { bootstrapping } = useAuth();
  const [splashPlayed, setSplashPlayed] = useState(false);

  // Заставка холодного старта держится, пока идёт проверка сохранённой
  // сессии (GET /me по токену из хранилища), и не короче своей анимации —
  // так «А» всегда дорисовывается целиком, даже если сессия отозвалась мгновенно.
  if (bootstrapping || !splashPlayed) {
    return <AnimatedSplash onFinish={() => setSplashPlayed(true)} />;
  }

  // Каталог, лента и избранное доступны без входа. Авторизация запрашивается
  // точечно — при попытке купить товар, написать продавцу или открыть
  // «Чат»/«Профиль» (см. MainTabs и ProductScreen).
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      {/* Вынесен из вкладочных стеков в корневой навигатор: экран диалога
          занимает весь экран, а таббар просто не рендерится под ним —
          без ручного скрытия tabBarStyle, которое давало рассинхрон с
          переходом (поле ввода "прыгало" при открытии, таббар мигал при
          закрытии). */}
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen
        name="Auth"
        component={AuthModal}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
