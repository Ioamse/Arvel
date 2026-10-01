// Чек-лист: ЛЕНТА / КАТАЛОГ / ПОИСК, КАРТОЧКА ТОВАРА / МАГАЗИН, ИЗБРАННОЕ.
// Разделы одинаковы у покупателя и продавца (один и тот же код экранов) —
// различия по роли проверяются отдельными тестами в конце файла.
import React from 'react';
import { Share, FlatList } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-navigation/native', () => require('../helpers/navMock').module);
jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
jest.mock('../../src/context/AppConfigContext', () => require('../helpers/mockContexts').configModule);
jest.mock('../../src/context/FavoritesContext', () => require('../helpers/mockContexts').favoritesModule);
jest.mock('../../src/context/ProductsContext', () => require('../helpers/mockContexts').productsModule);
jest.mock('../../src/api/products', () => ({
  listProducts: jest.fn(async () => ({ data: [], page: { has_more: false } })),
  getProduct: jest.fn(),
}));
jest.mock('../../src/api/catalog', () => ({
  listCategories: jest.fn(async () => ({ data: [] })),
  listBrands: jest.fn(async () => ({ data: [] })),
}));

const { createNavigation } = require('../helpers/navMock');
const { setAuth, setFavorites, setProducts, setConfig, resetContexts } = require('../helpers/mockContexts');
const { listProducts, getProduct } = require('../../src/api/products');
const { listCategories, listBrands } = require('../../src/api/catalog');
const { forEachRole } = require('../helpers/roles');

import FeedScreen from '../../src/screens/FeedScreen';
import CatalogScreen from '../../src/screens/CatalogScreen';
import SearchScreen from '../../src/screens/SearchScreen';
import ProductScreen from '../../src/screens/ProductScreen';
import ShopScreen from '../../src/screens/ShopScreen';
import FavoritesScreen from '../../src/screens/FavoritesScreen';

const nike = { id: 'p1', title: 'Air Max 90', brand: { id: 'b1', name: 'Nike' }, price_minor: 890000 };
const adidas = { id: 'p2', title: 'Samba', brand: { id: 'b2', name: 'Adidas' }, price_minor: 990050 };
const puma = { id: 'p3', title: 'Suede', brand: { id: 'b3', name: 'Puma' }, price_minor: 500000 };

let navigation;
beforeEach(async () => {
  resetContexts();
  navigation = createNavigation();
  await AsyncStorage.clear();
  listProducts.mockReset().mockResolvedValue({ data: [], page: { has_more: false } });
  getProduct.mockReset();
  listCategories.mockReset().mockResolvedValue({ data: [] });
  listBrands.mockReset().mockResolvedValue({ data: [] });
});

// Сердечко на карточке товара. Первая карточка — первое сердечко.
const hearts = () => screen.getAllByLabelText('В избранное');

