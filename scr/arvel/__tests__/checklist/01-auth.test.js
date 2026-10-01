// Чек-лист: РЕГИСТРАЦИЯ И ВХОД
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

jest.mock('@react-navigation/native', () => require('../helpers/navMock').module);
jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
jest.mock('../../src/context/AppConfigContext', () => require('../helpers/mockContexts').configModule);
jest.mock('../../src/api/media', () => ({ uploadImage: jest.fn(async () => '/media/files/avatar.jpg') }));
jest.mock('../../src/utils/imageUpload', () => ({
  ...jest.requireActual('../../src/utils/imageUpload'),
  prepareForUpload: jest.fn(async (a) => ({ ...a, contentType: 'image/jpeg' })),
}));

const { createNavigation } = require('../helpers/navMock');
const { setAuth, resetContexts } = require('../helpers/mockContexts');
const { uploadImage } = require('../../src/api/media');
const { getImage, queryImage } = require('../helpers/queries');

import WelcomeScreen from '../../src/screens/WelcomeScreen';
import PhoneScreen from '../../src/screens/PhoneScreen';
import VerifyScreen from '../../src/screens/VerifyScreen';
import ProfileSetupScreen from '../../src/screens/ProfileSetupScreen';
import LegalScreen from '../../src/screens/LegalScreen';

let navigation;
beforeEach(() => {
  resetContexts();
  navigation = createNavigation();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
});

