import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, UserIcon, CameraIcon, ImageIcon, CloseIcon } from '../components/Icons';
import KeyboardAware from '../components/KeyboardAware';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

// Строка-опция внутри шторки выбора фото
function SheetOption({ icon, label, sub, danger, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
      onPress={onPress}
    >
      <View style={[styles.sheetIcon, danger && styles.sheetIconDanger]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sheetLabel, danger && { color: colors.danger }]}>{label}</Text>
        {!!sub && <Text style={styles.sheetSub}>{sub}</Text>}
      </View>
    </Pressable>
  );
}

export default function ProfileSetupScreen({ navigation, route }) {
  const { completeOnboarding, sellerComplete } = useAuth();

  // Роль, инвайт и SMS-код приходят с предыдущих экранов: роль и инвайт
  // выбираются на PhoneScreen (от них зависит, каким запросом отправлен код),
  // код — на VerifyScreen. Продавец вводит код ровно один раз: раньше здесь
  // был ещё один шаг ввода кода после accept-invite.
  const role = route?.params?.role === 'seller' ? 'seller' : 'buyer';
  const invite = route?.params?.invite ?? '';
  const smsCode = route?.params?.code ?? '';

  // Не подставляем pendingUser.display_name сюда: бэкенд возвращает туда
  // номер телефона по умолчанию, если имя не было передано при регистрации
  // (в этом флоу его собираем только здесь) — поле должно быть пустым.
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  // Локальный превью-URI аватара. Реальная загрузка на сервер (POST
  // /media/uploads) — отдельная задача, аватар пока не сохраняется в профиле.
  const [avatar, setAvatar] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false); // шторка выбора фото

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const scrollRef = useRef(null);

  const isSeller = role === 'seller';

  // --- Аватар ---

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Нет доступа к фото',
        'Разрешите доступ к галерее в настройках, чтобы выбрать аватар.',
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setAvatar(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Нет доступа к камере',
        'Разрешите доступ к камере в настройках, чтобы сделать фото.',
      );
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setAvatar(res.assets[0].uri);
  };

  // Закрываем шторку и после закрытия запускаем действие.
  // Небольшая задержка нужна, чтобы Modal успел скрыться до открытия
  // нативного пикера — иначе на Android они конфликтуют.
  const runFromSheet = (action) => {
    setSheetVisible(false);
    setTimeout(action, 250);
  };

  const onAvatarPress = () => setSheetVisible(true);

  const canSubmitForm =
    name.trim().length > 0 && (!isSeller || shopName.trim().length > 0);

  const submitBuyer = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await completeOnboarding({ display_name: name.trim() });
      // isLoggedIn переключится в контексте — RootNavigator сам уйдёт на MainTabs.
    } catch (e) {
      setFormError(e.message || 'Не удалось сохранить профиль. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  // Код из SMS до этого момента нигде не тратился — тратим его здесь, вместе
  // с именем и названием магазина, одним POST /auth/seller/complete.
  const submitSeller = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await sellerComplete({
        inviteToken: invite,
        code: smsCode,
        shopName: shopName.trim(),
        displayName: name.trim(),
      });
    } catch (e) {
      setFormError(e.message || 'Не удалось завершить регистрацию. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const onFinishPress = () => (isSeller ? submitSeller() : submitBuyer());

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAware dismissOnTap={false}>
      {/* Шапка: назад слева, заголовок белым по центру — как на макете */}
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Регистрация</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Расскажите о себе</Text>
        <Text style={styles.sub}>Как вас будут видеть другие пользователи</Text>

        {/* Аватар по центру с жёлтым бейджем камеры */}
        <Pressable style={styles.avatarWrap} onPress={onAvatarPress}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <UserIcon size={44} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.camBtn}>
            <CameraIcon size={14} />
          </View>
        </Pressable>

        <Text style={styles.label}>Введите имя</Text>
        <TextInput
          style={styles.input}
          placeholder="Введите имя"
          placeholderTextColor={colors.textFaint}
          value={name}
          onChangeText={setName}
        />

        {isSeller && (
          <>
            <Text style={[styles.label, { marginTop: spacing.lg }]}>Название магазина</Text>
            <TextInput
              style={styles.input}
              placeholder="Например, Alex Sneaker Shop"
              placeholderTextColor={colors.textFaint}
              value={shopName}
              onChangeText={setShopName}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
            />
          </>
        )}

        {formError && <Text style={styles.error}>{formError}</Text>}
        {/* Код мог протухнуть, пока заполнялась форма — даём вернуться за новым. */}
        {isSeller && formError && (
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>Ввести код из SMS заново</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Футер внутри KeyboardAware: на Android поднимается вместе с клавиатурой */}
      <View style={styles.footer}>
        <PrimaryButton
          title={submitting ? 'Подождите...' : 'Завершить'}
          disabled={!canSubmitForm || submitting}
          onPress={onFinishPress}
        />
      </View>
      </KeyboardAware>

      {/* Шторка выбора фото профиля — вместо системного Alert */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setSheetVisible(false)}>
          {/* Тап по самой шторке не закрывает её */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Фото профиля</Text>

            <SheetOption
              icon={<CameraIcon size={20} color={colors.accent} />}
              label="Сделать фото"
              sub="Откроется камера"
              onPress={() => runFromSheet(takePhoto)}
            />
            <View style={styles.sheetDivider} />
            <SheetOption
              icon={<ImageIcon size={20} color={colors.accent} />}
              label="Выбрать из галереи"
              sub="Фото из вашей библиотеки"
              onPress={() => runFromSheet(pickFromLibrary)}
            />

            {avatar && (
              <>
                <View style={styles.sheetDivider} />
                <SheetOption
                  icon={<CloseIcon size={20} color={colors.danger} />}
                  label="Удалить фото"
                  danger
                  onPress={() => runFromSheet(() => setAvatar(null))}
                />
              </>
            )}

            <Pressable
              style={({ pressed }) => [styles.sheetCancel, pressed && { opacity: 0.85 }]}
              onPress={() => setSheetVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Отмена</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  // Белый жирный заголовок по центру — как на макете
  headerTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: font.sizeXXL, fontWeight: '800', marginTop: spacing.sm },
  sub: { color: colors.textMuted, fontSize: font.sizeMD, marginTop: spacing.sm },

  avatarWrap: { alignSelf: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  camBtn: {
    position: 'absolute', right: -2, bottom: -2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.bg,
  },

  label: { color: colors.textMuted, fontSize: font.sizeSM, fontWeight: '600', marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: font.sizeMD,
    paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  error: { color: colors.danger, fontSize: font.sizeSM, marginTop: spacing.sm },
  note: { color: colors.textFaint, fontSize: font.sizeSM, marginTop: spacing.sm, lineHeight: 19 },
  backLink: {
    color: colors.accent, fontSize: font.sizeSM, fontWeight: '600',
    marginTop: spacing.lg, textAlign: 'center',
  },

  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },

  // --- Шторка выбора фото ---
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.text, fontSize: font.sizeLG, fontWeight: '800',
    marginBottom: spacing.sm,
  },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 14,
  },
  sheetRowPressed: { opacity: 0.7 },
  sheetIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetIconDanger: { backgroundColor: 'rgba(255,69,58,0.12)' },
  sheetLabel: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  sheetSub: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
  sheetDivider: { height: 1, backgroundColor: colors.border, marginLeft: 42 + 16 },
  sheetCancel: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetCancelText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
});
