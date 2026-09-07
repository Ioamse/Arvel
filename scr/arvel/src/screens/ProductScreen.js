import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, ShareIcon, StarIcon, ChatIcon, HeartIcon, TeeIcon } from '../components/Icons';
import { getProduct } from '../api/products';
import { useFavorites } from '../context/FavoritesContext';
import { useAppConfig, labelFor } from '../context/AppConfigContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/price';
import { resolveMediaUrl } from '../utils/media';

export default function ProductScreen({ navigation, route }) {
  const id = route?.params?.id;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { conditions } = useAppConfig();
  const { isLoggedIn } = useAuth();

  // Покупка и переписка с продавцом доступны только вошедшим — гостя
  // отправляем на авторизацию вместо открытия чата.
  const openConversation = (fromBuy) => {
    if (!isLoggedIn) {
      navigation.navigate('Auth');
      return;
    }
    navigation.navigate('Conversation', {
      name: shop?.shop_name || 'Продавец',
      rating: shop?.rating,
      phone: shop?.phone,
      product,
      fromBuy,
    });
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
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable style={styles.buyBtn} onPress={() => openConversation(true)}>
          <Text style={styles.buyText}>Купить</Text>
        </Pressable>
        <Pressable style={styles.chatBtn} onPress={() => openConversation(false)}>
          <ChatIcon size={24} color={colors.text} />
        </Pressable>
      </SafeAreaView>
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