describe('РЕГИСТРАЦИЯ И ВХОД', () => {
  const PHONE_PLACEHOLDER = '+7 (___) ___-__-__';

  describe('WELCOME', () => {
    it('Кнопка «Войти» -> экран ввода телефона', () => {
      render(<WelcomeScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('Войти'));
      expect(navigation.navigate).toHaveBeenCalledWith('Phone');
    });

    it('Ссылка «Условия» (проверить, что вообще кликается)', () => {
      render(<WelcomeScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('Условия'));
      expect(navigation.navigate).toHaveBeenCalledWith('Legal', { doc: 'terms' });
    });

    it('Ссылка «Политика конфиденциальности» (проверить, что вообще кликается)', () => {
      render(<WelcomeScreen navigation={navigation} />);
      fireEvent.press(screen.getByText(/Политику\s+конфиденциальности/));
      expect(navigation.navigate).toHaveBeenCalledWith('Legal', { doc: 'privacy' });
    });

    it('Legal: открывает нужный документ и возвращается назад', () => {
      const { rerender } = render(<LegalScreen navigation={navigation} route={{ params: { doc: 'terms' } }} />);
      expect(screen.getByText('Условия использования')).toBeTruthy();
      rerender(<LegalScreen navigation={navigation} route={{ params: { doc: 'privacy' } }} />);
      expect(screen.getByText('Политика конфиденциальности')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });
  });

  describe('ВВОД ТЕЛЕФОНА (PHONE)', () => {
    const input = () => screen.getByPlaceholderText(PHONE_PLACEHOLDER);
    const submitBtn = () => screen.getByText('Получить код');
    const typeDigits = (digits) => {
      // Имитируем посимвольный ввод, как это делает клавиатура: каждое новое
      // значение = текущее отформатированное поле + одна цифра.
      for (const d of digits) fireEvent.changeText(input(), `${input().props.value}${d}`);
    };

    it('Стрелка «Назад»', () => {
      render(<PhoneScreen navigation={navigation} />);
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('Ввод номера телефона (маска +7 (XXX) XXX-XX-XX)', () => {
      render(<PhoneScreen navigation={navigation} />);
      typeDigits('9991234567');
      expect(input().props.value).toBe('+7 (999) 123-45-67');
      expect(input().props.maxLength).toBe(18);
    });

    it('Ввод номера: ведущая 8 или 7 превращается в префикс +7', () => {
      render(<PhoneScreen navigation={navigation} />);
      fireEvent.changeText(input(), '8');
      expect(input().props.value).toBe('+7');
      fireEvent.changeText(input(), '89991234567');
      expect(input().props.value).toBe('+7 (999) 123-45-67');
    });

    it('Backspace до пустого поля (стирает префикс +7)', () => {
      render(<PhoneScreen navigation={navigation} />);
      typeDigits('999');
      expect(input().props.value).toBe('+7 (999)');
      // Стирание символа маски «)» — удаляет последнюю цифру, а не залипает.
      fireEvent.changeText(input(), '+7 (999');
      expect(input().props.value).toBe('+7 (99');
      fireEvent.changeText(input(), '+7 (9');
      fireEvent.changeText(input(), '+7 (');
      expect(input().props.value).toBe('+7');
      // Стирание самого префикса очищает поле полностью.
      fireEvent.changeText(input(), '+');
      expect(input().props.value).toBe('');
    });

    it('Кнопка «Получить код» (неактивна < 10 цифр)', () => {
      const auth = setAuth();
      render(<PhoneScreen navigation={navigation} />);
      typeDigits('999123456');
      fireEvent.press(submitBtn());
      expect(auth.registerPhone).not.toHaveBeenCalled();
    });

    it('Кнопка «Получить код» (валидный номер) -> Verify', async () => {
      const auth = setAuth();
      render(<PhoneScreen navigation={navigation} />);
      typeDigits('9991234567');
      fireEvent.press(submitBtn());
      await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('Verify', { phone: '+7 (999) 123-45-67' }));
      expect(auth.registerPhone).toHaveBeenCalledWith('+79991234567');
    });

    it('Ошибка отправки кода -> текст под полем', async () => {
      setAuth({ registerPhone: jest.fn(async () => { throw new Error('Слишком много попыток'); }) });
      render(<PhoneScreen navigation={navigation} />);
      typeDigits('9991234567');
      fireEvent.press(submitBtn());
      expect(await screen.findByText('Слишком много попыток')).toBeTruthy();
      expect(navigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('ПОДТВЕРЖДЕНИЕ КОДА (VERIFY)', () => {
    const route = { params: { phone: '+7 (999) 123-45-67' } };
    const codeInput = () => screen.UNSAFE_getByProps({ keyboardType: 'number-pad', maxLength: 4 });

    it('Стрелка «Назад»', () => {
      render(<VerifyScreen navigation={navigation} route={route} />);
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('Ввод 4 цифр кода (авто-проверка)', async () => {
      const auth = setAuth();
      render(<VerifyScreen navigation={navigation} route={route} />);
      fireEvent.changeText(codeInput(), '12');
      expect(auth.verifyCode).not.toHaveBeenCalled();
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      fireEvent.changeText(codeInput(), '1234');
      await waitFor(() => expect(auth.verifyCode).toHaveBeenCalledWith('1234'));
    });

    it('Ввод кода: нецифровые символы отбрасываются', () => {
      const auth = setAuth();
      render(<VerifyScreen navigation={navigation} route={route} />);
      fireEvent.changeText(codeInput(), '1a-2');
      expect(codeInput().props.value).toBe('12');
      expect(auth.verifyCode).not.toHaveBeenCalled();
    });

    it('Неверный код -> ошибка, поле сбрасывается', async () => {
      setAuth({ verifyCode: jest.fn(async () => { throw new Error('Неверный код'); }) });
      render(<VerifyScreen navigation={navigation} route={route} />);
      fireEvent.changeText(codeInput(), '0000');
      expect(await screen.findByText('Неверный код')).toBeTruthy();
      expect(codeInput().props.value).toBe('');
      expect(codeInput().props.editable).toBe(true);
    });

    it('Верный код, новый пользователь -> ProfileSetup', async () => {
      setAuth({ verifyCode: jest.fn(async () => ({ needsOnboarding: true })) });
      render(<VerifyScreen navigation={navigation} route={route} />);
      fireEvent.changeText(codeInput(), '1111');
      await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('ProfileSetup'));
    });

    it('Верный код, существующий -> вход в приложение', async () => {
      // Для существующего аккаунта экран никуда не переходит сам: AuthContext
      // включает isLoggedIn, и модалка входа закрывается (см. RootNavigator).
      const auth = setAuth({ verifyCode: jest.fn(async () => ({ needsOnboarding: false })) });
      render(<VerifyScreen navigation={navigation} route={route} />);
      fireEvent.changeText(codeInput(), '1111');
      await waitFor(() => expect(auth.verifyCode).toHaveBeenCalled());
      expect(navigation.navigate).not.toHaveBeenCalled();
    });

    it('Таймер повторной отправки (30 сек)', () => {
      jest.useFakeTimers();
      render(<VerifyScreen navigation={navigation} route={route} />);
      expect(screen.getByText('Отправить код повторно через 30 с')).toBeTruthy();
      act(() => { jest.advanceTimersByTime(1000); });
      expect(screen.getByText('Отправить код повторно через 29 с')).toBeTruthy();
      for (let i = 0; i < 29; i += 1) act(() => { jest.advanceTimersByTime(1000); });
      expect(screen.queryByText(/через \d+ с/)).toBeNull();
      expect(screen.getByText('Отправить код повторно')).toBeTruthy();
    });

    it('Ссылка «Отправить код повторно» (после 0 сек)', () => {
      jest.useFakeTimers();
      const auth = setAuth();
      render(<VerifyScreen navigation={navigation} route={route} />);
      for (let i = 0; i < 30; i += 1) act(() => { jest.advanceTimersByTime(1000); });
      fireEvent.press(screen.getByText('Отправить код повторно'));
      expect(auth.registerPhone).toHaveBeenCalledWith('+79990001122');
      expect(screen.getByText('Отправить код повторно через 30 с')).toBeTruthy();
    });
  });

  describe('НАСТРОЙКА ПРОФИЛЯ — ОБЩЕЕ', () => {
    const pickedAsset = { uri: 'file:///avatar.jpg', mimeType: 'image/jpeg', fileName: 'avatar.jpg' };

    const openSheet = () => fireEvent.press(screen.getByLabelText('Выбрать фото профиля'));
    const pressOption = async (label) => {
      jest.useFakeTimers();
      fireEvent.press(screen.getByText(label));
      // Действие шторки запускается после закрытия модалки (setTimeout 250).
      await act(async () => { jest.advanceTimersByTime(300); });
      jest.useRealTimers();
      await act(async () => {});
    };

    it('Стрелка «Назад»', () => {
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('Тап по аватару -> шторка выбора фото', () => {
      render(<ProfileSetupScreen navigation={navigation} />);
      expect(screen.queryByText('Сделать фото')).toBeNull();
      openSheet();
      expect(screen.getByText('Фото профиля')).toBeTruthy();
      expect(screen.getByText('Сделать фото')).toBeTruthy();
      expect(screen.getByText('Выбрать из галереи')).toBeTruthy();
    });

    it('Шторка -> «Сделать фото»', async () => {
      ImagePicker.launchCameraAsync.mockResolvedValueOnce({ canceled: false, assets: [pickedAsset] });
      render(<ProfileSetupScreen navigation={navigation} />);
      openSheet();
      await pressOption('Сделать фото');
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      await waitFor(() => expect(getImage(pickedAsset.uri)).toBeTruthy());
    });

    it('Шторка -> «Выбрать из галереи»', async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [pickedAsset] });
      render(<ProfileSetupScreen navigation={navigation} />);
      openSheet();
      await pressOption('Выбрать из галереи');
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      await waitFor(() => expect(getImage(pickedAsset.uri)).toBeTruthy());
    });

    it('Шторка -> «Удалить фото» (если выбран)', async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [pickedAsset] });
      render(<ProfileSetupScreen navigation={navigation} />);
      openSheet();
      expect(screen.queryByText('Удалить фото')).toBeNull();
      await pressOption('Выбрать из галереи');
      await waitFor(() => expect(getImage(pickedAsset.uri)).toBeTruthy());
      openSheet();
      await pressOption('Удалить фото');
      await waitFor(() => expect(queryImage(pickedAsset.uri)).toBeNull());
    });

    it('Шторка -> «Отмена» / тап по фону', () => {
      render(<ProfileSetupScreen navigation={navigation} />);
      openSheet();
      fireEvent.press(screen.getByText('Отмена'));
      expect(screen.queryByText('Сделать фото')).toBeNull();
      openSheet();
      fireEvent(screen.UNSAFE_getByProps({ animationType: 'slide' }), 'requestClose');
      expect(screen.queryByText('Сделать фото')).toBeNull();
    });

    it('Нет доступа к камере/галерее -> алерт', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false });
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
      render(<ProfileSetupScreen navigation={navigation} />);
      openSheet();
      await pressOption('Сделать фото');
      expect(Alert.alert).toHaveBeenCalledWith('Нет доступа к камере', expect.any(String));
      openSheet();
      await pressOption('Выбрать из галереи');
      expect(Alert.alert).toHaveBeenCalledWith('Нет доступа к фото', expect.any(String));
      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    });

    // Проверка «Это фото не подходит» из приложения убрана: любое фото теперь
    // само ужимается под лимиты хранилища (prepareForUpload), поэтому алерта
    // больше нет. Тест фиксирует это поведение — если алерт вернётся, чек-лист
    // и этот тест нужно обновить вместе.
    // Пункт чек-листа устарел: алерта больше нет, любое фото ужимается под
    // лимиты хранилища (prepareForUpload). Пока пункт в таблице не поправят,
    // он числится пропущенным; текущее поведение проверяет тест ниже.
    it.skip('Недопустимое фото -> алерт «Это фото не подходит»', () => {});

    it('Любое фото принимается: ужимается автоматически, без алерта', async () => {
      const huge = { uri: 'file:///huge.heic', mimeType: 'image/heic', width: 8000, height: 6000, fileSize: 30e6 };
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [huge] });
      render(<ProfileSetupScreen navigation={navigation} />);
      openSheet();
      await pressOption('Выбрать из галереи');
      expect(Alert.alert).not.toHaveBeenCalled();
      await waitFor(() => expect(getImage(huge.uri)).toBeTruthy());
    });

    it('Поле «Введите имя»', () => {
      render(<ProfileSetupScreen navigation={navigation} />);
      const input = screen.getByPlaceholderText('Введите имя');
      expect(input.props.value).toBe('');
      fireEvent.changeText(input, 'Анна');
      expect(screen.getByPlaceholderText('Введите имя').props.value).toBe('Анна');
    });

    it('Переключатель «Я покупатель»', () => {
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('Я продавец'));
      fireEvent.press(screen.getByText('Я покупатель'));
      expect(screen.queryByPlaceholderText('Код приглашения от продавца')).toBeNull();
      expect(screen.getByText('Завершить')).toBeTruthy();
    });

    it('Переключатель «Я продавец»', () => {
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('Я продавец'));
      expect(screen.getByPlaceholderText('Код приглашения от продавца')).toBeTruthy();
      expect(screen.getByPlaceholderText('Например, Alex Sneaker Shop')).toBeTruthy();
      expect(screen.getByText('Отправить код продавцу')).toBeTruthy();
    });
  });

  describe('PROFILESETUP — ВЕТКА ПОКУПАТЕЛЬ', () => {
    it('Кнопка «Завершить» (неактивна без имени)', () => {
      const auth = setAuth();
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('Завершить'));
      fireEvent.changeText(screen.getByPlaceholderText('Введите имя'), '   ');
      fireEvent.press(screen.getByText('Завершить'));
      expect(auth.completeOnboarding).not.toHaveBeenCalled();
    });

    it('Кнопка «Завершить» (валидно) -> вход в приложение', async () => {
      const auth = setAuth();
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.changeText(screen.getByPlaceholderText('Введите имя'), '  Анна  ');
      fireEvent.press(screen.getByText('Завершить'));
      await waitFor(() => expect(auth.completeOnboarding).toHaveBeenCalledWith({ display_name: 'Анна' }));
      // После успеха «Назад» заблокирован — модалка закрывается сама.
      fireEvent.press(screen.getByLabelText('Назад'));
      expect(navigation.goBack).not.toHaveBeenCalled();
    });

    it('Кнопка «Завершить»: ошибка сервера показывается текстом', async () => {
      setAuth({ completeOnboarding: jest.fn(async () => { throw new Error('Сервер недоступен'); }) });
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.changeText(screen.getByPlaceholderText('Введите имя'), 'Анна');
      fireEvent.press(screen.getByText('Завершить'));
      expect(await screen.findByText('Сервер недоступен')).toBeTruthy();
    });

    it('Сбой загрузки аватара -> алерт, регистрация без фото', async () => {
      const auth = setAuth();
      uploadImage.mockRejectedValueOnce(new Error('Хранилище недоступно'));
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false, assets: [{ uri: 'file:///a.jpg', mimeType: 'image/jpeg' }],
      });
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.press(screen.getByLabelText('Выбрать фото профиля'));
      jest.useFakeTimers();
      fireEvent.press(screen.getByText('Выбрать из галереи'));
      await act(async () => { jest.advanceTimersByTime(300); });
      jest.useRealTimers();
      await act(async () => {});

      fireEvent.changeText(screen.getByPlaceholderText('Введите имя'), 'Анна');
      fireEvent.press(screen.getByText('Завершить'));
      await waitFor(() => expect(auth.completeOnboarding).toHaveBeenCalledWith({ display_name: 'Анна' }));
      expect(Alert.alert).toHaveBeenCalledWith('Фото не загрузилось', expect.stringContaining('Хранилище недоступно'));
    });

    it('Аватар загружается и уходит в профиль вместе с именем', async () => {
      const auth = setAuth();
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false, assets: [{ uri: 'file:///a.jpg', mimeType: 'image/jpeg' }],
      });
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.press(screen.getByLabelText('Выбрать фото профиля'));
      jest.useFakeTimers();
      fireEvent.press(screen.getByText('Выбрать из галереи'));
      await act(async () => { jest.advanceTimersByTime(300); });
      jest.useRealTimers();
      await act(async () => {});

      fireEvent.changeText(screen.getByPlaceholderText('Введите имя'), 'Анна');
      fireEvent.press(screen.getByText('Завершить'));
      await waitFor(() => expect(auth.completeOnboarding).toHaveBeenCalledWith({
        display_name: 'Анна', profile_pic_url: '/media/files/avatar.jpg',
      }));
    });
  });

  describe('PROFILESETUP — ВЕТКА ПРОДАВЕЦ', () => {
    const fillSellerForm = ({ name = 'Алекс', invite = 'INV-123', shop = 'Alex Shop' } = {}) => {
      fireEvent.changeText(screen.getByPlaceholderText('Введите имя'), name);
      fireEvent.press(screen.getByText('Я продавец'));
      fireEvent.changeText(screen.getByPlaceholderText('Код приглашения от продавца'), invite);
      fireEvent.changeText(screen.getByPlaceholderText('Например, Alex Sneaker Shop'), shop);
    };
    const goToOtp = async (auth) => {
      fillSellerForm();
      fireEvent.press(screen.getByText('Отправить код продавцу'));
      await waitFor(() => expect(auth.sellerAcceptInvite).toHaveBeenCalled());
      await screen.findByText('Код из SMS');
    };

    it('Поле «Код приглашения»', () => {
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('Я продавец'));
      const field = screen.getByPlaceholderText('Код приглашения от продавца');
      fireEvent.changeText(field, '  INV-123  ');
      // Пробелы по краям при вставке убираются.
      expect(screen.getByPlaceholderText('Код приглашения от продавца').props.value).toBe('INV-123');
    });

    it('Поле «Название магазина»', () => {
      render(<ProfileSetupScreen navigation={navigation} />);
      fireEvent.press(screen.getByText('Я продавец'));
      fireEvent.changeText(screen.getByPlaceholderText('Например, Alex Sneaker Shop'), 'Alex Shop');
      expect(screen.getByPlaceholderText('Например, Alex Sneaker Shop').props.value).toBe('Alex Shop');
    });

    it('Кнопка «Отправить код продавцу»', async () => {
      const auth = setAuth();
      render(<ProfileSetupScreen navigation={navigation} />);
      // Пустая форма — кнопка неактивна.
      fireEvent.press(screen.getByText('Я продавец'));
      fireEvent.press(screen.getByText('Отправить код продавцу'));
      expect(auth.sellerAcceptInvite).not.toHaveBeenCalled();

      fillSellerForm();
      fireEvent.press(screen.getByText('Отправить код продавцу'));
      await waitFor(() => expect(auth.sellerAcceptInvite).toHaveBeenCalledWith('INV-123', '+79990001122'));
      expect(await screen.findByText('Код из SMS')).toBeTruthy();
    });

    it('Неверный код приглашения -> ошибка', async () => {
      setAuth({ sellerAcceptInvite: jest.fn(async () => { throw new Error('Приглашение недействительно'); }) });
      render(<ProfileSetupScreen navigation={navigation} />);
      fillSellerForm();
      fireEvent.press(screen.getByText('Отправить код продавцу'));
      expect(await screen.findByText('Приглашение недействительно')).toBeTruthy();
      expect(screen.queryByText('Код из SMS')).toBeNull();
    });

    it('Шаг OTP: поле «Код из SMS» (4 цифры)', async () => {
      const auth = setAuth();
      render(<ProfileSetupScreen navigation={navigation} />);
      await goToOtp(auth);
      const otp = screen.getByPlaceholderText('0000');
      fireEvent.changeText(otp, '12a345');
      expect(screen.getByPlaceholderText('0000').props.value).toBe('1234');
    });

    it('Шаг OTP: ссылка «Изменить код приглашения»', async () => {
      const auth = setAuth();
      render(<ProfileSetupScreen navigation={navigation} />);
      await goToOtp(auth);
      fireEvent.press(screen.getByText('Изменить код приглашения'));
      expect(screen.queryByText('Код из SMS')).toBeNull();
      expect(screen.getByPlaceholderText('Код приглашения от продавца').props.value).toBe('INV-123');
    });

    it('Шаг OTP: кнопка «Подтвердить код» (неактивна < 4 цифр)', async () => {
      const auth = setAuth();
      render(<ProfileSetupScreen navigation={navigation} />);
      await goToOtp(auth);
      fireEvent.changeText(screen.getByPlaceholderText('0000'), '123');
      fireEvent.press(screen.getByText('Подтвердить код'));
      expect(auth.sellerComplete).not.toHaveBeenCalled();
    });

    it('Шаг OTP: кнопка «Подтвердить код» (верный) -> завершение', async () => {
      const auth = setAuth();
      render(<ProfileSetupScreen navigation={navigation} />);
      await goToOtp(auth);
      fireEvent.changeText(screen.getByPlaceholderText('0000'), '1234');
      fireEvent.press(screen.getByText('Подтвердить код'));
      await waitFor(() => expect(auth.sellerComplete).toHaveBeenCalledWith({
        inviteToken: 'INV-123', code: '1234', shopName: 'Alex Shop', displayName: 'Алекс', profilePicUrl: null,
      }));
    });

    it('Шаг OTP: неверный код -> ошибка, поле сбрасывается', async () => {
      const auth = setAuth({ sellerComplete: jest.fn(async () => { throw new Error('Неверный код'); }) });
      render(<ProfileSetupScreen navigation={navigation} />);
      await goToOtp(auth);
      fireEvent.changeText(screen.getByPlaceholderText('0000'), '9999');
      fireEvent.press(screen.getByText('Подтвердить код'));
      expect(await screen.findByText('Неверный код')).toBeTruthy();
      expect(screen.getByPlaceholderText('0000').props.value).toBe('');
    });
  });
});
