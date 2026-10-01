// Чек-лист: ПОКУПАТЕЛЬ — профиль, заказы, уведомления, помощь и правила.
// Экраны уведомлений/помощи/правил у продавца те же — см. 06-seller.test.js.
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

jest.mock('@react-navigation/native', () => require('../helpers/navMock').module);
jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
jest.mock('../../src/context/AppConfigContext', () => require('../helpers/mockContexts').configModule);
jest.mock('../../src/context/FavoritesContext', () => require('../helpers/mockContexts').favoritesModule);
jest.mock('../../src/context/MyListingsContext', () => require('../helpers/mockContexts').myListingsModule);
jest.mock('../../src/api/media', () => ({ uploadImage: jest.fn(async () => '/media/files/new.jpg') }));
jest.mock('../../src/api/purchases', () => ({ listMyPurchases: jest.fn(), listMySales: jest.fn() }));
jest.mock('../../src/api/shops', () => ({ updateMyShop: jest.fn(async () => ({})), getMyShop: jest.fn() }));
jest.mock('../../src/utils/imageUpload', () => ({
  ...jest.requireActual('../../src/utils/imageUpload'),
  prepareForUpload: jest.fn(async (a) => ({ ...a, contentType: 'image/jpeg' })),
}));

const { createNavigation } = require('../helpers/navMock');
const { setAuth, setFavorites, resetContexts } = require('../helpers/mockContexts');
const { getImage } = require('../helpers/queries');
const { forEachRole } = require('../helpers/roles');
const { uploadImage } = require('../../src/api/media');
const { updateMyShop } = require('../../src/api/shops');

import AccountScreen from '../../src/screens/AccountScreen';
import EditProfileScreen from '../../src/screens/EditProfileScreen';
import OrdersScreen from '../../src/screens/OrdersScreen';
import NotificationsScreen from '../../src/screens/NotificationsScreen';
import HelpScreen from '../../src/screens/HelpScreen';
import RulesScreen from '../../src/screens/RulesScreen';
const { listMyPurchases } = require('../../src/api/purchases');

let navigation;
beforeEach(async () => {
  resetContexts();
  navigation = createNavigation();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await AsyncStorage.clear();
});

