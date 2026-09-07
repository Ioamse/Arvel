import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, UserIcon, CameraIcon, ImageIcon, CloseIcon } from '../components/Icons';
import KeyboardAware from '../components/KeyboardAware';
import ShieldIcon from '../components/ShieldIcon';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

// Сумка для роли «Я покупатель» — как на макете
function BagIcon({ size = 22, color = colors.accentText }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8h14l-1 12H6L5 8z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 10V6a3 3 0 016 0v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function RoleRow({ active, onPress, icon, title, subtitle }) {
  return (
    <Pressable style={[styles.role, active && styles.roleActive]} onPress={onPress}>
      <View style={[styles.roleIcon, active && styles.roleIconActive]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleSub}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, active && styles.radioActive]}>
        {active && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

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

export default function ProfileSetupScreen({ navigation }) {
  const {
    pendingPhone,
    completeOnboarding, sellerAcceptInvite, sellerComplete,
  } = useAuth();

  // Не подставляем pendingUser.display_name сюда: бэкенд возвращает туда
  // номер телефона по умолчанию, если имя не было передано при регистрации
  // (в этом флоу его собираем только здесь) — поле должно быть пустым.
  const [name, setName] = useState('');
  const [role, setRole] = useState('buyer');
  const [invite, setInvite] = useState('');
  const [shopName, setShopName] = useState('');
  // Локальный превью-URI аватара. Реальная загрузка на сервер (POST
  // /media/uploads) — отдельная задача, аватар пока не сохраняется в профиле.
  const [avatar, setAvatar] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false); // шторка выбора фото

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  // Продавец: после accept-invite бэкенд шлёт отдельный SMS-код именно для
  // подтверждения продавца — показываем компактный шаг ввода кода прямо
  // на этом же экране, не уходя на отдельный роут.
  const [sellerOtpStep, setSellerOtpStep] = useState(false);
  const [sellerCode, setSellerCode] = useState('');

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

  // --- Код приглашения ---
  // Токен непрозрачный и выдаётся бэкендом (см. admin.createSellerInvite) —
  // на клиенте только убираем случайные пробелы по краям при вставке,
  // без ограничения длины и формата. Действителен ли код на самом деле —
  // знает только бэкенд, узнаём это по ответу accept-invite.

  const inviteFilled = invite.trim().length > 0;

  const canSubmitForm =
    name.trim().length > 0 && (!isSeller || (inviteFilled && shopName.trim().length > 0));
  const canConfirmSellerCode = sellerCode.length === 4;

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

  const submitSellerInvite = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await sellerAcceptInvite(invite, pendingPhone);
      setSellerOtpStep(true);
    } catch (e) {
      setFormError(e.message || 'Не удалось проверить код приглашения. Проверьте его у продавца.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSellerCode = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await sellerComplete({
        inviteToken: invite,
        code: sellerCode,
        shopName: shopName.trim(),
        displayName: name.trim(),
      });
    } catch (e) {
      setFormError(e.message || 'Неверный код. Попробуйте ещё раз.');
      setSellerCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const onFinishPress = () => {
    if (isSeller) {
      if (sellerOtpStep) confirmSellerCode();
      else submitSellerInvite();
    } else {
      submitBuyer();
    }
  };

  const canFinish = isSeller
    ? (sellerOtpStep ? canConfirmSellerCode : canSubmitForm)
    : canSubmitForm;

  const finishTitle = isSeller
    ? (sellerOtpStep ? 'Подтвердить код' : 'Отправить код продавцу')
    : 'Завершить';

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

        {sellerOtpStep ? (
          <>
            <Text style={styles.label}>Код из SMS</Text>
            <Text style={styles.note}>
              Отправили код на {pendingPhone} для подтверждения продавца.
            </Text>
            <TextInput
              style={[styles.input, { marginTop: spacing.sm, letterSpacing: 6, textAlign: 'center' }]}
              placeholder="0000"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              value={sellerCode}
              onChangeText={(t) => setSellerCode(t.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
            />
            {formError && <Text style={styles.error}>{formError}</Text>}
            <Pressable onPress={() => { setSellerOtpStep(false); setSellerCode(''); setFormError(null); }}>
              <Text style={styles.backLink}>Изменить код приглашения</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>Введите имя</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите имя"
              placeholderTextColor={colors.textFaint}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { marginTop: spacing.lg }]}>Кто вы на ARVELL?</Text>

            <RoleRow
              active={role === 'buyer'}
              onPress={() => setRole('buyer')}
              icon={<BagIcon size={22} color={role === 'buyer' ? colors.accentText : colors.textMuted} />}
              title="Я покупатель"
              subtitle="Просматриваю и покупаю товары"
            />
            <RoleRow
              active={role === 'seller'}
              onPress={() => setRole('seller')}
              icon={<ShieldIcon size={22} color={role === 'seller' ? colors.accentText : colors.textMuted} filled={role === 'seller'} />}
              title="Я продавец"
              subtitle="Только по приглашению"
            />

            {isSeller && (
              <>
                <Text style={[styles.label, { marginTop: spacing.lg }]}>Код приглашения</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Код приглашения от продавца"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={invite}
                  onChangeText={(t) => setInvite(t.trim())}
                  onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
                />
                <Text style={styles.note}>
                  Продавцы регистрируются только по приглашению. Код можно получить у
                  действующего продавца ARVELL.
                </Text>

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
          </>
        )}
      </ScrollView>

      {/* Футер внутри KeyboardAware: на Android поднимается вместе с клавиатурой */}
      <View style={styles.footer}>
        <PrimaryButton
          title={submitting ? 'Подождите...' : finishTitle}
          disabled={!canFinish || submitting}
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

  role: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: 'transparent',
    padding: spacing.md, marginBottom: spacing.sm,
  },
  roleActive: { borderColor: colors.accent },
  roleIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  roleIconActive: { backgroundColor: colors.accent },
  roleTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  roleSub: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },

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
