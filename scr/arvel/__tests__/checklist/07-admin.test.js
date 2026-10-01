// Чек-лист: АДМИН
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { getStateFromPath } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => require('../helpers/navMock').module);
jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
jest.mock('../../src/context/FavoritesContext', () => require('../helpers/mockContexts').favoritesModule);
jest.mock('../../src/context/MyListingsContext', () => require('../helpers/mockContexts').myListingsModule);
jest.mock('../../src/api/admin', () => ({
  listSellerInvites: jest.fn(),
  createSellerInvite: jest.fn(),
  revokeSellerInvite: jest.fn(),
  listAdminUsers: jest.fn(),
  banUser: jest.fn(),
  unbanUser: jest.fn(),
}));

const { createNavigation } = require('../helpers/navMock');
const { setAuth, resetContexts } = require('../helpers/mockContexts');
const admin = require('../../src/api/admin');

import AccountScreen from '../../src/screens/AccountScreen';
import AdminPanelScreen from '../../src/screens/AdminPanelScreen';
import linking from '../../src/navigation/linking';

const invite = (id, status, extra = {}) => ({
  id, status, token: `TOKEN-${id}`, created_by: 'admin-0001-xxxx', created_at: '2026-09-01T10:00:00Z',
  expires_at: '2026-10-01T10:00:00Z', ...extra,
});
const user = (id, name, isActive = true, role = 'user') => ({
  id, display_name: name, is_active: isActive, role, created_at: '2026-08-01T10:00:00Z',
});
const forbidden = () => Object.assign(new Error('Недостаточно прав'), { status: 403 });

let navigation;
beforeEach(() => {
  resetContexts();
  // Админ-панель открывается только при is_admin (коммит b003f69).
  setAuth({ user: { id: 'adm', name: 'Админ', display_name: 'Админ', role: 'user', is_admin: true } });
  navigation = createNavigation();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  admin.listSellerInvites.mockReset().mockResolvedValue({
    data: [invite('i1', 'created'), invite('i2', 'used', { used_by: 'seller-777-yyyy' }), invite('i3', 'expired'), invite('i4', 'revoked')],
  });
  admin.createSellerInvite.mockReset().mockResolvedValue(invite('i9', 'created'));
  admin.revokeSellerInvite.mockReset().mockImplementation(async (id) => invite(id, 'revoked'));
  admin.listAdminUsers.mockReset().mockResolvedValue({
    data: [user('u1', 'Иван'), user('u2', 'Мария', false, 'seller')],
  });
  admin.banUser.mockReset().mockImplementation(async (id) => user(id, 'Иван', false));
  admin.unbanUser.mockReset().mockImplementation(async (id) => user(id, 'Мария', true, 'seller'));
});