describe('ПОКУПАТЕЛЬ', () => {
  describe('ПРОФИЛЬ (ПОКУПАТЕЛЬ)', () => {
    const renderAccount = () => render(<AccountScreen navigation={navigation} />);

    it('Показывает имя и бейдж «Покупатель»', () => {
      renderAccount();
      expect(screen.getByText('Иван')).toBeTruthy();
      expect(screen.getByText('Покупатель')).toBeTruthy();
      expect(screen.queryByText('Продавец')).toBeNull();
    });

    it('Кнопка «Редактировать профиль»', () => {
      renderAccount();
      fireEvent.press(screen.getByText('Редактировать профиль'));
      expect(navigation.navigate).toHaveBeenCalledWith('EditProfile');
    });

    it('Плитка «Заказы» -> Orders', () => {
      renderAccount();
      fireEvent.press(screen.getByText('Заказы'));
      expect(navigation.navigate).toHaveBeenCalledWith('Orders');
    });

    it('Плитка «Избранное» -> вкладка Избранное', () => {
      setFavorites({ count: 4 });
      renderAccount();
      expect(screen.getByText('4')).toBeTruthy();
      fireEvent.press(screen.getByText('Избранное'));
      expect(navigation.parent.navigate).toHaveBeenCalledWith('Favorites');
    });

    // Строки убраны из профиля намеренно (коммит b003f69): пушей и чата
    // поддержки на бэкенде пока нет. Пункты чек-листа устарели до их появления.
    it.skip('Строка «Уведомления» -> Notifications', () => {});
    it.skip('Строка «Чат с поддержкой» -> Conversation', () => {});

    it('Строк «Уведомления» и «Чат с поддержкой» нет, пока нет пушей и чата поддержки', () => {
      renderAccount();
      expect(screen.queryByText('Уведомления')).toBeNull();
      expect(screen.queryByText('Чат с поддержкой')).toBeNull();
    });

    it('Счётчик заказов не выдуман: до появления данных — «—»', () => {
      renderAccount();
      expect(screen.getByText('—')).toBeTruthy();
    });

    it('Версия берётся из app.json, а не захардкожена', () => {
      renderAccount();
      expect(screen.getByText(`ARVELL · версия ${require('../../app.json').expo.version}`)).toBeTruthy();
    });

    it('Без имени пользователя не показывается чужое имя-заглушка', () => {
      setAuth({ user: { id: 'u1', role: 'user' } });
      renderAccount();
      expect(screen.queryByText('Александр Петров')).toBeNull();
      expect(screen.getAllByText('Профиль').length).toBeGreaterThan(0);
    });

    it('Строка «Помощь» -> Help', () => {
      renderAccount();
      fireEvent.press(screen.getByText('Помощь'));
      expect(navigation.navigate).toHaveBeenCalledWith('Help');
    });

    it('Строка «Правила» -> Rules', () => {
      renderAccount();
      fireEvent.press(screen.getByText('Правила'));
      expect(navigation.navigate).toHaveBeenCalledWith('Rules');
    });

    it('Строка «Выйти» -> диалог подтверждения', () => {
      renderAccount();
      expect(screen.queryByText('Выйти из аккаунта?')).toBeNull();
      fireEvent.press(screen.getByText('Выйти'));
      expect(screen.getByText('Выйти из аккаунта?')).toBeTruthy();
    });

    it('Диалог выхода -> «Отмена»', () => {
      const auth = setAuth();
      renderAccount();
      fireEvent.press(screen.getByText('Выйти'));
      fireEvent.press(screen.getByText('Отмена'));
      expect(screen.queryByText('Выйти из аккаунта?')).toBeNull();
      expect(auth.signOut).not.toHaveBeenCalled();
    });

    it('Диалог выхода -> «Выйти» (реальный выход)', async () => {
      const auth = setAuth();
      renderAccount();
      fireEvent.press(screen.getByText('Выйти'));
      // В диалоге две надписи «Выйти»: строка меню и кнопка подтверждения.
      const buttons = screen.getAllByText('Выйти');
      fireEvent.press(buttons[buttons.length - 1]);
      await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
      expect(navigation.parent.navigate).toHaveBeenCalledWith('Feed');
    });

    it('Строка «Админ-панель» не видна обычному покупателю', () => {
      renderAccount();
      expect(screen.queryByText('Админ-панель')).toBeNull();
    });
  });

  describe('ПРОФИЛЬ (ПОКУПАТЕЛЬ)', () => {
    const nickname = () => screen.getByPlaceholderText('Придумайте никнейм');

    it('EditProfile: стрелка «‹» назад', () => {
      render(<EditProfileScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('‹'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('EditProfile: «Назад» с несохранёнными правками спрашивает «Сохранить изменения?»', () => {
      render(<EditProfileScreen navigation={navigation} />);
      fireEvent.changeText(nickname(), 'Иван Новый');
      const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
      act(() => navigation.emit('beforeRemove', event));
      expect(event.preventDefault).toHaveBeenCalled();
      expect(screen.getByText('Сохранить изменения?')).toBeTruthy();
      fireEvent.press(screen.getByText('Не сохранять'));
      expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
    });

    it('EditProfile: тап по аватару -> фото из галереи', async () => {
      const asset = { uri: 'file:///new.jpg', mimeType: 'image/jpeg' };
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [asset] });
      render(<EditProfileScreen navigation={navigation} />);
      fireEvent.press(screen.getByLabelText('Изменить фото профиля'));
      jest.useFakeTimers();
      fireEvent.press(screen.getByText('Выбрать из галереи'));
      await act(async () => { jest.advanceTimersByTime(300); });
      jest.useRealTimers();
      await waitFor(() => expect(getImage(asset.uri)).toBeTruthy());
    });

    it('EditProfile: поле «Имя и фамилия»', () => {
      render(<EditProfileScreen navigation={navigation} />);
      expect(nickname().props.value).toBe('Иван');
      fireEvent.changeText(nickname(), 'Иван Петров');
      expect(nickname().props.value).toBe('Иван Петров');
    });

    it('EditProfile: имя-заглушка (номер телефона) в поле не подставляется', () => {
      setAuth({ user: { id: 'u1', name: '+79990001122', display_name: '+79990001122', phone: '+79990001122', role: 'user' } });
      render(<EditProfileScreen navigation={navigation} />);
      expect(nickname().props.value).toBe('');
    });

    it('EditProfile: поле «Телефон» — только просмотр', () => {
      render(<EditProfileScreen navigation={navigation} />);
      const phone = screen.getByText('+79990001122');
      // Телефон — обычный текст, а не поле ввода.
      expect(phone.type).not.toBe('TextInput');
      expect(screen.queryByDisplayValue('+79990001122')).toBeNull();
      expect(screen.getByText(/не может быть изменён здесь/)).toBeTruthy();
    });

    it('EditProfile: кнопка «Сохранить»', async () => {
      const auth = setAuth();
      render(<EditProfileScreen navigation={navigation} />);
      fireEvent.changeText(nickname(), '  Иван Петров ');
      fireEvent.press(screen.getByText('Сохранить'));
      await waitFor(() => expect(auth.updateProfile).toHaveBeenCalledWith({ display_name: 'Иван Петров' }));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('EditProfile: «Сохранить» неактивна с пустым именем', () => {
      const auth = setAuth();
      render(<EditProfileScreen navigation={navigation} />);
      fireEvent.changeText(nickname(), '   ');
      fireEvent.press(screen.getByText('Сохранить'));
      expect(auth.updateProfile).not.toHaveBeenCalled();
    });

    it('EditProfile: ошибка сохранения -> алерт, остаёмся на экране', async () => {
      setAuth({ updateProfile: jest.fn(async () => { throw new Error('Нет сети'); }) });
      render(<EditProfileScreen navigation={navigation} />);
      fireEvent.changeText(nickname(), 'Новое имя');
      fireEvent.press(screen.getByText('Сохранить'));
      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Не удалось сохранить', 'Нет сети'));
      expect(navigation.goBack).not.toHaveBeenCalled();
    });

    it('EditProfile: новый аватар покупателя загружается, логотип магазина не трогается', async () => {
      const auth = setAuth();
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///n.jpg' }] });
      render(<EditProfileScreen navigation={navigation} />);
      fireEvent.press(screen.getByLabelText('Изменить фото профиля'));
      jest.useFakeTimers();
      fireEvent.press(screen.getByText('Выбрать из галереи'));
      await act(async () => { jest.advanceTimersByTime(300); });
      jest.useRealTimers();
      await waitFor(() => expect(getImage('file:///n.jpg')).toBeTruthy());
      fireEvent.press(screen.getByText('Сохранить'));
      await waitFor(() => expect(auth.updateProfile).toHaveBeenCalledWith({
        display_name: 'Иван', profile_pic_url: '/media/files/new.jpg',
      }));
      expect(uploadImage).toHaveBeenCalled();
      expect(updateMyShop).not.toHaveBeenCalled();
    });
  });

  describe('ЗАКАЗЫ', () => {
    const purchase = (id, title, brand, priceMinor) => ({
      id, confirmed_at: '2026-09-01T12:00:00Z',
      product: { id: `p-${id}`, title, brand: { name: brand }, price_minor: priceMinor, thumbnail_url: `/media/files/${id}.jpg` },
    });
    beforeEach(() => {
      listMyPurchases.mockReset().mockResolvedValue({
        data: [purchase('d1', 'Air Max 90', 'Nike', 890000), purchase('d2', 'Футболка', 'Carhartt WIP', 320000)],
      });
    });

    it('Стрелка назад', async () => {
      render(<OrdersScreen navigation={navigation} />);
      await screen.findByText('Nike Air Max 90');
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('Покупки покупателя загружаются из /me/purchases', async () => {
      render(<OrdersScreen navigation={navigation} />);
      expect(screen.getByText('Завершённые сделки')).toBeTruthy();
      expect(await screen.findByText('Nike Air Max 90')).toBeTruthy();
      expect(screen.getAllByText(/^Покупка · /)).toHaveLength(2);
      expect(screen.getByText(/^8\s900 €$/)).toBeTruthy();
      expect(listMyPurchases).toHaveBeenCalledWith({ limit: 50 });
    });

    it('Строки сделок (проверить кликабельность)', async () => {
      render(<OrdersScreen navigation={navigation} />);
      fireEvent.press(await screen.findByText('Nike Air Max 90'));
      // Открывается карточка сделки с подробностями.
      expect(screen.getByText(/Это запись из истории сделок/)).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Закрыть'));
      expect(screen.queryByText(/Это запись из истории сделок/)).toBeNull();
    });

    it('Пустой список -> «Пока нет заказов»', async () => {
      listMyPurchases.mockResolvedValue({ data: [] });
      render(<OrdersScreen navigation={navigation} />);
      expect(await screen.findByText('Пока нет завершённых сделок')).toBeTruthy();
      expect(screen.getByText('Ваши покупки появятся здесь после первой сделки.')).toBeTruthy();
    });

    it('Ошибка загрузки — текст ошибки вместо пустого списка', async () => {
      listMyPurchases.mockRejectedValue(new Error('Сервер недоступен'));
      render(<OrdersScreen navigation={navigation} />);
      expect(await screen.findByText('Сервер недоступен')).toBeTruthy();
    });
  });
});

forEachRole(({ t }) => {
  describe('УВЕДОМЛЕНИЯ (НАСТРОЙКИ)', () => {
    const toggle = (title) => screen.getByLabelText(title);
    const checked = (title) => toggle(title).props.accessibilityState.checked;

    it('Стрелка назад', () => {
      render(<NotificationsScreen navigation={navigation} />);
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it.each([
      ['Новые сообщения', true, 'msg'],
      ['Статус сделки', true, 'deal'],
      ['Проверка подлинности', true, 'auth'],
      ['Снижение цены', true, 'price'],
      ['Новости и акции', false, 'news'],
    ])('Тумблер «%s»', async (title, initial, key) => {
      render(<NotificationsScreen navigation={navigation} />);
      await act(async () => {}); // чтение сохранённых настроек
      expect(checked(title)).toBe(initial);
      fireEvent.press(toggle(title));
      expect(checked(title)).toBe(!initial);
      await waitFor(async () => {
        const saved = JSON.parse(await AsyncStorage.getItem('arvell.notification_prefs'));
        expect(saved[key]).toBe(!initial);
      });
    });

    it('Настройки переживают повторный заход на экран', async () => {
      await AsyncStorage.setItem('arvell.notification_prefs', JSON.stringify({ news: true, msg: false }));
      render(<NotificationsScreen navigation={navigation} />);
      await waitFor(() => expect(checked('Новости и акции')).toBe(true));
      expect(checked('Новые сообщения')).toBe(false);
    });
  });

  describe('ПОМОЩЬ И ПРАВИЛА', () => {
    const FAQ = [
      ['Как понять, что товар прошёл проверку подлинности?', /автоматически проходит проверку/],
      ['Когда и как я оплачиваю товар?', /Оплата происходит лично/],
      ['Кто организует доставку?', /Доставку и встречу стороны организуют сами/],
      ['Как стать продавцом на ARVELL?', /только по приглашению/],
      ['Что делать, если товар не соответствует описанию?', /Осмотрите вещь при встрече/],
    ];

    it('Help: стрелка назад', () => {
      render(<HelpScreen navigation={navigation} />);
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it.each(FAQ.map((f, i) => [i + 1, ...f]))('Help: вопрос FAQ %i', (_n, question, answer) => {
      render(<HelpScreen navigation={navigation} />);
      expect(screen.queryByText(answer)).toBeNull();
      fireEvent.press(screen.getByText(question));
      expect(screen.getByText(answer)).toBeTruthy();
      // Повторный тап сворачивает ответ.
      fireEvent.press(screen.getByText(question));
      expect(screen.queryByText(answer)).toBeNull();
    });

    it('Help: открыт только один вопрос за раз', () => {
      render(<HelpScreen navigation={navigation} />);
      fireEvent.press(screen.getByText(FAQ[0][0]));
      fireEvent.press(screen.getByText(FAQ[1][0]));
      expect(screen.queryByText(FAQ[0][1])).toBeNull();
      expect(screen.getByText(FAQ[1][1])).toBeTruthy();
    });

    // Блок поддержки убран до появления чата поддержки на бэкенде — пункт устарел.
    it.skip(t('Help: «Написать в поддержку» -> Conversation', 'Help: «Написать в поддержку»'), () => {});

    it('Help: блока «Служба поддержки» нет, пока чат поддержки не работает', () => {
      render(<HelpScreen navigation={navigation} />);
      expect(screen.queryByText('Написать в поддержку')).toBeNull();
    });

    it('Rules: стрелка назад', () => {
      render(<RulesScreen navigation={navigation} />);
      expect(screen.getByText('Как работает ARVELL')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });
  });
});
