// Контексты данных: избранное, лента, объявления продавца, конфиг платформы.
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
jest.mock('../../src/api/favorites', () => ({ listFavorites: jest.fn(), addFavorite: jest.fn(), removeFavorite: jest.fn() }));
jest.mock('../../src/api/products', () => ({ listProducts: jest.fn(), setProductStatus: jest.fn() }));
jest.mock('../../src/api/shops', () => ({ getMyShop: jest.fn() }));
jest.mock('../../src/api/config', () => ({ getAppConfig: jest.fn() }));

const { setAuth, resetContexts } = require('../helpers/mockContexts');
const favApi = require('../../src/api/favorites');
const { listProducts, setProductStatus } = require('../../src/api/products');
const { getMyShop } = require('../../src/api/shops');
const { getAppConfig } = require('../../src/api/config');

import { FavoritesProvider, useFavorites } from '../../src/context/FavoritesContext';
import { ProductsProvider, useProducts } from '../../src/context/ProductsContext';
import { MyListingsProvider, useMyListings } from '../../src/context/MyListingsContext';
import { AppConfigProvider, useAppConfig, useMoney, labelFor } from '../../src/context/AppConfigContext';

const item = (id) => ({ id: `f-${id}`, product: { id, title: `Товар ${id}` } });

beforeEach(async () => {
  resetContexts();
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  favApi.listFavorites.mockReset().mockResolvedValue({ data: [] });
  favApi.addFavorite.mockReset().mockResolvedValue(null);
  favApi.removeFavorite.mockReset().mockResolvedValue(null);
  listProducts.mockReset().mockResolvedValue({ data: [], page: { has_more: false } });
  setProductStatus.mockReset();
  getMyShop.mockReset().mockResolvedValue({ id: 'shop-1' });
  getAppConfig.mockReset();
});

describe('FavoritesContext', () => {
  const renderFav = () => renderHook(() => useFavorites(), {
    wrapper: ({ children }) => <FavoritesProvider>{children}</FavoritesProvider>,
  });
  const savedLocal = async () => JSON.parse(await AsyncStorage.getItem('arvell.favorites'));

  it('гость — пустое избранное, сервер не опрашивается', async () => {
    setAuth({ isLoggedIn: false, user: null });
    const { result } = renderFav();
    await act(async () => {});
    expect(result.current.count).toBe(0);
    expect(favApi.listFavorites).not.toHaveBeenCalled();
  });

  it('объединяет локальное избранное с серверным без дублей', async () => {
    await AsyncStorage.setItem('arvell.favorites', JSON.stringify([item('p1'), item('p2')]));
    favApi.listFavorites.mockResolvedValue({ data: [item('p2'), item('p3')] });
    const { result } = renderFav();
    await waitFor(() => expect(result.current.count).toBe(3));
    expect(result.current.isFavorite('p1')).toBe(true);
    expect(result.current.isFavorite('p3')).toBe(true);
    expect((await savedLocal()).map((i) => i.product.id).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('сервер не отвечает — показываем локальное', async () => {
    await AsyncStorage.setItem('arvell.favorites', JSON.stringify([item('p1')]));
    favApi.listFavorites.mockRejectedValue(new Error('not implemented'));
    const { result } = renderFav();
    await waitFor(() => expect(result.current.count).toBe(1));
    expect(result.current.items[0].product.id).toBe('p1');
  });

  it('toggleFavorite: добавляет и убирает сразу, пишет на сервер', async () => {
    const { result } = renderFav();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.toggleFavorite('p9', { id: 'p9', title: 'Кепка' }); });
    expect(result.current.isFavorite('p9')).toBe(true);
    expect(result.current.items).toEqual([{ id: 'local-p9', product: { id: 'p9', title: 'Кепка' } }]);
    expect(favApi.addFavorite).toHaveBeenCalledWith('p9');

    await act(async () => { await result.current.toggleFavorite('p9'); });
    expect(result.current.isFavorite('p9')).toBe(false);
    expect(result.current.count).toBe(0);
    expect(favApi.removeFavorite).toHaveBeenCalledWith('p9');
  });

  it('toggleFavorite: ошибка сервера не откатывает локальное состояние', async () => {
    favApi.addFavorite.mockRejectedValue(new Error('not implemented'));
    const { result } = renderFav();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.toggleFavorite('p1', { id: 'p1' }); });
    expect(result.current.isFavorite('p1')).toBe(true);
    expect((await savedLocal())[0].product.id).toBe('p1');
  });

  it('выход из аккаунта стирает локальное избранное', async () => {
    await AsyncStorage.setItem('arvell.favorites', JSON.stringify([item('p1')]));
    const hook = renderFav();
    await waitFor(() => expect(hook.result.current.count).toBe(1));
    act(() => { setAuth({ isLoggedIn: false, user: null }); });
    await waitFor(() => expect(hook.result.current.count).toBe(0));
    expect(await AsyncStorage.getItem('arvell.favorites')).toBeNull();
  });

  it('холодный старт гостем НЕ стирает сохранённое избранное', async () => {
    await AsyncStorage.setItem('arvell.favorites', JSON.stringify([item('p1')]));
    setAuth({ isLoggedIn: false, user: null });
    renderFav();
    await act(async () => {});
    expect(await AsyncStorage.getItem('arvell.favorites')).not.toBeNull();
  });
});

