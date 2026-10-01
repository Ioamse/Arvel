/* global jest */
// Подменяемые контексты для тестов экранов. В тестовом файле:
//
//   jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
//
// а перед рендером — setAuth({...}) / setFavorites({...}) и т.д.
const React = require('react');

const state = {
  auth: {},
  favorites: {},
  products: {},
  myListings: {},
  config: {},
};

function defaultAuth() {
  return {
    isLoggedIn: true,
    bootstrapping: false,
    user: { id: 'u1', name: 'Иван', display_name: 'Иван', phone: '+79990001122', role: 'user', is_admin: false },
    pendingPhone: '+79990001122',
    pendingUser: null,
    registerPhone: jest.fn(async () => {}),
    verifyCode: jest.fn(async () => ({ needsOnboarding: false })),
    completeOnboarding: jest.fn(async () => ({})),
    sellerAcceptInvite: jest.fn(async () => {}),
    sellerComplete: jest.fn(async () => ({})),
    updateProfile: jest.fn(async () => ({})),
    signOut: jest.fn(async () => {}),
  };
}

function defaultFavorites() {
  const ids = [];
  return {
    items: [],
    favorites: ids,
    isFavorite: jest.fn((id) => ids.includes(id)),
    toggleFavorite: jest.fn(async () => {}),
    count: 0,
    loading: false,
  };
}

function defaultProducts() {
  return {
    products: [],
    loading: false,
    error: null,
    hasMore: false,
    refresh: jest.fn(async () => {}),
    loadMore: jest.fn(async () => {}),
  };
}

function defaultMyListings() {
  return {
    items: [],
    loading: false,
    error: null,
    refresh: jest.fn(async () => {}),
    reloadAfterChange: jest.fn(),
    markSold: jest.fn(async () => {}),
    archive: jest.fn(async () => {}),
  };
}

function defaultConfig() {
  return {
    currency: 'EUR',
    sizeSystems: [],
    colors: [],
    conditions: [],
    maxImages: 10,
    maxImageBytes: null,
    maxImageWidth: null,
    maxImageHeight: null,
    allowedImageTypes: [],
    loading: false,
    error: null,
    reload: jest.fn(),
  };
}

function resetContexts() {
  state.auth = defaultAuth();
  state.favorites = defaultFavorites();
  state.products = defaultProducts();
  state.myListings = defaultMyListings();
  state.config = defaultConfig();
}
resetContexts();

// Подписчики — как у настоящего контекста: смена значения через set*()
// перерисовывает смонтированные компоненты, которые его читают.
const listeners = new Set();
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
const notify = () => listeners.forEach((cb) => cb());
const useSlice = (key) => React.useSyncExternalStore(subscribe, () => state[key]);

const make = (key, defaults) => (o = {}) => { state[key] = { ...defaults(), ...o }; notify(); return state[key]; };
const setAuth = make('auth', defaultAuth);
const setFavorites = make('favorites', defaultFavorites);
const setProducts = make('products', defaultProducts);
const setMyListings = make('myListings', defaultMyListings);
const setConfig = make('config', defaultConfig);

const Passthrough = ({ children }) => React.createElement(React.Fragment, null, children);

const authModule = {
  __esModule: true,
  useAuth: () => useSlice('auth'),
  AuthProvider: Passthrough,
  isPlaceholderName: (...a) => jest.requireActual('../../src/context/AuthContext').isPlaceholderName(...a),
};

const favoritesModule = {
  __esModule: true,
  useFavorites: () => useSlice('favorites'),
  FavoritesProvider: Passthrough,
};

const productsModule = {
  __esModule: true,
  useProducts: () => useSlice('products'),
  ProductsProvider: Passthrough,
};

const myListingsModule = {
  __esModule: true,
  useMyListings: () => useSlice('myListings'),
  MyListingsProvider: Passthrough,
};

// useMoney/labelFor считаем настоящими функциями форматирования поверх
// подменённого конфига — так в тестах видны реальные строки цен.
const price = jest.requireActual('../../src/utils/price');
const configModule = {
  __esModule: true,
  useAppConfig: () => useSlice('config'),
  AppConfigProvider: Passthrough,
  useMoney: () => {
    const { currency } = useSlice('config');
    return {
      symbol: price.currencySymbol(currency),
      formatMinor: (m) => price.withCurrency(price.formatPrice(m), currency),
      formatMajor: (a) => price.withCurrency(price.formatAmount(a), currency),
    };
  },
  labelFor: (options, value) => options.find((o) => o.value === value)?.label ?? value,
};

module.exports = {
  state,
  resetContexts,
  setAuth, setFavorites, setProducts, setMyListings, setConfig,
  authModule, favoritesModule, productsModule, myListingsModule, configModule,
};
