import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, StarIcon, PhoneCallIcon, SendIcon, TeeIcon } from '../components/Icons';
import KeyboardAware from '../components/KeyboardAware';
import { formatPrice } from '../utils/price';
import { useAppConfig, labelFor } from '../context/AppConfigContext';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../context/ConversationsContext';
import { getConversation, listMessages, sendMessage, markConversationRead } from '../api/conversations';
import { createPurchaseConfirmation } from '../api/purchases';

export default function ConversationScreen({ navigation, route }) {
  const { conditions } = useAppConfig();
  const { user } = useAuth();
  const { refresh: refreshConversations } = useConversations();
  const conversationId = route?.params?.conversationId;
  const fromBuy = route?.params?.fromBuy || false;
  const isSeller = user?.role === 'seller';

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmingPurchase, setConfirmingPurchase] = useState(false);
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getConversation(conversationId), listMessages(conversationId, { limit: 100 })])
      .then(([conv, page]) => {
        if (cancelled) return;
        setConversation(conv);
        setMessages(page.data || []);
      })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Открытие диалога считает все обращённые к нам сообщения прочитанными —
    // обновляем и бейдж вкладки «Чат», и список чатов сразу после.
    markConversationRead(conversationId)
      .then(() => refreshConversations())
      .catch(() => {});
    return () => { cancelled = true; };
  }, [conversationId]);

  const other = isSeller ? conversation?.buyer : conversation?.seller;
  const name = other?.display_name || other?.shop_name || 'Пользователь';
  const rating = !isSeller ? conversation?.seller?.rating : null;
  const phone = !isSeller ? conversation?.seller?.phone : null;
  const product = conversation?.product;

  const initial = name.trim()[0]?.toUpperCase() || '?';
  const brandLabel = product?.brand?.name || '';
  const sizeLabel = product?.size_value || (product?.size_system === 'one_size' ? 'One size' : '—');
  const conditionLabel = product ? labelFor(conditions, product.condition) : '';

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await sendMessage(conversationId, body);
      setMessages((m) => [...m, message]);
      setText('');
      refreshConversations();
      setTimeout(() => feedRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      Alert.alert('Не удалось отправить', e.message || 'Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

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

  const onConfirmPurchase = () => {
    Alert.alert(
      'Подтвердить продажу?',
      `${brandLabel} ${product?.title} — покупатель ${name}. Это откроет покупателю возможность оставить отзыв на товар.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Подтвердить',
          onPress: async () => {
            setConfirmingPurchase(true);
            try {
              await createPurchaseConfirmation({ buyerId: conversation.buyer.id, productId: product.id });
              setPurchaseConfirmed(true);
            } catch (e) {
              Alert.alert('Не удалось подтвердить', e.message || 'Попробуйте ещё раз.');
            } finally {
              setConfirmingPurchase(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error || !conversation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
            <BackIcon size={24} />
          </Pressable>
        </View>
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={styles.errorTitle}>Не удалось открыть чат</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          {rating != null && (
            <View style={styles.ratingRow}>
              <StarIcon size={14} />
              <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {!isSeller && (
          <Pressable hitSlop={8} onPress={onCallPress}>
            <PhoneCallIcon size={22} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

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
            <Pressable
              style={styles.productCard}
              onPress={() => navigation.navigate('Product', { id: product.id })}
            >
              <View style={styles.productTop}>
                <View style={styles.productImg}><TeeIcon size={48} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productTitle}>{brandLabel} {product.title}</Text>
                  <Text style={styles.productSub}>{sizeLabel} · {conditionLabel}</Text>
                  <Text style={styles.productPrice}>{formatPrice(product.price_minor)} ₽</Text>
                </View>
              </View>
              {isSeller && (
                purchaseConfirmed ? (
                  <View style={styles.statusBar}>
                    <Text style={styles.statusText}>Продажа подтверждена</Text>
                  </View>
                ) : (
                  <Pressable
                    style={styles.confirmBtn}
                    onPress={onConfirmPurchase}
                    disabled={confirmingPurchase}
                  >
                    <Text style={styles.confirmBtnText}>
                      {confirmingPurchase ? 'Подтверждение...' : 'Подтвердить продажу'}
                    </Text>
                  </Pressable>
                )
              )}
            </Pressable>
          )}

          {messages.map((m) => {
            const out = m.sender_id === user?.id;
            return (
              <View key={m.id} style={{ alignItems: out ? 'flex-end' : 'flex-start' }}>
                <View style={[styles.bubble, out ? styles.bubbleOut : styles.bubbleIn]}>
                  <Text style={[styles.bubbleText, out && { color: colors.accentText }]}>
                    {m.body}
                  </Text>
                </View>
                <Text style={styles.time}>
                  {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.inputBarSafe}>
          <View style={styles.inputBar}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Сообщение..."
                placeholderTextColor={colors.textMuted}
                value={text}
                onChangeText={setText}
                multiline
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                !text.trim() && styles.sendBtnDisabled,
                pressed && styles.btnPressed,
              ]}
              onPress={send}
              disabled={!text.trim() || sending}
            >
              <SendIcon size={19} color={text.trim() ? colors.accentText : colors.textFaint} />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAware>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800' },
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
  statusBar: { alignItems: 'center', backgroundColor: 'rgba(52,199,89,0.12)', paddingVertical: spacing.sm },
  statusText: { color: colors.success, fontSize: font.sizeSM, fontWeight: '700' },
  confirmBtn: { alignItems: 'center', backgroundColor: colors.accent, paddingVertical: spacing.sm },
  confirmBtnText: { color: colors.accentText, fontSize: font.sizeSM, fontWeight: '800' },

  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleIn: { backgroundColor: colors.surface },
  bubbleOut: { backgroundColor: colors.accent },
  bubbleText: { color: colors.text, fontSize: font.sizeMD, lineHeight: 24 },
  time: { color: colors.textFaint, fontSize: font.sizeXS, marginTop: 4 },

  inputBarSafe: {
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
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
});
