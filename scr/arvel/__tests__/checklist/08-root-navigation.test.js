// Корневая навигация: заставка, модалка входа и её автозакрытие после входа.
import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';

jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
// Заставка — кнопка «Анимация закончилась» вместо настоящей анимации.
jest.mock('../../src/components/AnimatedSplash', () => {
  const { Pressable: P, Text: T } = require('react-native');
  return ({ onFinish }) => <P onPress={onFinish}><T>Splash</T></P>;
});
jest.mock('../../src/navigation/MainTabs', () => {
  const { Pressable: P, Text: T } = require('react-native');
  const { useNavigation } = require('@react-navigation/native');
  return function MainTabsStub() {
    const navigation = useNavigation();
    return <P onPress={() => navigation.navigate('Auth')}><T>MainTabs</T></P>;
  };
});
jest.mock('../../src/screens/WelcomeScreen', () => require('../helpers/stubScreen')('WelcomeScreen'));
jest.mock('../../src/screens/PhoneScreen', () => require('../helpers/stubScreen')('PhoneScreen'));
jest.mock('../../src/screens/VerifyScreen', () => require('../helpers/stubScreen')('VerifyScreen'));
jest.mock('../../src/screens/ProfileSetupScreen', () => require('../helpers/stubScreen')('ProfileSetupScreen'));
jest.mock('../../src/screens/LegalScreen', () => require('../helpers/stubScreen')('LegalScreen'));
jest.mock('../../src/screens/ConversationScreen', () => require('../helpers/stubScreen')('ConversationScreen'));

const { setAuth, resetContexts } = require('../helpers/mockContexts');
import RootNavigator from '../../src/navigation/RootNavigator';

const navRef = createNavigationContainerRef();
const tree = () => <NavigationContainer ref={navRef}><RootNavigator /></NavigationContainer>;
const renderRoot = () => render(tree());
const finishSplash = () => fireEvent.press(screen.getByText('Splash'));

beforeEach(() => resetContexts());

describe('Корневая навигация', () => {
  it('заставка держится, пока идёт проверка сессии', () => {
    setAuth({ bootstrapping: true, isLoggedIn: false });
    renderRoot();
    finishSplash();
    expect(screen.getByText('Splash')).toBeTruthy();
    act(() => { setAuth({ bootstrapping: false, isLoggedIn: false }); });
    expect(screen.getByText('MainTabs')).toBeTruthy();
  });

  it('заставка доигрывает анимацию, даже если сессия проверилась мгновенно', () => {
    setAuth({ bootstrapping: false });
    renderRoot();
    expect(screen.getByText('Splash')).toBeTruthy();
    finishSplash();
    expect(screen.getByText('MainTabs')).toBeTruthy();
  });

  it('гость открывает окно входа — оно начинается с Welcome', () => {
    setAuth({ bootstrapping: false, isLoggedIn: false, user: null });
    renderRoot();
    finishSplash();
    fireEvent.press(screen.getByText('MainTabs'));
    expect(screen.getByText('WelcomeScreen [focused]')).toBeTruthy();
  });

  it('Верный код, существующий -> вход в приложение: модалка входа закрывается сама', () => {
    setAuth({ bootstrapping: false, isLoggedIn: false, user: null });
    renderRoot();
    finishSplash();
    fireEvent.press(screen.getByText('MainTabs'));
    expect(screen.getByText('WelcomeScreen [focused]')).toBeTruthy();
    expect(navRef.getRootState().routes.map((r) => r.name)).toEqual(['Main', 'Auth']);

    act(() => { setAuth({ bootstrapping: false, isLoggedIn: true }); });
    // Нативная анимация закрытия в Jest не доигрывает, поэтому смотрим на
    // состояние навигатора, а не на то, что ещё смонтировано.
    expect(navRef.getCurrentRoute().name).toBe('Main');
    expect(navRef.getRootState().routes.map((r) => r.name)).toEqual(['Main']);
  });

  it('аккаунт без имени (pendingUser) сразу открывает ProfileSetup', () => {
    setAuth({ bootstrapping: false, isLoggedIn: false, user: null, pendingUser: { id: 'u1' } });
    renderRoot();
    finishSplash();
    expect(screen.getByText('ProfileSetupScreen [focused]')).toBeTruthy();
  });
});
