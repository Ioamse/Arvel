import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image, Modal, ActivityIndicator, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, ShareIcon, StarIcon, ChatIcon, HeartIcon, TeeIcon } from '../components/Icons';
import { getProduct } from '../api/products';
import { createConversation } from '../api/conversations';
import { listProductReviews, createProductReview } from '../api/reviews';
import { useFavorites } from '../context/FavoritesContext';
import { useAppConfig, labelFor } from '../context/AppConfigContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/price';
import { resolveMediaUrl } from '../utils/media';

function WriteReviewModal({ visible, onClose, onSubmit, submitting }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>Оставить отзыв</Text>
          <View style={styles.starPicker}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Pressable key={i} hitSlop={6} onPress={() => setRating(i + 1)}>
                <StarIcon size={32} color={i < rating ? colors.accent : colors.border} />
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.modalInput}
            placeholder="Комментарий (необязательно)"
            placeholderTextColor={colors.textFaint}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <Pressable
            style={[styles.modalSubmit, (!rating || submitting) && styles.modalSubmitDisabled]}
            disabled={!rating || submitting}
            onPress={() => onSubmit({ rating, comment: comment.trim() || null })}
          >
            <Text style={styles.modalSubmitText}>{submitting ? 'Отправка...' : 'Отправить'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ProductScreen({ navigation, route }) {
  const id = route?.params?.id;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { conditions } = useAppConfig();
  const { isLoggedIn, user } = useAuth();

  // Покупка и переписка с продавцом доступны только вошедшим — гостя
  // отправляем на авторизацию вместо открытия чата. Открытие переписки
  // идемпотентно на бэкенде (POST /conversations возвращает существующий
  // тред для пары продукт+покупатель), поэтому просто создаём/получаем его
  // и переходим по id — сам диалог подтягивает данные самостоятельно.
  const openConversation = async (fromBuy) => {
    if (!isLoggedIn) {
      navigation.navigate('Auth');
      return;
    }
    try {
      const conversation = await createConversation(product.id);
      navigation.navigate('Conversation', { conversationId: conversation.id, fromBuy });
    } catch (e) {
      // 403 бэкенд отдаёт с английским detail ("you do not have permission to
      // do this") — показывать его пользователю бессмысленно. Единственное,
      // за что POST /conversations отвечает отказом, — попытка начать
      // переписку не с роли покупателя или по собственному объявлению.
      Alert.alert(
        'Не удалось открыть чат',
        e.status === 403
          ? 'Переписка доступна покупателю и только по чужому объявлению.'
          : e.message || 'Попробуйте ещё раз.',
      );
    }
  };

  const onLikePress = () => {
    if (!isLoggedIn) {
      navigation.navigate('Auth');
      return;
    }
    toggleFavorite(product.id, product);
  };

  const onSharePress = () => {
    const brand = typeof product.brand === 'string' ? product.brand : product.brand?.name;
    Share.share({
      message: [brand, product.title].filter(Boolean).join(' '),
    }).catch(() => {});
  };

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProduct(id)
      .then((p) => {
        if (!cancelled) setProduct(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    listProductReviews(id, { limit: 10 })
      .then((page) => { if (!cancelled) setReviews(page.data || []); })
      .catch(() => { if (!cancelled) setReviews([]); })
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const submitReview = async ({ rating, comment }) => {
    setSubmittingReview(true);
    try {
      await createProductReview(id, { rating, comment });
      setReviewModalVisible(false);
      // Обновляем и товар (rating/rating_count/viewer_context.can_review
      // станет false), и список отзывов — иначе кнопка осталась бы висеть.
      const [freshProduct, reviewsPage] = await Promise.all([
        getProduct(id),
        listProductReviews(id, { limit: 10 }),
      ]);
      setProduct(freshProduct);
      setReviews(reviewsPage.data || []);
    } catch (e) {
      Alert.alert('Не удалось отправить отзыв', e.message || 'Попробуйте ещё раз.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.safe, styles.center]}>
        <SafeAreaView edges={['top']} style={styles.errorHeader}>
          <Pressable style={styles.roundBtn} hitSlop={8} onPress={() => navigation.goBack()}>
            <BackIcon size={22} />
          </Pressable>
        </SafeAreaView>
        <Text style={styles.errorTitle}>Не удалось загрузить товар</Text>
        <Text style={styles.errorSub}>
          {error?.status === 404 ? 'Товар не найден или уже снят с публикации.' : 'Проверьте соединение и попробуйте ещё раз.'}
        </Text>
      </View>
    );
  }

  // В реальных данных нет поля "kind" (обувь/футболка) — общий плейсхолдер, пока нет фото.
  const Placeholder = TeeIcon;
  const photoUrl = resolveMediaUrl(product.images?.[0]?.url);
  const liked = isFavorite(product.id);
  const brandLabel = product.brand?.name || '';
  const sizeLabel = product.size_value || (product.size_system === 'one_size' ? 'One size' : '—');
  const conditionLabel = labelFor(conditions, product.condition);
  const shop = product.seller;
  // Продавец в принципе не может открыть чат/покупку — POST /conversations
  // доступен только роли user и вернёт 403, независимо от того, чей это
  // товар (см. isSeller в ChatScreen/ConversationScreen/OrdersScreen/
  // AccountScreen — тот же признак).
  const isSeller = user?.role === 'seller';
  // Отдельно от роли: собственное объявление. seller.seller_id — это id
  // ПОЛЬЗОВАТЕЛЯ-владельца магазина (seller.id — id самого магазина,
  // см. GET /shops/{id}). Проверка нужна потому, что на одной только роли
  // полагаться нельзя: если user.role пришёл пустым или устарел в кэше
  // профиля, панель «Купить/Чат» рисовалась на своём же товаре и запрос
  // уходил на сервер только ради 403.
  const isOwnProduct = !!user?.id && product.seller?.seller_id === user.id;
  const canTalkToSeller = !isSeller && !isOwnProduct;

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Фото */}
        <View style={styles.photo}>
          {/* Сама фотография — базовый слой. Раньше рендерилась ПОСЛЕ
              photoBar и, будучи растянутой на весь блок, визуально
              перекрывала собой кнопки Back/Heart/Share (сами кнопки при
              этом оставались кликабельными благодаря pointerEvents="none"
              на фото, но были не видны). Теперь фото снизу, кнопки — сверху. */}
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photoImage} resizeMode="cover" />
          ) : (
            <View style={styles.photoCenter}>
              <Placeholder size={130} />
            </View>
          )}

          <SafeAreaView edges={['top']} style={styles.photoBar}>
            <Pressable style={styles.roundBtn} hitSlop={8} onPress={() => navigation.goBack()}>
              <BackIcon size={22} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable style={styles.roundBtn} hitSlop={8} onPress={onLikePress}>
                <HeartIcon size={20} color={liked ? colors.accent : colors.text} filled={liked} />
              </Pressable>
              <Pressable style={styles.roundBtn} hitSlop={8} onPress={onSharePress}>
                <ShareIcon size={20} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>{brandLabel}</Text>
              <Text style={styles.subtitle}>{product.title}</Text>
            </View>
            {product.rating != null && (
              <View style={styles.ratingRow}>
                <StarIcon size={18} />
                <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.price}>{formatPrice(product.price_minor)} ₽</Text>

          <View style={styles.specs}>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>РАЗМЕР</Text>
              <Text style={styles.specValue}>{sizeLabel}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>СОСТОЯНИЕ</Text>
              <View style={styles.condRow}>
                <View style={styles.greenDot} />
                <Text style={styles.specValue}>{conditionLabel}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Описание</Text>
          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.reviewsHeadRow}>
            <Text style={styles.sectionTitle}>
              Отзывы{product.rating_count ? ` (${product.rating_count})` : ''}
            </Text>
            {product.viewer_context?.can_review && (
              <Pressable onPress={() => setReviewModalVisible(true)}>
                <Text style={styles.writeReviewLink}>Оставить отзыв</Text>
              </Pressable>
            )}
          </View>

          {reviewsLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.noReviews}>Пока нет отзывов</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.reviewRow}>
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewAuthor}>{r.buyer?.display_name || 'Покупатель'}</Text>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} size={12} color={i < r.rating ? colors.accent : colors.border} />
                    ))}
                  </View>
                </View>
                {!!r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              </View>
            ))
          )}

          {shop && (
            <>
              <View style={styles.divider} />
              <Pressable
                style={styles.seller}
                onPress={() => navigation.navigate('Shop', {
                  shopId: shop.id,
                  shopName: shop.shop_name,
                  rating: shop.rating,
                  ratingCount: shop.rating_count,
                })}
              >
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerInitial}>{shop.shop_name?.[0] ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellerName}>{shop.shop_name}</Text>
                  <Text style={styles.sellerDeals}>{shop.rating_count ?? 0} отзывов</Text>
                </View>
                <BackIcon size={20} color={colors.textMuted} />
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      {/* Нижняя панель */}
      {canTalkToSeller && (
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <Pressable style={styles.buyBtn} onPress={() => openConversation(true)}>
            <Text style={styles.buyText}>Купить</Text>
          </Pressable>
          <Pressable style={styles.chatBtn} onPress={() => openConversation(false)}>
            <ChatIcon size={24} color={colors.text} />
          </Pressable>
        </SafeAreaView>
      )}

      <WriteReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={submitReview}
        submitting={submittingReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorHeader: { position: 'absolute', top: 0, left: 0, paddingHorizontal: spacing.md },
  errorTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800', paddingHorizontal: spacing.lg, textAlign: 'center' },
  errorSub: { color: colors.textMuted, fontSize: font.sizeMD, marginTop: spacing.sm, paddingHorizontal: spacing.lg, textAlign: 'center' },

  photo: { height: 420, backgroundColor: colors.surfaceAlt },
  photoBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  roundBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  photoImage: { ...StyleSheet.absoluteFillObject },

  body: { padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  brand: { color: colors.text, fontSize: font.sizeXL, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: font.sizeMD, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  rating: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  price: { color: colors.accent, fontSize: font.sizeXXL, fontWeight: '800', marginTop: spacing.md },

  specs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  specBox: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md,
  },
  specLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  specValue: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700', marginTop: 4 },
  condRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },

  sectionTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '800', marginTop: spacing.lg },
  description: { color: colors.textMuted, fontSize: font.sizeMD, lineHeight: 24, marginTop: spacing.sm },

  reviewsHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  writeReviewLink: { color: colors.accent, fontSize: font.sizeSM, fontWeight: '700', marginTop: spacing.lg },
  noReviews: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: spacing.sm },
  reviewRow: { marginTop: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewAuthor: { color: colors.text, fontSize: font.sizeSM, fontWeight: '700' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { color: colors.textMuted, fontSize: font.sizeSM, lineHeight: 20, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800', textAlign: 'center' },
  starPicker: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
  modalInput: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    color: colors.text, fontSize: font.sizeMD, minHeight: 80, textAlignVertical: 'top',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginTop: spacing.lg,
  },
  modalSubmit: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  modalSubmitDisabled: { backgroundColor: colors.accentDim },
  modalSubmitText: { color: colors.accentText, fontSize: font.sizeMD, fontWeight: '800' },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  seller: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sellerAvatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sellerInitial: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800' },
  sellerName: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  sellerDeals: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
    backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  buyBtn: {
    flex: 1, backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingVertical: 18, alignItems: 'center',
  },
  buyText: { color: colors.accentText, fontSize: font.sizeMD, fontWeight: '800' },
  chatBtn: {
    width: 60, borderRadius: radius.pill, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
});
