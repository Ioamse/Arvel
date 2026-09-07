import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image, Alert, Linking, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import {
  BackIcon, StarIcon, PhoneCallIcon, SendIcon, ImageIcon,
  ClockIcon, TeeIcon, SneakerIcon, CloseIcon,
} from '../components/Icons';
import KeyboardAware from '../components/KeyboardAware';
import ZoomableImage from '../components/ZoomableImage';
import { formatPrice } from '../utils/price';
import { useAppConfig, labelFor } from '../context/AppConfigContext';

export default function ConversationScreen({ navigation, route }) {
  const { conditions } = useAppConfig();
  const name = route?.params?.name || 'Алексей';
  const rating = route?.params?.rating ?? 4.9;
  const phone = route?.params?.phone || null;
  const product = route?.params?.product || null;   // если пришли из «Купить»
  const fromBuy = route?.params?.fromBuy || false;

  const initial = name.trim()[0]?.toUpperCase() || 'A';
  const Ph = product?.kind === 'sneaker' ? SneakerIcon : TeeIcon;

  // product может прийти в двух формах: реальный товар с бэкенда
  // (brand — объект {name}, price_minor — копейки, size_value/size_system,
  // condition — код) или локальный мок (brand — строка, price — рубли, size — строка)
  const brandLabel = product ? (typeof product.brand === 'string' ? product.brand : product.brand?.name) || '' : '';
  const sizeLabel = product ? (product.size_value || product.size || (product.size_system === 'one_size' ? 'One size' : '—')) : '';
  const conditionLabel = product ? (product.price_minor != null ? labelFor(conditions, product.condition) : product.condition) : '';
  const priceLabel = product
    ? (product.price_minor != null ? formatPrice(product.price_minor) : (product.price?.toLocaleString('ru-RU') ?? '—'))
    : '';

  // Поле ввода начинается пустым — без заготовленной фразы
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([
    { id: 'm1', side: 'in', text: `Здравствуйте! ${product ? brandLabel + ' ' + product.title : 'Товар'} — оригинал, состояние отлично.`, time: 'сейчас' },
  ]);
  const feedRef = useRef(null);
  const [viewerImage, setViewerImage] = useState(null);
  // Фото, выбранное, но ещё не отправленное — показываем превью над полем
  // ввода, чтобы можно было добавить подпись перед отправкой (как в
  // WhatsApp/Telegram), а не отправлять картинку сразу без текста.
  const [pendingImage, setPendingImage] = useState(null);

  const send = () => {
    const t = text.trim();
    if (!t && !pendingImage) return;
    setMessages((m) => [
      ...m,
      { id: 'me' + Date.now(), side: 'out', image: pendingImage, text: t || undefined, time: 'сейчас' },
    ]);
    setText('');
    setPendingImage(null);
    // Прокручиваем ленту к последнему сообщению
    setTimeout(() => feedRef.current?.scrollToEnd({ animated: true }), 50);
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
        <Pressable hitSlop={8} onPress={onCallPress}>
          <PhoneCallIcon size={22} color={colors.textMuted} />
        </Pressable>
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
                <View style={styles.productImg}><Ph size={48} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productTitle}>{brandLabel} {product.title}</Text>
                  <Text style={styles.productSub}>{sizeLabel} · {conditionLabel}</Text>
                  <Text style={styles.productPrice}>{priceLabel} ₽</Text>
                </View>
              </View>
              <View style={styles.statusBar}>
                <ClockIcon size={16} color={colors.accent} />
                <Text style={styles.statusText}>Ожидает подтверждения продавца</Text>
              </View>
            </View>
          )}

          {messages.map((m) => (
            <View key={m.id} style={{ alignItems: m.side === 'out' ? 'flex-end' : 'flex-start' }}>
              {m.image ? (
                <View style={styles.imageMsg}>
                  <Pressable onPress={() => setViewerImage(m.image)}>
                    <Image source={{ uri: m.image }} style={styles.bubbleImage} />
                  </Pressable>
                  {!!m.text && (
                    <View style={[styles.bubble, styles.captionBubble, m.side === 'out' ? styles.bubbleOut : styles.bubbleIn]}>
                      <Text style={[styles.bubbleText, m.side === 'out' && { color: colors.accentText }]}>
                        {m.text}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.bubble, m.side === 'out' ? styles.bubbleOut : styles.bubbleIn]}>
                  <Text style={[styles.bubbleText, m.side === 'out' && { color: colors.accentText }]}>
                    {m.text}
                  </Text>
                </View>
              )}
              <Text style={styles.time}>{m.time}</Text>
            </View>
          ))}
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
              disabled={!text.trim() && !pendingImage}
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
  productImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  productTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  productSub: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
  productPrice: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800', marginTop: 4 },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,214,10,0.12)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  statusText: { color: colors.accent, fontSize: font.sizeSM, fontWeight: '700' },

  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleIn: { backgroundColor: colors.surface },
  bubbleOut: { backgroundColor: colors.accent },
  bubbleText: { color: colors.text, fontSize: font.sizeMD, lineHeight: 24 },
  bubbleImage: { width: 180, height: 180, borderRadius: radius.lg },
  imageMsg: { gap: 4 },
  captionBubble: { maxWidth: 180 },
  time: { color: colors.textFaint, fontSize: font.sizeXS, marginTop: 4 },

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