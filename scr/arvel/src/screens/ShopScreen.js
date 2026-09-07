import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, font } from '../theme';
import { BackIcon, StarIcon } from '../components/Icons';
import ProductCard from '../components/ProductCard';
import { listProducts } from '../api/products';

export default function ShopScreen({ navigation, route }) {
  const { shopId, shopName, rating, ratingCount } = route?.params || {};

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listProducts({ shopId })
      .then((page) => {
        if (!cancelled) setProducts(page.data || []);
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
  }, [shopId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon size={24} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>{shopName || 'Продавец'}</Text>
          {rating != null && (
            <View style={styles.ratingRow}>
              <StarIcon size={14} />
              <Text style={styles.ratingText}>{rating.toFixed(1)} · {ratingCount ?? 0} отзывов</Text>
            </View>
          )}
        </View>
      </View>

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
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text style={styles.empty}>
              {error ? 'Не удалось загрузить товары' : 'У продавца пока нет объявлений'}
            </Text>
          )
        }
      />
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
  shopName: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { color: colors.textMuted, fontSize: font.sizeSM },
  grid: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