describe('ProductsContext', () => {
  const renderProducts = () => renderHook(() => useProducts(), {
    wrapper: ({ children }) => <ProductsProvider>{children}</ProductsProvider>,
  });

  it('загружает первую страницу и кэширует её', async () => {
    listProducts.mockResolvedValue({ data: [{ id: 'p1' }], page: { next_cursor: 'c2', has_more: true } });
    const { result } = renderProducts();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.products).toEqual([{ id: 'p1' }]);
    expect(result.current.hasMore).toBe(true);
    await waitFor(async () => expect(JSON.parse(await AsyncStorage.getItem('arvell.products_cache'))).toEqual([{ id: 'p1' }]));
  });

  it('пока сеть думает, показывает кэш', async () => {
    await AsyncStorage.setItem('arvell.products_cache', JSON.stringify([{ id: 'cached' }]));
    listProducts.mockImplementation(() => new Promise(() => {}));
    const { result } = renderProducts();
    await waitFor(() => expect(result.current.products).toEqual([{ id: 'cached' }]));
    expect(result.current.loading).toBe(false);
  });

  it('loadMore дописывает следующую страницу по курсору', async () => {
    listProducts
      .mockResolvedValueOnce({ data: [{ id: 'p1' }], page: { next_cursor: 'c2', has_more: true } })
      .mockResolvedValueOnce({ data: [{ id: 'p2' }], page: { has_more: false } });
    const { result } = renderProducts();
    await waitFor(() => expect(result.current.hasMore).toBe(true));
    await act(async () => { await result.current.loadMore(); });
    expect(listProducts).toHaveBeenLastCalledWith({ cursor: 'c2' });
    expect(result.current.products.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(result.current.hasMore).toBe(false);
    // Больше страниц нет — новых запросов не будет.
    await act(async () => { await result.current.loadMore(); });
    expect(listProducts).toHaveBeenCalledTimes(2);
  });

  it('ошибка загрузки попадает в error, refresh её сбрасывает', async () => {
    listProducts.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderProducts();
    await waitFor(() => expect(result.current.error?.message).toBe('offline'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.error).toBeNull();
  });
});

describe('MyListingsContext', () => {
  const seller = { id: 's1', role: 'seller' };
  const renderListings = () => renderHook(() => useMyListings(), {
    wrapper: ({ children }) => <ProductsProvider><MyListingsProvider>{children}</MyListingsProvider></ProductsProvider>,
  });

  it('не продавец — пусто, без запросов', async () => {
    const { result } = renderListings();
    await act(async () => {});
    expect(result.current.items).toEqual([]);
    expect(getMyShop).not.toHaveBeenCalled();
  });

  it('продавец: активные + проданные своего магазина, новые сверху', async () => {
    setAuth({ user: seller });
    listProducts.mockImplementation(async ({ status }) => ({
      data: status === 'active'
        ? [{ id: 'a1', created_at: '2026-09-01' }, { id: 'a2', created_at: '2026-09-20' }]
        : [{ id: 's1', created_at: '2026-09-10' }],
      page: { has_more: false },
    }));
    const { result } = renderListings();
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items.map((i) => i.id)).toEqual(['a2', 's1', 'a1']);
    expect(listProducts).toHaveBeenCalledWith(expect.objectContaining({ shopId: 'shop-1', status: 'active' }));
    expect(listProducts).toHaveBeenCalledWith(expect.objectContaining({ shopId: 'shop-1', status: 'out_of_stock' }));
  });

  it('читает все страницы магазина', async () => {
    setAuth({ user: seller });
    listProducts.mockImplementation(async ({ status, cursor }) => {
      if (status !== 'active') return { data: [], page: {} };
      return cursor
        ? { data: [{ id: 'a2', created_at: '1' }], page: { has_more: false } }
        : { data: [{ id: 'a1', created_at: '2' }], page: { has_more: true, next_cursor: 'n2' } };
    });
    const { result } = renderListings();
    await waitFor(() => expect(result.current.items).toHaveLength(2));
  });

  it('markSold меняет статус и обновляет ленту', async () => {
    setAuth({ user: seller });
    listProducts.mockImplementation(async ({ status }) => ({ data: status === 'active' ? [{ id: 'a1', status: 'active' }] : [], page: {} }));
    setProductStatus.mockResolvedValue({ status: 'out_of_stock' });
    const { result } = renderListings();
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    listProducts.mockClear();
    await act(async () => { await result.current.markSold('a1'); });
    expect(setProductStatus).toHaveBeenCalledWith('a1', 'out_of_stock');
    expect(result.current.items[0].status).toBe('out_of_stock');
    // Лента покупателей перезапрошена (ProductsContext.refresh -> listProducts({})).
    expect(listProducts).toHaveBeenCalledWith({});
  });

  it('archive убирает объявление из списка', async () => {
    setAuth({ user: seller });
    listProducts.mockImplementation(async ({ status }) => ({ data: status === 'active' ? [{ id: 'a1' }, { id: 'a2' }] : [], page: {} }));
    setProductStatus.mockResolvedValue({});
    const { result } = renderListings();
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    await act(async () => { await result.current.archive('a1'); });
    expect(setProductStatus).toHaveBeenCalledWith('a1', 'archived');
    expect(result.current.items.map((i) => i.id)).toEqual(['a2']);
  });

  it('ошибка загрузки попадает в error', async () => {
    setAuth({ user: seller });
    getMyShop.mockRejectedValue(new Error('no shop'));
    const { result } = renderListings();
    await waitFor(() => expect(result.current.error?.message).toBe('no shop'));
    expect(result.current.loading).toBe(false);
  });
});