describe('АДМИН', () => {
  const renderPanel = async () => {
    render(<AdminPanelScreen navigation={navigation} />);
    await screen.findByText('TOKEN-i1');
  };

  describe('ВХОД В РАЗДЕЛ', () => {
    it('Профиль -> строка «Админ-панель» видна только при is_admin', () => {
      setAuth({ user: { id: 'u1', name: 'Иван', role: 'user', is_admin: false } });
      const { rerender } = render(<AccountScreen navigation={navigation} />);
      expect(screen.queryByText('Админ-панель')).toBeNull();

      setAuth({ user: { id: 'u1', name: 'Иван', role: 'user', is_admin: true } });
      rerender(<AccountScreen navigation={navigation} />);
      expect(screen.getByText('Админ-панель')).toBeTruthy();
    });

    it('Строка «Админ-панель» доступна и админу-продавцу', () => {
      setAuth({ user: { id: 's1', name: 'Алекс', role: 'seller', is_admin: true } });
      render(<AccountScreen navigation={navigation} />);
      expect(screen.getByText('Админ-панель')).toBeTruthy();
    });

    it('Переход в AdminPanel по этой строке', () => {
      setAuth({ user: { id: 'u1', name: 'Иван', role: 'user', is_admin: true } });
      render(<AccountScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('Админ-панель'));
      expect(navigation.navigate).toHaveBeenCalledWith('AdminPanel');
    });
  });

  describe('ADMINPANEL — ТАБЫ', () => {
    it('Стрелка «Назад»', async () => {
      await renderPanel();
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('Таб «Инвайты»', async () => {
      await renderPanel();
      fireEvent.press(screen.getByText('Пользователи'));
      fireEvent.press(screen.getByText('Инвайты'));
      expect(screen.getByText('+ Создать инвайт')).toBeTruthy();
      expect(screen.queryByText('Забанить')).toBeNull();
    });

    it('Таб «Пользователи»', async () => {
      await renderPanel();
      fireEvent.press(screen.getByText('Пользователи'));
      expect(await screen.findByText('Иван')).toBeTruthy();
      expect(screen.getByText('Мария')).toBeTruthy();
      expect(screen.queryByText('+ Создать инвайт')).toBeNull();
    });
  });

  describe('ИНВАЙТЫ', () => {
    it('Кнопка «+ Создать инвайт»', async () => {
      await renderPanel();
      fireEvent.press(screen.getByText('+ Создать инвайт'));
      expect(await screen.findByText('TOKEN-i9')).toBeTruthy();
      expect(admin.createSellerInvite).toHaveBeenCalledTimes(1);
    });

    it('Кнопка «+ Создать инвайт»: ошибка -> алерт', async () => {
      admin.createSellerInvite.mockRejectedValueOnce(new Error('Лимит инвайтов'));
      await renderPanel();
      fireEvent.press(screen.getByText('+ Создать инвайт'));
      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Не удалось создать инвайт', 'Лимит инвайтов'));
    });

    it('Кнопка «Отозвать» (для «Активен»)', async () => {
      await renderPanel();
      // Кнопка есть только у активного инвайта.
      expect(screen.getAllByText('Отозвать')).toHaveLength(1);
      fireEvent.press(screen.getByText('Отозвать'));
      await waitFor(() => expect(admin.revokeSellerInvite).toHaveBeenCalledWith('i1'));
      await waitFor(() => expect(screen.queryByText('Отозвать')).toBeNull());
      expect(screen.getAllByText('Отозван')).toHaveLength(2);
    });

    it('Бейджи: Активен / Использован / Истёк / Отозван', async () => {
      await renderPanel();
      ['Активен', 'Использован', 'Истёк', 'Отозван'].forEach((label) => expect(screen.getByText(label)).toBeTruthy());
      expect(screen.getByText(/использовал seller-7/)).toBeTruthy();
    });

    it('Пустой список -> «Инвайтов пока нет»', async () => {
      admin.listSellerInvites.mockResolvedValue({ data: [] });
      render(<AdminPanelScreen navigation={navigation} />);
      expect(await screen.findByText('Инвайтов пока нет')).toBeTruthy();
    });

    it('Ошибка загрузки -> текст ошибки', async () => {
      admin.listSellerInvites.mockRejectedValue(new Error('offline'));
      render(<AdminPanelScreen navigation={navigation} />);
      expect(await screen.findByText('Не удалось загрузить инвайты')).toBeTruthy();
    });
  });

  describe('ПОЛЬЗОВАТЕЛИ', () => {
    const openUsers = async () => {
      await renderPanel();
      fireEvent.press(screen.getByText('Пользователи'));
      await screen.findByText('Иван');
    };

    it('Кнопка «Забанить» -> статус меняется', async () => {
      await openUsers();
      fireEvent.press(screen.getByText('Забанить'));
      await waitFor(() => expect(admin.banUser).toHaveBeenCalledWith('u1'));
      await waitFor(() => expect(screen.queryByText('Забанить')).toBeNull());
      expect(screen.getAllByText('Разбанить')).toHaveLength(2);
    });

    it('Кнопка «Разбанить» -> снимает бан', async () => {
      await openUsers();
      fireEvent.press(screen.getByText('Разбанить'));
      await waitFor(() => expect(admin.unbanUser).toHaveBeenCalledWith('u2'));
      await waitFor(() => expect(screen.queryByText('Разбанить')).toBeNull());
      expect(screen.getAllByText('Забанить')).toHaveLength(2);
    });

    it('Ошибка бана/разбана -> алерт', async () => {
      admin.banUser.mockRejectedValueOnce(new Error('Сервер недоступен'));
      await openUsers();
      fireEvent.press(screen.getByText('Забанить'));
      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Не удалось изменить статус', 'Сервер недоступен'));
      expect(screen.getByText('Забанить')).toBeTruthy(); // статус не изменился
    });

    it('Ошибка загрузки -> текст ошибки', async () => {
      admin.listAdminUsers.mockRejectedValue(new Error('offline'));
      await renderPanel();
      fireEvent.press(screen.getByText('Пользователи'));
      expect(await screen.findByText('Не удалось загрузить пользователей')).toBeTruthy();
    });
  });

  describe('БЕЗОПАСНОСТЬ', () => {
    it('Экран без is_admin: «нет прав», данных админки не видно', () => {
      setAuth({ user: { id: 'u1', name: 'Иван', role: 'user', is_admin: false } });
      render(<AdminPanelScreen navigation={navigation} />);
      expect(screen.getByText('У вас нет прав администратора.')).toBeTruthy();
      expect(screen.queryByText('+ Создать инвайт')).toBeNull();
      expect(screen.queryByText('Пользователи')).toBeNull();
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('Экран без is_admin не отправляет запросы к /admin/*', async () => {
      setAuth({ user: { id: 'u1', name: 'Иван', role: 'user', is_admin: false } });
      render(<AdminPanelScreen navigation={navigation} />);
      await waitFor(() => expect(screen.getByText('У вас нет прав администратора.')).toBeTruthy());
      expect(admin.listSellerInvites).not.toHaveBeenCalled();
      expect(admin.listAdminUsers).not.toHaveBeenCalled();
    });

    const routeNames = (state) => {
      const names = [];
      const walk = (s) => s?.routes?.forEach((r) => { names.push(r.name); walk(r.state); });
      walk(state);
      return names;
    };

    it('Deep link в AdminPanel без is_admin — не должен работать', () => {
      // Ни один путь deep link-а не ведёт в админ-панель.
      for (const path of ['AdminPanel', 'admin', 'adminpanel', 'Main/Account/AdminPanel', 'account/admin']) {
        expect(routeNames(getStateFromPath(path, linking.config))).not.toContain('AdminPanel');
      }
      // Разрешённая ссылка на товар по-прежнему работает.
      expect(routeNames(getStateFromPath('product/42', linking.config))).toContain('Product');
      expect(JSON.stringify(linking.config)).not.toMatch(/admin/i);
    });

    // Проверка прав — на сервере; клиент должен корректно пережить отказ 403
    // и не показать действие выполненным.
    it('Запросы бан/инвайт от не-админа отклоняются сервером', async () => {
      admin.listSellerInvites.mockRejectedValue(forbidden());
      admin.listAdminUsers.mockRejectedValue(forbidden());
      admin.createSellerInvite.mockRejectedValue(forbidden());
      render(<AdminPanelScreen navigation={navigation} />);
      expect(await screen.findByText('Не удалось загрузить инвайты')).toBeTruthy();
      fireEvent.press(screen.getByText('+ Создать инвайт'));
      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Не удалось создать инвайт', 'Недостаточно прав'));
      expect(screen.queryByText('TOKEN-i9')).toBeNull();
      fireEvent.press(screen.getByText('Пользователи'));
      expect(await screen.findByText('Не удалось загрузить пользователей')).toBeTruthy();
    });

    it('Бан от не-админа: отказ 403 не меняет статус пользователя', async () => {
      admin.banUser.mockRejectedValue(forbidden());
      await renderPanel();
      fireEvent.press(screen.getByText('Пользователи'));
      fireEvent.press(await screen.findByText('Забанить'));
      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Не удалось изменить статус', 'Недостаточно прав'));
      expect(screen.getByText('Забанить')).toBeTruthy();
    });
  });
});
