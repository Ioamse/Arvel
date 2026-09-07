import React, { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { ProductsProvider } from './src/context/ProductsContext';
import { AppConfigProvider } from './src/context/AppConfigContext';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

// По умолчанию NavigationContainer использует светлую тему React Navigation
// (белый background/card) — во время интерактивного жеста "смахнуть назад"
// на iOS этот цвет на мгновение проглядывает по краю экрана белой полосой.
// Задаём тёмную тему приложения, чтобы фон совпадал с contentStyle экранов.
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    border: colors.border,
    primary: colors.accent,
    text: colors.text,
  },
};

export default function App() {
  useEffect(() => {
    // Фон окна приложения: в режиме edge-to-edge системные панели
    // прозрачные и показывают именно его. По умолчанию он белый —
    // отсюда белая полоса внизу.
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync('light').catch(() => {});
      NavigationBar.setBackgroundColorAsync(colors.bg).catch(() => {});
    }
  }, []);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppConfigProvider>
          <AuthProvider>
            <ProductsProvider>
              <FavoritesProvider>
                <NavigationContainer theme={navTheme}>
                  <StatusBar style="light" backgroundColor={colors.bg} />
                  <RootNavigator />
                </NavigationContainer>
              </FavoritesProvider>
            </ProductsProvider>
          </AuthProvider>
        </AppConfigProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  // На вебе интерфейс спроектирован под мобильный экран — растянутый на
  // весь десктопный вьюпорт, он выглядит сломанным (огромные карточки,
  // текст на всю ширину). Показываем его в рамке телефона по центру
  // страницы, как в макетах.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuter}>
        <View style={styles.webPhone}>{content}</View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  webPhone: {
    width: '100%',
    maxWidth: 428,
    height: '100%',
    maxHeight: 926,
    backgroundColor: colors.bg,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
});