forEachRole(({ t }) => {
  describe('ЛЕНТА / КАТАЛОГ / ПОИСК', () => {
    describe('Feed', () => {
      it('Feed: карточка товара -> Product', () => {
        setProducts({ products: [nike, adidas] });
        render(<FeedScreen navigation={navigation} />);
        expect(screen.getByText('Nike')).toBeTruthy();
        expect(screen.getByText('8 900 €')).toBeTruthy();
        fireEvent.press(screen.getByText('Samba'));
        expect(navigation.navigate).toHaveBeenCalledWith('Product', { id: 'p2' });
      });

      it(t('Feed: сердечко (добавить/убрать избранное)', 'Feed: сердечко (избранное)'), () => {
        const fav = setFavorites();
        setProducts({ products: [nike] });
        render(<FeedScreen navigation={navigation} />);
        fireEvent.press(hearts()[0]);
        expect(fav.toggleFavorite).toHaveBeenCalledWith('p1', nike);
        // Тап по сердечку не открывает карточку товара.
        expect(navigation.navigate).not.toHaveBeenCalledWith('Product', expect.anything());
      });

      it('Feed: сердечко у гостя -> окно входа', () => {
        setAuth({ isLoggedIn: false, user: null });
        const fav = setFavorites();
        setProducts({ products: [nike] });
        render(<FeedScreen navigation={navigation} />);
        fireEvent.press(hearts()[0]);
        expect(navigation.navigate).toHaveBeenCalledWith('Auth');
        expect(fav.toggleFavorite).not.toHaveBeenCalled();
      });

      it('Feed: pull-to-refresh', async () => {
        const products = setProducts({ products: [nike] });
        render(<FeedScreen navigation={navigation} />);
        const list = screen.UNSAFE_getByType(FlatList);
        await act(async () => { await list.props.onRefresh(); });
        expect(products.refresh).toHaveBeenCalledTimes(1);
      });

      it(t('Feed: подгрузка страницы при скролле', 'Feed: подгрузка страницы'), () => {
        const products = setProducts({ products: [nike, adidas], hasMore: true });
        render(<FeedScreen navigation={navigation} />);
        const list = screen.UNSAFE_getByType(FlatList);
        expect(list.props.onEndReached).toBe(products.loadMore);
        act(() => { list.props.onEndReached(); });
        expect(products.loadMore).toHaveBeenCalled();
      });

      it(t('Feed: кнопка «Повторить» при ошибке', 'Feed: кнопка «Повторить»'), () => {
        const products = setProducts({ products: [], error: new Error('Сервер не отвечает') });
        render(<FeedScreen navigation={navigation} />);
        expect(screen.getByText('Не удалось загрузить товары')).toBeTruthy();
        expect(screen.getByText('Сервер не отвечает')).toBeTruthy();
        fireEvent.press(screen.getByText('Повторить'));
        expect(products.refresh).toHaveBeenCalled();
      });

      it('Feed: пустая лента', () => {
        render(<FeedScreen navigation={navigation} />);
        expect(screen.getByText('Пока нет товаров')).toBeTruthy();
      });
    });

    describe('Catalog', () => {
      beforeEach(() => {
        listCategories.mockResolvedValue({
          data: [
            { id: 'c1', name: 'Обувь' },
            { id: 'c2', name: 'Одежда' },
            { id: 'c3', name: 'Кроссовки', parent_id: 'c1' },
          ],
        });
        listBrands.mockResolvedValue({ data: [nike.brand, adidas.brand, puma.brand] });
        listProducts.mockResolvedValue({ data: [nike, adidas, puma] });
      });

      it('Catalog: строка поиска -> Search', async () => {
        render(<CatalogScreen navigation={navigation} />);
        await screen.findByText('Air Max 90');
        fireEvent.press(screen.getByText('Поиск брендов...'));
        expect(navigation.navigate).toHaveBeenCalledWith('Search');
      });

      it(t('Catalog: чип категории (одиночный выбор)', 'Catalog: чип категории'), async () => {
        render(<CatalogScreen navigation={navigation} />);
        await screen.findByText('Air Max 90');
        // Подкатегории в чипах не показываются.
        expect(screen.queryByText('Кроссовки')).toBeNull();
        expect(listProducts).toHaveBeenLastCalledWith({ categoryId: null });

        fireEvent.press(screen.getByText('Обувь'));
        await waitFor(() => expect(listProducts).toHaveBeenLastCalledWith({ categoryId: 'c1' }));
        fireEvent.press(screen.getByText('Одежда'));
        await waitFor(() => expect(listProducts).toHaveBeenLastCalledWith({ categoryId: 'c2' }));
        // Повторный тап снимает выбор.
        fireEvent.press(screen.getByText('Одежда'));
        await waitFor(() => expect(listProducts).toHaveBeenLastCalledWith({ categoryId: null }));
      });

      it(t('Catalog: чип бренда (множественный выбор)', 'Catalog: чип бренда'), async () => {
        render(<CatalogScreen navigation={navigation} />);
        await screen.findByText('Air Max 90');
        const callsBefore = listProducts.mock.calls.length;

        // Первый «Nike» — чип в шапке, второй — бренд на карточке товара.
        fireEvent.press(screen.getAllByText('Nike')[0]);
        expect(screen.getByText('Air Max 90')).toBeTruthy();
        expect(screen.queryByText('Samba')).toBeNull();
        expect(screen.queryByText('Suede')).toBeNull();

        fireEvent.press(screen.getAllByText('Adidas')[0]);
        expect(screen.getByText('Air Max 90')).toBeTruthy();
        expect(screen.getByText('Samba')).toBeTruthy();
        expect(screen.queryByText('Suede')).toBeNull();

        fireEvent.press(screen.getAllByText('Nike')[0]);
        expect(screen.queryByText('Air Max 90')).toBeNull();
        expect(screen.getByText('Samba')).toBeTruthy();
        // Бренды фильтруются на клиенте, без новых запросов.
        expect(listProducts.mock.calls.length).toBe(callsBefore);
      });

      it('Catalog: карточка товара -> Product', async () => {
        render(<CatalogScreen navigation={navigation} />);
        fireEvent.press(await screen.findByText('Suede'));
        expect(navigation.navigate).toHaveBeenCalledWith('Product', { id: 'p3' });
      });

      it('Catalog: ошибка загрузки товаров', async () => {
        listProducts.mockRejectedValue(new Error('offline'));
        render(<CatalogScreen navigation={navigation} />);
        expect(await screen.findByText('Не удалось загрузить товары')).toBeTruthy();
      });
    });

    describe('Search', () => {
      const input = () => screen.getByPlaceholderText('Поиск брендов...');

      beforeEach(() => {
        listBrands.mockImplementation(async ({ q } = {}) => ({
          data: q ? [{ id: 'b1', name: 'Nike' }, { id: 'b9', name: 'Nikon' }] : [{ id: 'b1', name: 'Nike' }, { id: 'b2', name: 'Adidas' }],
        }));
        listProducts.mockResolvedValue({ data: [nike] });
      });
      afterEach(() => jest.useRealTimers());

      it(t('Search: поле поиска (дебаунс)', 'Search: поле поиска'), async () => {
        jest.useFakeTimers();
        render(<SearchScreen navigation={navigation} />);
        await act(async () => {});
        fireEvent.changeText(input(), 'N');
        fireEvent.changeText(input(), 'Ni');
        fireEvent.changeText(input(), 'Nik');
        act(() => { jest.advanceTimersByTime(300); });
        expect(listProducts).not.toHaveBeenCalled();
        await act(async () => { jest.advanceTimersByTime(100); });
        // Только один запрос — по последнему значению.
        expect(listProducts).toHaveBeenCalledTimes(1);
        expect(listProducts).toHaveBeenCalledWith({ q: 'Nik' });
        jest.useRealTimers();
        expect(await screen.findByText('Air Max 90')).toBeTruthy();
      });

      it('Search: поиск без результатов', async () => {
        listProducts.mockResolvedValue({ data: [] });
        render(<SearchScreen navigation={navigation} />);
        fireEvent.changeText(input(), 'zzz');
        expect(await screen.findByText('Ничего не найдено')).toBeTruthy();
      });

      it('Search: ошибка сети при поиске', async () => {
        listProducts.mockRejectedValue(new Error('offline'));
        render(<SearchScreen navigation={navigation} />);
        fireEvent.changeText(input(), 'Nike');
        expect(await screen.findByText('Не удалось выполнить поиск. Проверьте соединение.')).toBeTruthy();
      });

      it('Search: ссылка «Отмена»', async () => {
        render(<SearchScreen navigation={navigation} />);
        expect(screen.queryByText('Отмена')).toBeNull();
        fireEvent.changeText(input(), 'Nike');
        await screen.findByText('Air Max 90');
        fireEvent.press(screen.getByText('Отмена'));
        expect(input().props.value).toBe('');
        expect(screen.getByText('Популярное')).toBeTruthy();
      });

      it('Search: крестик в поле очищает запрос', async () => {
        render(<SearchScreen navigation={navigation} />);
        fireEvent.changeText(input(), 'Nike');
        fireEvent.press(screen.getByLabelText('Очистить поиск'));
        expect(input().props.value).toBe('');
      });

      it('Search: чип популярного бренда', async () => {
        render(<SearchScreen navigation={navigation} />);
        fireEvent.press(await screen.findByText('Adidas'));
        expect(input().props.value).toBe('Adidas');
        await waitFor(() => expect(listProducts).toHaveBeenCalledWith({ q: 'Adidas' }));
      });

      it(t('Search: строка «Недавнее» (тап)', 'Search: строка «Недавнее»'), async () => {
        render(<SearchScreen navigation={navigation} />);
        fireEvent.press(screen.getByText('Stone Island худи'));
        expect(input().props.value).toBe('Stone Island худи');
        await waitFor(() => expect(listProducts).toHaveBeenCalledWith({ q: 'Stone Island худи' }));
      });

      it(t('Search: «x» у «Недавнее» (удалить)', 'Search: «x» у «Недавнее»'), async () => {
        render(<SearchScreen navigation={navigation} />);
        await act(async () => {});
        expect(screen.getByText('Air Max')).toBeTruthy();
        fireEvent.press(screen.getAllByLabelText('Удалить из недавних')[0]);
        expect(screen.queryByText('Air Max')).toBeNull();
        const saved = JSON.parse(await AsyncStorage.getItem('arvell.recent_searches'));
        expect(saved).toEqual(['Stone Island худи', 'Куртка зима']);
      });

      it('Search: выполненный запрос попадает в «Недавнее» и сохраняется', async () => {
        render(<SearchScreen navigation={navigation} />);
        fireEvent.changeText(input(), 'Carhartt');
        await screen.findByText('Air Max 90');
        await waitFor(async () => {
          expect(JSON.parse(await AsyncStorage.getItem('arvell.recent_searches'))[0]).toBe('Carhartt');
        });
      });

      it('Search: подсказка бренда подставляется в поле', async () => {
        render(<SearchScreen navigation={navigation} />);
        fireEvent.changeText(input(), 'Nik');
        fireEvent.press(await screen.findByText('Nikon'));
        expect(input().props.value).toBe('Nikon');
      });

      it('Search: карточка «Для вас» -> Product', async () => {
        setProducts({ products: [{ ...adidas, id: 'fy1' }] });
        render(<SearchScreen navigation={navigation} />);
        expect(screen.getByText('Для вас')).toBeTruthy();
        fireEvent.press(screen.getByText('9 900,50 €'));
        expect(navigation.navigate).toHaveBeenCalledWith('Product', { id: 'fy1' });
      });

      it('Search: карточка результата -> Product', async () => {
        render(<SearchScreen navigation={navigation} />);
        fireEvent.changeText(input(), 'Nike');
        fireEvent.press(await screen.findByText('Air Max 90'));
        expect(navigation.navigate).toHaveBeenCalledWith('Product', { id: 'p1' });
      });
    });
  });

  describe('КАРТОЧКА ТОВАРА / МАГАЗИН', () => {
    const product = {
      id: 'p1',
      title: 'Air Max 90',
      brand: { id: 'b1', name: 'Nike' },
      price_minor: 890000,
      size_value: '42',
      condition: 'excellent',
      description: 'Оригинал',
      images: [{ url: '/media/files/p1.jpg' }],
      seller: { id: 's1', seller_id: 'owner-1', shop_name: 'Alex Shop', rating: 4.8, rating_count: 12 },
    };
    const route = { params: { id: 'p1' } };

    beforeEach(() => {
      getProduct.mockResolvedValue(product);
      setConfig({ conditions: [{ value: 'excellent', label: 'Отличное' }] });
    });

    it('Product: данные товара', async () => {
      render(<ProductScreen navigation={navigation} route={route} />);
      expect(await screen.findByText('Air Max 90')).toBeTruthy();
      expect(screen.getByText('Nike')).toBeTruthy();
      expect(screen.getByText('8 900 €')).toBeTruthy();
      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('Отличное')).toBeTruthy();
      expect(getProduct).toHaveBeenCalledWith('p1');
    });

    it('Product: кнопка «Назад»', async () => {
      render(<ProductScreen navigation={navigation} route={route} />);
      await screen.findByText('Air Max 90');
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('Product: товар не найден -> сообщение и «Назад»', async () => {
      getProduct.mockRejectedValue(Object.assign(new Error('nf'), { status: 404 }));
      render(<ProductScreen navigation={navigation} route={route} />);
      expect(await screen.findByText('Товар не найден или уже снят с публикации.')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it(t('Product: сердечко (лайк/избранное)', 'Product: сердечко'), async () => {
      const fav = setFavorites();
      render(<ProductScreen navigation={navigation} route={route} />);
      await screen.findByText('Air Max 90');
      fireEvent.press(screen.getByLabelText('В избранное'));
      expect(fav.toggleFavorite).toHaveBeenCalledWith('p1', product);
    });

    it('Product: сердечко у гостя -> окно входа', async () => {
      setAuth({ isLoggedIn: false, user: null });
      const fav = setFavorites();
      render(<ProductScreen navigation={navigation} route={route} />);
      await screen.findByText('Air Max 90');
      fireEvent.press(screen.getByLabelText('В избранное'));
      expect(navigation.navigate).toHaveBeenCalledWith('Auth');
      expect(fav.toggleFavorite).not.toHaveBeenCalled();
    });

    it('Product: кнопка «Поделиться»', async () => {
      const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
      render(<ProductScreen navigation={navigation} route={route} />);
      await screen.findByText('Air Max 90');
      fireEvent.press(screen.getByLabelText('Поделиться'));
      // ru-RU разделяет разряды узким неразрывным пробелом — сравниваем через \s.
      expect(share).toHaveBeenCalledWith({
        message: expect.stringMatching(/^Nike Air Max 90\n8\s900 €\narvell:\/\/product\/p1$/),
      });
    });

    it('Product: строка продавца -> Shop', async () => {
      render(<ProductScreen navigation={navigation} route={route} />);
      fireEvent.press(await screen.findByText('Alex Shop'));
      expect(navigation.navigate).toHaveBeenCalledWith('Shop', {
        shopId: 's1', shopName: 'Alex Shop', rating: 4.8, ratingCount: 12,
      });
    });

    it(t('Product: кнопка «Купить» -> Conversation', 'Product: кнопка «Купить»'), async () => {
      render(<ProductScreen navigation={navigation} route={route} />);
      await screen.findByText('Air Max 90');
      fireEvent.press(screen.getByText('Купить'));
      expect(navigation.navigate).toHaveBeenCalledWith('Conversation', expect.objectContaining({
        name: 'Alex Shop', rating: 4.8, product, fromBuy: true,
      }));
    });

    it(t('Product: иконка чата -> Conversation', 'Product: иконка чата'), async () => {
      render(<ProductScreen navigation={navigation} route={route} />);
      await screen.findByText('Air Max 90');
      fireEvent.press(screen.getByLabelText('Написать продавцу'));
      expect(navigation.navigate).toHaveBeenCalledWith('Conversation', expect.objectContaining({
        name: 'Alex Shop', product, fromBuy: false,
      }));
    });

    it('Product: «Купить» у гостя -> окно входа', async () => {
      setAuth({ isLoggedIn: false, user: null });
      render(<ProductScreen navigation={navigation} route={route} />);
      await screen.findByText('Air Max 90');
      fireEvent.press(screen.getByText('Купить'));
      expect(navigation.navigate).toHaveBeenCalledWith('Auth');
    });

    it('Product (продавец): на своём товаре нет «Купить» и чата', async () => {
      setAuth({ user: { id: 'owner-1', name: 'Алекс', role: 'seller' } });
      render(<ProductScreen navigation={navigation} route={route} />);
      expect(await screen.findByText('Это ваше объявление')).toBeTruthy();
      expect(screen.queryByText('Купить')).toBeNull();
      expect(screen.queryByLabelText('Написать продавцу')).toBeNull();
    });

    it('Shop: кнопка «Назад»', async () => {
      render(<ShopScreen navigation={navigation} route={{ params: { shopId: 's1', shopName: 'Alex Shop', rating: 4.8, ratingCount: 12 } }} />);
      expect(screen.getByText('Alex Shop')).toBeTruthy();
      expect(screen.getByText('4.8 · 12 отзывов')).toBeTruthy();
      await act(async () => {});
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('Shop: карточка товара -> Product', async () => {
      listProducts.mockResolvedValue({ data: [nike, adidas] });
      render(<ShopScreen navigation={navigation} route={{ params: { shopId: 's1' } }} />);
      fireEvent.press(await screen.findByText('Samba'));
      expect(listProducts).toHaveBeenCalledWith({ shopId: 's1' });
      expect(navigation.navigate).toHaveBeenCalledWith('Product', { id: 'p2' });
    });

    it('Shop: пустой магазин', async () => {
      render(<ShopScreen navigation={navigation} route={{ params: { shopId: 's1' } }} />);
      expect(await screen.findByText('У продавца пока нет объявлений')).toBeTruthy();
    });
  });

  describe('ИЗБРАННОЕ', () => {
    it('Карточка товара -> Product', () => {
      setFavorites({ items: [{ id: 'f1', product: nike }], favorites: ['p1'], isFavorite: () => true, count: 1 });
      render(<FavoritesScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('Air Max 90'));
      expect(navigation.navigate).toHaveBeenCalledWith('Product', { id: 'p1' });
    });

    it('Сердечко на карточке (убрать)', () => {
      const fav = setFavorites({ items: [{ id: 'f1', product: nike }], favorites: ['p1'], isFavorite: () => true, count: 1 });
      render(<FavoritesScreen navigation={navigation} />);
      fireEvent.press(hearts()[0]);
      expect(fav.toggleFavorite).toHaveBeenCalledWith('p1', nike);
    });

    it('Пустой список -> «Перейти к товарам»', () => {
      render(<FavoritesScreen navigation={navigation} />);
      expect(screen.getByText('Здесь пока пусто')).toBeTruthy();
      fireEvent.press(screen.getByText('Перейти к товарам'));
      expect(navigation.navigate).toHaveBeenCalledWith('Catalog');
    });
  });
});
