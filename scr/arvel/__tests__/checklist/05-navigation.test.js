// Чек-лист: ОБЩАЯ НАВИГАЦИЯ (ПОКУПАТЕЛЬ / ПРОДАВЕЦ) — нижние вкладки.
// Настоящие навигаторы React Navigation, экраны — заглушки.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
// Число непрочитанных для бейджа вкладки «Чат» задаётся тестом через mockUnread.
let mockUnread = 0;
jest.mock('../../src/context/ChatUnreadContext', () => ({
  useChatUnread: () => ({ unread: mockUnread, refresh: jest.fn() }),
  ChatUnreadProvider: ({ children }) => children,
}));

jest.mock('../../src/screens/FeedScreen', () => require('../helpers/stubScreen')('FeedScreen'));
jest.mock('../../src/screens/CatalogScreen', () => require('../helpers/stubScreen')('CatalogScreen'));
jest.mock('../../src/screens/FavoritesScreen', () => require('../helpers/stubScreen')('FavoritesScreen'));
jest.mock('../../src/screens/ChatScreen', () => require('../helpers/stubScreen')('ChatScreen'));
jest.mock('../../src/screens/AccountScreen', () => require('../helpers/stubScreen')('AccountScreen'));
jest.mock('../../src/screens/ProductScreen', () => require('../helpers/stubScreen')('ProductScreen'));
jest.mock('../../src/screens/ShopScreen', () => require('../helpers/stubScreen')('ShopScreen'));
jest.mock('../../src/screens/EditProfileScreen', () => require('../helpers/stubScreen')('EditProfileScreen'));
jest.mock('../../src/screens/NotificationsScreen', () => require('../helpers/stubScreen')('NotificationsScreen'));
jest.mock('../../src/screens/HelpScreen', () => require('../helpers/stubScreen')('HelpScreen'));
jest.mock('../../src/screens/RulesScreen', () => require('../helpers/stubScreen')('RulesScreen'));
jest.mock('../../src/screens/AddProductScreen', () => require('../helpers/stubScreen')('AddProductScreen'));
jest.mock('../../src/screens/SearchScreen', () => require('../helpers/stubScreen')('SearchScreen'));
jest.mock('../../src/screens/OrdersScreen', () => require('../helpers/stubScreen')('OrdersScreen'));
jest.mock('../../src/screens/MyListingsScreen', () => require('../helpers/stubScreen')('MyListingsScreen'));
jest.mock('../../src/screens/AdminPanelScreen', () => require('../helpers/stubScreen')('AdminPanelScreen'));

const { setAuth, resetContexts } = require('../helpers/mockContexts');
const AuthStub = require('../helpers/stubScreen')('AuthModal').default;

import MainTabs from '../../src/navigation/MainTabs';

const Stack = createNativeStackNavigator();

// Корень как в RootNavigator: вкладки + модалка входа «Auth».
function renderApp() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Auth" component={AuthStub} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const TABS = [
  ['Главная', 'FeedScreen'],
  ['Каталог', 'CatalogScreen'],
  ['Избранное', 'FavoritesScreen'],
  ['Чат', 'ChatScreen'],
  ['Профиль', 'AccountScreen'],
];

const pressTab = (label) => fireEvent.press(screen.getByText(label));
const focused = (name) => screen.queryByText(`${name} [focused]`);

describe.each([
  ['ПОКУПАТЕЛЬ', { id: 'u1', name: 'Иван', role: 'user' }],
  ['ПРОДАВЕЦ', { id: 's1', name: 'Алекс', role: 'seller' }],
])('%s', (role, user) => describe(`ОБЩАЯ НАВИГАЦИЯ (${role})`, () => {
  beforeEach(() => {
    resetContexts();
    setAuth({ isLoggedIn: true, user });
  });

  it('По умолчанию открыта «Главная»', () => {
    renderApp();
    expect(focused('FeedScreen')).toBeTruthy();
  });

  it.each(TABS)('Таб «%s»', (label, screenName) => {
    renderApp();
    if (label !== 'Главная') pressTab('Каталог'); // уходим с «Главной», чтобы проверить и её
    pressTab(label);
    expect(focused(screenName)).toBeTruthy();
    TABS.filter(([, s]) => s !== screenName).forEach(([, s]) => expect(focused(s)).toBeNull());
  });

  it('Переключение между вкладками и обратно', () => {
    renderApp();
    for (const [label, screenName] of [...TABS, ...[...TABS].reverse()]) {
      pressTab(label);
      expect(focused(screenName)).toBeTruthy();
    }
  });
}));

describe('Бейдж непрочитанных на вкладке «Чат»', () => {
  beforeEach(() => {
    resetContexts();
    setAuth({ isLoggedIn: true, user: { id: 'u1', name: 'Иван', role: 'user' } });
  });
  afterEach(() => { mockUnread = 0; });

  it('показывает настоящее число непрочитанных', () => {
    mockUnread = 5;
    renderApp();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });

  it('при нуле бейдж не показывается (никакой захардкоженной «3»)', () => {
    mockUnread = 0;
    renderApp();
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('больше 99 — «99+»', () => {
    mockUnread = 150;
    renderApp();
    expect(screen.getAllByText('99+').length).toBeGreaterThan(0);
  });

  it('у гостя бейджа нет', () => {
    mockUnread = 4;
    setAuth({ isLoggedIn: false, user: null });
    renderApp();
    expect(screen.queryByText('4')).toBeNull();
  });
});

describe('ОБЩАЯ НАВИГАЦИЯ (ГОСТЬ)', () => {
  beforeEach(() => {
    resetContexts();
    setAuth({ isLoggedIn: false, user: null });
  });

  it.each([['Главная', 'FeedScreen'], ['Каталог', 'CatalogScreen']])(
    'Таб «%s» доступен без входа',
    (label, screenName) => {
      renderApp();
      pressTab('Каталог');
      pressTab(label);
      expect(focused(screenName)).toBeTruthy();
    }
  );

  it.each(['Избранное', 'Чат', 'Профиль'])('Таб «%s» без входа открывает окно входа', (label) => {
    renderApp();
    pressTab(label);
    expect(focused('AuthModal')).toBeTruthy();
    expect(screen.queryByText(/FavoritesScreen|ChatScreen|AccountScreen/)).toBeNull();
  });
});
