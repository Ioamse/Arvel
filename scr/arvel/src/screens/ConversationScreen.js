import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image, Alert, Linking, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import {
  BackIcon, StarIcon, PhoneCallIcon, SendIcon, ImageIcon,
  TeeIcon, SneakerIcon, CloseIcon,
} from '../components/Icons';
import KeyboardAware from '../components/KeyboardAware';
import ZoomableImage from '../components/ZoomableImage';
import { useAppConfig, useMoney, labelFor } from '../context/AppConfigContext';
import { useAuth } from '../context/AuthContext';
import { useChatUnread } from '../context/ChatUnreadContext';
import {
  openConversation, listMessages, sendMessage, markConversationRead,
} from '../api/chat';
import { uploadImage } from '../api/media';
import { resolveMediaUrl } from '../utils/media';
import { formatTime, isImageBody } from '../utils/chatFormat';

export default function ConversationScreen({ navigation, route }) {
  const { conditions } = useAppConfig();
  const money = useMoney();
  const name = route?.params?.name || 'Продавец';
  const rating = route?.params?.rating ?? 4.9;
  const phone = route?.params?.phone || null;
  const product = route?.params?.product || null;   // если пришли из «Купить»
  const fromBuy = route?.params?.fromBuy || false;

  const initial = name.trim()[0]?.toUpperCase() || 'A';
  const Ph = product?.kind === 'sneaker' ? SneakerIcon : TeeIcon;
  const productThumb = resolveMediaUrl(product?.thumbnail_url || product?.images?.[0]?.url);

  // product может прийти в двух формах: реальный товар с бэкенда
  // (brand — объект {name}, price_minor — копейки, size_value/size_system,
  // condition — код) или локальный мок (brand — строка, price — рубли, size — строка)
  const brandLabel = product ? (typeof product.brand === 'string' ? product.brand : product.brand?.name) || '' : '';
  const sizeLabel = product ? (product.size_value || product.size || (product.size_system === 'one_size' ? 'One size' : '—')) : '';
  const conditionLabel = product ? (product.price_minor != null ? labelFor(conditions, product.condition) : product.condition) : '';
  const priceLabel = product
    ? (product.price_minor != null ? money.formatMinor(product.price_minor) : (product.price != null ? money.formatMajor(product.price) : '—'))
    : '';

  // Поле ввода начинается пустым — без заготовленной фразы
  const [text, setText] = useState('');
  // Переписка приходит с бэкенда: раньше она лежала в состоянии экрана и
  // исчезала при выходе из диалога, хотя сервер её хранит.
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);
  // Диалог либо открыт из списка (id уже известен), либо заводится по товару
  // со страницы «Купить» — POST /conversations идемпотентен и вернёт
  // существующую ветку, если она уже есть.
  const [conversationId, setConversationId] = useState(route?.params?.conversationId || null);
  const { user } = useAuth();
  const { refresh: refreshUnread } = useChatUnread();
  const feedRef = useRef(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      let id = route?.params?.conversationId || null;
      if (!id && product?.id) {
        const conv = await openConversation(product.id);
        id = conv.id;
      }
      if (!id) {
        // Переписка без товара (например поддержка) бэкендом не поддержана:
        // диалоги заводятся только по конкретному товару.
        setLoadError('Этот диалог пока недоступен — переписка открывается со страницы товара.');
        return;
      }
      setConversationId(id);
      const res = await listMessages(id, { limit: 100 });
      setMessages(res?.data ?? []);
      markConversationRead(id).then(refreshUnread).catch(() => {});
    } catch (e) {
      setLoadError(e?.message || 'Не удалось загрузить переписку.');
    } finally {
      setLoading(false);
    }
  }, [route?.params?.conversationId, product?.id, refreshUnread]);

  useEffect(() => { load(); }, [load]);
  const [viewerImage, setViewerImage] = useState(null);
  // Фото, выбранное, но ещё не отправленное — показываем превью над полем
  // ввода, чтобы можно было добавить подпись перед отправкой (как в
  // WhatsApp/Telegram), а не отправлять картинку сразу без текста.
  const [pendingImage, setPendingImage] = useState(null);

  const send = async () => {
    const t = text.trim();
    if ((!t && !pendingImage) || !conversationId || sending) return;
    const image = pendingImage;
    setText('');
    setPendingImage(null);
    setSending(true);
    try {
      // Фото уезжает в хранилище тем же путём, что и картинки товаров, а в
      // сообщение попадает ссылка: отдельного поля под вложение у /messages
      // нет, тело сообщения — единственное, что принимает бэкенд.
      const sent = [];
      if (image) {
        const url = await uploadImage({ uri: image, contentType: 'image/jpeg' });
        sent.push(await sendMessage(conversationId, url));
      }
      if (t) sent.push(await sendMessage(conversationId, t));
      setMessages((m) => [...m, ...sent]);
      setTimeout(() => feedRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      // Возвращаем написанное в поле, чтобы ничего не пропало
      setText((cur) => cur || t);
      setPendingImage(image);
      Alert.alert('Не отправлено', e?.message || 'Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Нет доступа к фото',
        'Разрешите доступ к галерее в настройках, чтобы отправить фото.',
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (res.canceled) return;
    setPendingImage(res.assets[0].uri);
  };

  // Продавец пока не отдаёт номер телефона через API (только имя магазина и
  // рейтинг) — как только бэкенд добавит поле, кнопка сразу заработает.
  // До тех пор явно сообщаем, что номера нет, вместо того чтобы молчать.
  const onCallPress = () => {
    if (!phone) {
      Alert.alert('Номер недоступен', 'Продавец пока не указал номер телефона для звонков.');
      return;
    }
    Alert.alert(name, phone, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Позвонить', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Шапка */}
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.ratingRow}>
            <StarIcon size={14} />
            <Text style={styles.rating}>{rating.toFixed(1)}</Text>
          </View>
        </View>
        {/* Бэкенд пока не отдаёт номер телефона продавца — кнопка звонка
            вела только к алерту «Номер недоступен» на каждый тап, что
            выглядело как сломанная функция. Скрываем её до появления
            номера в API, а не оставляем нерабочей. */}
        {!!phone && (
          <Pressable hitSlop={8} onPress={onCallPress}>
            <PhoneCallIcon size={22} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* KeyboardAware поднимает контент над клавиатурой на обеих платформах
          (на Android — через слушатели клавиатуры, т.к. включён edge-to-edge) */}
      <KeyboardAware dismissOnTap={false}>
        <ScrollView
          ref={feedRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.feed}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => feedRef.current?.scrollToEnd({ animated: false })}
        >
          {fromBuy && (
            <View style={styles.system}>
              <Text style={styles.systemBrand}>ARVELL</Text>
              <Text style={styles.systemText}>
                Вы нажали «Купить». Напишите продавцу, чтобы договориться о деталях.
                Оплата — при встрече с продавцом.
              </Text>
            </View>
          )}

          {product && (
            <View style={styles.productCard}>
              <View style={styles.productTop}>
                <View style={styles.productImg}>
                  {productThumb
                    ? <Image source={{ uri: productThumb }} style={styles.productPhoto} />
                    : <Ph size={48} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productTitle}>{brandLabel} {product.title}</Text>
                  <Text style={styles.productSub}>{sizeLabel} · {conditionLabel}</Text>
                  <Text style={styles.productPrice}>{priceLabel}</Text>
                </View>
              </View>
            </View>
          )}

          {loading && <Text style={styles.hint}>Загружаем переписку...</Text>}
          {!!loadError && <Text style={styles.hint}>{loadError}</Text>}

          {messages.map((m) => {
            const mine = !!user?.id && m.sender_id === user.id;
            const imageUri = isImageBody(m.body) ? resolveMediaUrl(m.body) : null;
            return (
              <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                {imageUri ? (
                  <View style={styles.imageMsg}>
                    <Pressable onPress={() => setViewerImage(imageUri)}>
                      <Image source={{ uri: imageUri }} style={styles.bubbleImage} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={[styles.bubble, mine ? styles.bubbleOut : styles.bubbleIn]}>
                    <Text style={[styles.bubbleText, mine && { color: colors.accentText }]}>
                      {m.body}
                    </Text>
                  </View>
                )}
                <Text style={styles.time}>{formatTime(m.created_at)}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Поле ввода */}
        <SafeAreaView edges={['bottom']} style={styles.inputBarSafe}>
          {pendingImage && (
            <View style={styles.previewRow}>
              <Image source={{ uri: pendingImage }} style={styles.previewImage} />
              <Pressable hitSlop={8} style={styles.previewRemove} onPress={() => setPendingImage(null)}>
                <CloseIcon size={14} color={colors.text} />
              </Pressable>
            </View>
          )}
          <View style={styles.inputBar}>
            <Pressable hitSlop={8} style={({ pressed }) => [styles.attachBtn, pressed && styles.btnPressed]} onPress={pickImage}>
              <ImageIcon size={22} color={colors.textMuted} />
            </Pressable>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder={pendingImage ? 'Подпись к фото...' : 'Сообщение...'}
                placeholderTextColor={colors.textMuted}
                value={text}
                onChangeText={setText}
                multiline
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                !text.trim() && !pendingImage && styles.sendBtnDisabled,
                pressed && styles.btnPressed,
              ]}
              onPress={send}
              disabled={(!text.trim() && !pendingImage) || !conversationId || sending}
            >
              <SendIcon size={19} color={(text.trim() || pendingImage) ? colors.accentText : colors.textFaint} />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAware>

      {/* Просмотр отправленной фотографии на весь экран, с приближением */}
      <Modal
        visible={!!viewerImage}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewerImage(null)}
      >
        <View style={styles.viewerOverlay}>
          {viewerImage && (
            <ZoomableImage
              uri={viewerImage}
              style={styles.viewerImage}
              onSingleTap={() => setViewerImage(null)}
            />
          )}
          <SafeAreaView edges={['top']} style={styles.viewerCloseSafe} pointerEvents="box-none">
            <Pressable hitSlop={10} style={styles.viewerClose} onPress={() => setViewerImage(null)}>
              <CloseIcon size={20} color={colors.text} />
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  name: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rating: { color: colors.textMuted, fontSize: font.sizeSM },

  feed: { padding: spacing.lg, gap: spacing.md },
  system: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.md },
  systemBrand: { color: colors.accent, fontSize: font.sizeSM, fontWeight: '800' },
  systemText: { flex: 1, color: colors.textMuted, fontSize: font.sizeSM, lineHeight: 22, textAlign: 'center' },

  productCard: { borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.lg, overflow: 'hidden' },
  productTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  productImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productPhoto: { width: '100%', height: '100%' },
  productTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  productSub: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
  productPrice: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800', marginTop: 4 },

  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleIn: { backgroundColor: colors.surface },
  bubbleOut: { backgroundColor: colors.accent },
  bubbleText: { color: colors.text, fontSize: font.sizeMD, lineHeight: 24 },
  bubbleImage: { width: 180, height: 180, borderRadius: radius.lg },
  imageMsg: { gap: 4 },
  captionBubble: { maxWidth: 180 },
  time: { color: colors.textFaint, fontSize: font.sizeXS, marginTop: 4 },
  hint: { color: colors.textMuted, fontSize: font.sizeSM, textAlign: 'center', paddingVertical: spacing.md },

  inputBarSafe: {
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm,
  },
  previewImage: { width: 64, height: 64, borderRadius: radius.md },
  previewRemove: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: -11, marginTop: -8,
  },
  attachBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 1,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    minHeight: 42, maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    color: colors.text, fontSize: font.sizeMD,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.surfaceAlt },
  btnPressed: { opacity: 0.7 },

  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  viewerImage: { width: '100%', height: '100%' },
  viewerCloseSafe: {
    position: 'absolute', top: 0, right: 0,
    alignItems: 'flex-end',
  },
  viewerClose: {
    margin: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
});