describe('AppConfigContext', () => {
  const wrapper = ({ children }) => <AppConfigProvider>{children}</AppConfigProvider>;

  it('переводит GET /config в camelCase', async () => {
    getAppConfig.mockResolvedValue({
      currency: 'EUR',
      size_systems: [{ system: 'eu' }],
      colors: [{ value: 'black', label: 'Чёрный' }],
      conditions: [{ value: 'new', label: 'Новое' }],
      max_images_per_product: 8,
      max_image_bytes: 1000,
      max_image_width: 800,
      max_image_height: 600,
      allowed_image_content_types: ['image/jpeg'],
    });
    const { result } = renderHook(() => useAppConfig(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({
      currency: 'EUR', maxImages: 8, maxImageBytes: 1000, maxImageWidth: 800, maxImageHeight: 600,
      allowedImageTypes: ['image/jpeg'], colors: [{ value: 'black', label: 'Чёрный' }],
    });
  });

  it('ошибка загрузки и повтор через reload()', async () => {
    getAppConfig.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ currency: 'RUB' });
    const { result } = renderHook(() => useAppConfig(), { wrapper });
    await waitFor(() => expect(result.current.error?.message).toBe('offline'));
    expect(result.current.maxImages).toBe(10); // значение по умолчанию
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.currency).toBe('RUB'));
    expect(result.current.error).toBeNull();
  });

  it('useMoney форматирует в валюте платформы', async () => {
    getAppConfig.mockResolvedValue({ currency: 'EUR' });
    const { result } = renderHook(() => useMoney(), { wrapper });
    await waitFor(() => expect(result.current.symbol).toBe('€'));
    expect(result.current.formatMinor(1250).replace(/\s/g, ' ')).toBe('12,50 €');
    expect(result.current.formatMajor(1200).replace(/\s/g, ' ')).toBe('1 200 €');
  });

  it('labelFor: подпись по значению, иначе само значение', () => {
    const opts = [{ value: 'new', label: 'Новое' }];
    expect(labelFor(opts, 'new')).toBe('Новое');
    expect(labelFor(opts, 'used')).toBe('used');
  });
});
