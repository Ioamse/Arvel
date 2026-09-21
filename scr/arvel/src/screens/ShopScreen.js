import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, font, radius } from '../theme';
import { BackIcon, StarIcon } from '../components/Icons';
import ProductCard from '../components/ProductCard';
import { listProducts } from '../api/products';
import { getShop } from '../api/shops';
import { listShopReviews } from '../api/reviews';
import { resolveMediaUrl } from '../utils/media';

export default function ShopScreen({ navigation, route }) {
  const { shopId, shopName: initialName, rating: initialRating, ratingCount: initialRatingCount } = route?.params || {};

  const [shop, setShop] = useState(null);
  const [tab, setTab] = useState('products'); // 'products' | 'reviews'

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);

  useEffect(() => {
    getShop(shopId).then(setShop).catch(() => {});
  }, [shopId]);

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    setProductsError(null);
    listProducts({ shopId })
      .then((page) => { if (!cancelled) setProducts(page.data || []); })
      .catch((e) => { if (!cancelled) setProductsError(e); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [shopId]);

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    setReviewsError(null);
    listShopReviews(shopId, { limit: 20 })
      .then((page) => { if (!cancelled) setReviews(page.data || []); })
      .catch((e) => { if (!cancelled) setReviewsError(e); })
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [shopId]);

  const shopName = shop?.shop_name || initialName || 'Продавец';
  const rating = shop?.rating ?? initialRating;
  const ratingCount = shop?.rating_count ?? initialRatingCount;
  const photoUrl = resolveMediaUrl(shop?.profile_pic_url);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon size={24} />
        </Pressable>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{shopName[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>{shopName}</Text>
          {rating != null && (
            <View style={styles.ratingRow}>
              <StarIcon size={14} />
              <Text style={styles.ratingText}>{rating.toFixed(1)} · {ratingCount ?? 0} отзывов</Text>
            </View>
          )}
        </View>
      </View>

      {!!shop?.description && <Text style={styles.description}>{shop.description}</Text>}

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'products' && styles.tabActive]} onPress={() => setTab('products')}>
          <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>
            Товары{shop?.product_count != null ? ` (${shop.product_count})` : ''}
          </Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'reviews' && styles.tabActive]} onPress={() => setTab('reviews')}>
          <Text style={[styles.tabText, tab === 'reviews' && styles.tabTextActive]}>
            Отзывы{ratingCount != null ? ` (${ratingCount})` : ''}
          </Text>
        </Pressable>
      </View>

      {tab === 'products' ? (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('Product', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            productsLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
            ) : (
              <Text style={styles.empty}>
                {productsError ? 'Не удалось загрузить товары' : 'У продавца пока нет объявлений'}
              </Text>
            )
          }
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.reviewsList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.reviewRow}>
              <View style={styles.reviewHead}>
                <Text style={styles.reviewAuthor}>{item.buyer?.display_name || 'Покупатель'}</Text>
                <View style={styles.reviewStars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} size={12} color={i < item.rating ? colors.accent : colors.border} />
                  ))}
                </View>
              </View>
              {!!item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}
            </View>
          )}
          ListEmptyComponent={
            reviewsLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
            ) : (
              <Text style={styles.empty}>
                {reviewsError ? 'Не удалось загрузить отзывы' : 'У продавца пока нет отзывов'}
              </Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  shopName: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { color: colors.textMuted, fontSize: font.sizeSM },
  description: { color: colors.textMuted, fontSize: font.sizeSM, lineHeight: 20, paddingHorizontal: spacing.md, paddingBottom: spacing.md },

  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.textMuted, fontSize: font.sizeSM, fontWeight: '700' },
  tabTextActive: { color: colors.accentText },

  grid: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },

  reviewsList: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  reviewRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewAuthor: { color: colors.text, fontSize: font.sizeSM, fontWeight: '700' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { color: colors.textMuted, fontSize: font.sizeSM, lineHeight: 20, marginTop: 4 },
});
