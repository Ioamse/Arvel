// Чек-лист: ЧАТЫ И ПЕРЕПИСКА (одинаково у покупателя и продавца;
// различие — чьё имя показывается в списке — проверено отдельным тестом).
import React from 'react';
import { Alert, Linking } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

jest.mock('@react-navigation/native', () => require('../helpers/navMock').module);
jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
jest.mock('../../src/context/AppConfigContext', () => require('../helpers/mockContexts').configModule);
jest.mock('../../src/api/chat', () => ({
  listConversations: jest.fn(),
  openConversation: jest.fn(),
  listMessages: jest.fn(),
  sendMessage: jest.fn(),
  markConversationRead: jest.fn(),
}));
jest.mock('../../src/api/media', () => ({ uploadImage: jest.fn() }));
// Пинч-зум на нативном драйвере жестов в Jest не работает — подменяем
// просмотрщик простой картинкой с тем же onSingleTap.
jest.mock('../../src/components/ZoomableImage', () => {
  const { Pressable, Image } = require('react-native');
  return ({ uri, onSingleTap }) => (
    <Pressable accessibilityLabel="Просмотр фото" onPress={onSingleTap}><Image source={{ uri }} /></Pressable>
  );
});

const { createNavigation } = require('../helpers/navMock');
const { setAuth, resetContexts } = require('../helpers/mockContexts');
const { getImage, queryImage } = require('../helpers/queries');
const chatApi = require('../../src/api/chat');
const { uploadImage } = require('../../src/api/media');
const { forEachRole } = require('../helpers/roles');

import ChatScreen from '../../src/screens/ChatScreen';
import ConversationScreen from '../../src/screens/ConversationScreen';

const conversations = [
  {
    id: 'c1', seller: { seller_id: 's-owner', shop_name: 'Alex Shop', rating: 4.8 }, buyer: { display_name: 'Мария' },
    last_message_preview: 'Ещё в наличии?', last_message_at: new Date().toISOString(), unread_count: 2,
  },
  {
    id: 'c2', seller: { seller_id: 's-owner2', shop_name: 'Brand Store', rating: 4.1 }, buyer: { display_name: 'Олег' },
    last_message_preview: 'Спасибо!', last_message_at: new Date().toISOString(), unread_count: 0,
  },
];

let navigation;
beforeEach(async () => {
  resetContexts();
  navigation = createNavigation();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await AsyncStorage.clear();
  chatApi.listConversations.mockReset().mockResolvedValue({ data: conversations });
  chatApi.openConversation.mockReset().mockResolvedValue({ id: 'c-new' });
  chatApi.listMessages.mockReset().mockResolvedValue({ data: [] });
  chatApi.sendMessage.mockReset().mockImplementation(async (id, body) => ({
    id: `m-${body}`, sender_id: 'u1', body, created_at: new Date().toISOString(),
  }));
  chatApi.markConversationRead.mockReset().mockResolvedValue(null);
  uploadImage.mockReset().mockResolvedValue('/media/files/photo.jpg');
});

forEachRole(({ t }) => {
  describe('ЧАТЫ И ПЕРЕПИСКА', () => {
    const renderChat = async () => {
      render(<ChatScreen navigation={navigation} />);
      await screen.findByText('Alex Shop');
    };

    it('Список диалогов с бэкенда: собеседник, превью, счётчик непрочитанных', async () => {
      await renderChat();
      expect(screen.getByText('Brand Store')).toBeTruthy();
      expect(screen.getByText('Ещё в наличии?')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('Продавец видит в списке имя покупателя, а не свой магазин', async () => {
      setAuth({ user: { id: 's-owner', name: 'Алекс', role: 'seller' } });
      render(<ChatScreen navigation={navigation} />);
      expect(await screen.findByText('Мария')).toBeTruthy();
      expect(screen.queryByText('Alex Shop')).toBeNull();
    });

    it('Пустой список переписок', async () => {
      chatApi.listConversations.mockResolvedValue({ data: [] });
      render(<ChatScreen navigation={navigation} />);
      expect(await screen.findByText(/Пока нет переписок/)).toBeTruthy();
    });

    it('Ошибка загрузки чатов', async () => {
      chatApi.listConversations.mockRejectedValue(new Error('Нет соединения'));
      render(<ChatScreen navigation={navigation} />);
      expect(await screen.findByText('Нет соединения')).toBeTruthy();
    });

    it('Chat: поле поиска по чатам', async () => {
      await renderChat();
      fireEvent.changeText(screen.getByPlaceholderText('Поиск по чатам'), 'brand');
      expect(screen.queryByText('Alex Shop')).toBeNull();
      expect(screen.getByText('Brand Store')).toBeTruthy();
      fireEvent.changeText(screen.getByPlaceholderText('Поиск по чатам'), 'zzz');
      expect(screen.getByText('Ничего не найдено')).toBeTruthy();
    });

    it('Chat: «Выбрать» / «Готово»', async () => {
      await renderChat();
      fireEvent.press(screen.getByText('Выбрать'));
      expect(screen.getByText('Готово')).toBeTruthy();
      expect(screen.getByText('Выберите чаты')).toBeTruthy();
      fireEvent.press(screen.getByText('Готово'));
      expect(screen.getByText('Выбрать')).toBeTruthy();
      expect(screen.queryByText('Выберите чаты')).toBeNull();
    });

    it('Chat: строка чата -> Conversation', async () => {
      await renderChat();
      fireEvent.press(screen.getByText('Alex Shop'));
      expect(navigation.navigate).toHaveBeenCalledWith('Conversation', {
        conversationId: 'c1', name: 'Alex Shop', rating: 4.8, phone: undefined,
      });
    });

    it('Chat: строка (режим выбора) -> чекбокс', async () => {
      await renderChat();
      fireEvent.press(screen.getByText('Выбрать'));
      fireEvent.press(screen.getByText('Alex Shop'));
      expect(screen.getByText('Выбрано: 1')).toBeTruthy();
      fireEvent.press(screen.getByText('Brand Store'));
      expect(screen.getByText('Выбрано: 2')).toBeTruthy();
      fireEvent.press(screen.getByText('Alex Shop'));
      expect(screen.getByText('Выбрано: 1')).toBeTruthy();
      // В режиме выбора строка не открывает диалог.
      expect(navigation.navigate).not.toHaveBeenCalled();
    });

    it('Chat: кнопка «Прочитано»', async () => {
      await renderChat();
      fireEvent.press(screen.getByText('Выбрать'));
      // Без выбора кнопка неактивна.
      fireEvent.press(screen.getByText('Прочитано'));
      expect(chatApi.markConversationRead).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText('Alex Shop'));
      fireEvent.press(screen.getByText('Прочитано'));
      expect(chatApi.markConversationRead).toHaveBeenCalledWith('c1');
      expect(screen.queryByText('2')).toBeNull(); // счётчик непрочитанных исчез
      expect(screen.getByText('Выбрать')).toBeTruthy(); // вышли из режима выбора
    });

    // В чек-листе кнопка названа «Удалить», в приложении она «Скрыть»: удаления
    // диалога в API нет, чат прячется только на этом устройстве.
    it(t('Chat: кнопка «Удалить» -> подтверждение', 'Chat: кнопка «Удалить»'), async () => {
      await renderChat();
      fireEvent.press(screen.getByText('Выбрать'));
      fireEvent.press(screen.getByText('Alex Shop'));
      fireEvent.press(screen.getByText('Скрыть'));
      expect(Alert.alert).toHaveBeenCalledWith('Скрыть чаты?', expect.stringContaining('1'), expect.any(Array));

      const buttons = Alert.alert.mock.calls[0][2];
      // «Отмена» ничего не делает.
      expect(buttons[0]).toMatchObject({ text: 'Отмена', style: 'cancel' });
      expect(screen.getByText('Alex Shop')).toBeTruthy();

      await act(async () => { buttons[1].onPress(); });
      expect(screen.queryByText('Alex Shop')).toBeNull();
      expect(JSON.parse(await AsyncStorage.getItem('arvell.chats.hidden'))).toEqual(['c1']);
    });

    it('Скрытый чат не возвращается при повторной загрузке', async () => {
      await AsyncStorage.setItem('arvell.chats.hidden', JSON.stringify(['c1']));
      render(<ChatScreen navigation={navigation} />);
      expect(await screen.findByText('Brand Store')).toBeTruthy();
      expect(screen.queryByText('Alex Shop')).toBeNull();
    });
  });

  describe('ЧАТЫ И ПЕРЕПИСКА', () => {
    const fromList = { params: { conversationId: 'c1', name: 'Alex Shop', rating: 4.8 } };
    const messages = [
      { id: 'm1', sender_id: 's-owner', body: 'Здравствуйте!', created_at: new Date().toISOString() },
      { id: 'm2', sender_id: 'u1', body: 'Добрый день', created_at: new Date().toISOString() },
      { id: 'm3', sender_id: 's-owner', body: '/media/files/look.jpg', created_at: new Date().toISOString() },
    ];
    const messageInput = () => screen.getByPlaceholderText(/Сообщение\.\.\.|Подпись к фото\.\.\./);

    const renderConversation = async (route = fromList) => {
      render(<ConversationScreen navigation={navigation} route={route} />);
      await waitFor(() => expect(screen.queryByText('Загружаем переписку...')).toBeNull());
    };

    const attachPhoto = async (uri = 'file:///local.jpg') => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
      fireEvent.press(screen.getByLabelText('Прикрепить фото'));
      await waitFor(() => expect(getImage(uri)).toBeTruthy());
    };

    it('Загружает переписку и отмечает её прочитанной', async () => {
      chatApi.listMessages.mockResolvedValue({ data: messages });
      await renderConversation();
      expect(screen.getByText('Здравствуйте!')).toBeTruthy();
      expect(screen.getByText('Добрый день')).toBeTruthy();
      expect(chatApi.listMessages).toHaveBeenCalledWith('c1', { limit: 100 });
      expect(chatApi.markConversationRead).toHaveBeenCalledWith('c1');
    });

    it('Из «Купить»: открывает диалог по товару и показывает карточку', async () => {
      const product = { id: 'p1', title: 'Air Max 90', brand: { name: 'Nike' }, price_minor: 890000, size_value: '42', condition: 'new' };
      await renderConversation({ params: { name: 'Alex Shop', product, fromBuy: true } });
      expect(chatApi.openConversation).toHaveBeenCalledWith('p1');
      expect(chatApi.listMessages).toHaveBeenCalledWith('c-new', { limit: 100 });
      expect(screen.getByText(/Вы нажали «Купить»/)).toBeTruthy();
      expect(screen.getByText('Nike Air Max 90')).toBeTruthy();
    });

    it('Чат с поддержкой без товара — понятное сообщение', async () => {
      await renderConversation({ params: { name: 'Поддержка ARVELL', rating: 5 } });
      expect(screen.getByText(/Этот диалог пока недоступен/)).toBeTruthy();
    });

    it('Conversation: стрелка назад', async () => {
      await renderConversation();
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it(t('Conversation: иконка телефона -> звонок', 'Conversation: иконка телефона'), async () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      await renderConversation({ params: { ...fromList.params, phone: '+79990001122' } });
      fireEvent.press(screen.getByLabelText('Позвонить'));
      expect(Alert.alert).toHaveBeenCalledWith('Alex Shop', '+79990001122', expect.any(Array));
      Alert.alert.mock.calls[0][2][1].onPress();
      expect(openURL).toHaveBeenCalledWith('tel:+79990001122');
    });

    it('Conversation: иконка телефона скрыта, пока у продавца нет номера', async () => {
      await renderConversation();
      expect(screen.queryByLabelText('Позвонить')).toBeNull();
    });

    it(t('Conversation: иконка вложения -> фото', 'Conversation: иконка вложения'), async () => {
      await renderConversation();
      await attachPhoto();
      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(screen.getByPlaceholderText('Подпись к фото...')).toBeTruthy();
    });

    it('Conversation: вложение без доступа к галерее -> алерт', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
      await renderConversation();
      fireEvent.press(screen.getByLabelText('Прикрепить фото'));
      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Нет доступа к фото', expect.any(String)));
      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('Conversation: «x» на превью фото', async () => {
      await renderConversation();
      await attachPhoto();
      fireEvent.press(screen.getByLabelText('Убрать фото'));
      expect(queryImage('file:///local.jpg')).toBeNull();
      expect(screen.getByPlaceholderText('Сообщение...')).toBeTruthy();
    });

    it(t('Conversation: поле ввода сообщения', 'Conversation: поле ввода'), async () => {
      await renderConversation();
      expect(messageInput().props.value).toBe('');
      fireEvent.changeText(messageInput(), 'Привет');
      expect(messageInput().props.value).toBe('Привет');
    });

    it('Conversation: кнопка отправки', async () => {
      await renderConversation();
      // Пустое сообщение не отправляется.
      fireEvent.press(screen.getByLabelText('Отправить'));
      expect(chatApi.sendMessage).not.toHaveBeenCalled();

      fireEvent.changeText(messageInput(), '  Ещё продаёте?  ');
      fireEvent.press(screen.getByLabelText('Отправить'));
      await waitFor(() => expect(chatApi.sendMessage).toHaveBeenCalledWith('c1', 'Ещё продаёте?'));
      expect(await screen.findByText('Ещё продаёте?')).toBeTruthy();
      expect(messageInput().props.value).toBe('');
    });

    it('Conversation: отправка фото с подписью', async () => {
      await renderConversation();
      await attachPhoto();
      fireEvent.changeText(messageInput(), 'Вот так');
      fireEvent.press(screen.getByLabelText('Отправить'));
      await waitFor(() => expect(chatApi.sendMessage).toHaveBeenCalledTimes(2));
      expect(uploadImage).toHaveBeenCalledWith({ uri: 'file:///local.jpg', contentType: 'image/jpeg' });
      expect(chatApi.sendMessage).toHaveBeenNthCalledWith(1, 'c1', '/media/files/photo.jpg');
      expect(chatApi.sendMessage).toHaveBeenNthCalledWith(2, 'c1', 'Вот так');
    });

    it('Conversation: ошибка отправки -> алерт, текст возвращается в поле', async () => {
      chatApi.sendMessage.mockRejectedValue(new Error('Нет сети'));
      await renderConversation();
      fireEvent.changeText(messageInput(), 'Потеряться не должно');
      fireEvent.press(screen.getByLabelText('Отправить'));
      await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Не отправлено', 'Нет сети'));
      expect(messageInput().props.value).toBe('Потеряться не должно');
    });

    it('Conversation: тап по фото -> полный экран', async () => {
      chatApi.listMessages.mockResolvedValue({ data: messages });
      await renderConversation();
      expect(screen.queryByLabelText('Закрыть фото')).toBeNull();
      fireEvent.press(screen.getByLabelText('Открыть фото'));
      expect(screen.getByLabelText('Закрыть фото')).toBeTruthy();
      expect(screen.getByLabelText('Просмотр фото')).toBeTruthy();
    });

    it(t('Полный экран -> «x» / тап закрыть', 'Полный экран -> закрыть'), async () => {
      chatApi.listMessages.mockResolvedValue({ data: messages });
      await renderConversation();
      fireEvent.press(screen.getByLabelText('Открыть фото'));
      fireEvent.press(screen.getByLabelText('Закрыть фото'));
      expect(screen.queryByLabelText('Закрыть фото')).toBeNull();
      // Одиночный тап по фото тоже закрывает просмотр.
      fireEvent.press(screen.getByLabelText('Открыть фото'));
      fireEvent.press(screen.getByLabelText('Просмотр фото'));
      expect(screen.queryByLabelText('Закрыть фото')).toBeNull();
      // Системная «Назад» на Android тоже закрывает просмотр.
      fireEvent.press(screen.getByLabelText('Открыть фото'));
      fireEvent(screen.UNSAFE_getByProps({ animationType: 'fade', statusBarTranslucent: true }), 'requestClose');
      expect(screen.queryByLabelText('Закрыть фото')).toBeNull();
    });
  });
});
