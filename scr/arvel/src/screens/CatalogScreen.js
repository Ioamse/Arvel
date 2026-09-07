import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { SearchIcon } from '../components/Icons';
import ProductCard from '../components/ProductCard';
import { listCategories, listBrands } from '../api/catalog';
import { listProducts } from '../api/products';

export default function CatalogScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [brandIds, setBrandIds] = useState([]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Категории и бренды для чипсов — грузим один раз.
  useEffect(() => {
    listCategories()
      .then((res) => setCategories((res.data || []).filter((c) => !c.parent_id)))
      .catch(() => {});
    listBrands()
      .then((res) => setBrands(res.data || []))
      .catch(() => {});
  }, []);

  // Список товаров — перезапрашиваем только при смене категории (сервер
  // теперь реально фильтрует по category_id, проверено). brand_id сюда
  // намеренно не передаём: API принимает только один brand_id, а чипсы
  // брендов поддерживают множественный выбор — фильтрацию по (нескольким)
  // брендам делаем на клиенте (см. visibleProducts ниже) поверх уже
  // загруженного списка, это заодно даёт мгновенный отклик на выбор
  // бренда, без похода в сеть.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listProducts({ categoryId })
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
  }, [categoryId]);

  // Фильтрация по бренду — на клиенте (см. комментарий выше), поддерживает
  // сразу несколько выбранных брендов.
  const visibleProducts = brandIds.length
    ? products.filter((p) => p.brand && brandIds.includes(p.brand.id))
    : products;

  const toggleCategory = (id) => setCategoryId((c) => (c === id ? null : id));
  const toggleBrand = (id) =>
    setBrandIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const Header = (
    <View>
      <Text style={styles.blockTitle}>Категории</Text>
      <View style={styles.catGrid}>
        {categories.map((cat) => {
          const active = categoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[styles.catCard, active && styles.catCardActive]}
              onPress={() => toggleCategory(cat.id)}
            >
              <Text style={styles.catTitle}>{cat.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.blockTitle}>Бренды</Text>
      <View style={styles.brandWrap}>
        {brands.map((b) => {
          const active = brandIds.includes(b.id);
          return (
            <Pressable
              key={b.id}
              style={[styles.brandChip, active && styles.brandChipActive]}
              onPress={() => toggleBrand(b.id)}
            >
              <Text style={[styles.brandText, active && styles.brandTextActive]}>
                {b.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>Каталог</Text>

      <Pressable style={styles.searchRow} onPress={() => navigation.navigate('Search')}>
        <SearchIcon size={20} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>Поиск брендов...</Text>
      </Pressable>

      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={Header}
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
              {error ? 'Не удалось загрузить товары' : 'По выбранным фильтрам ничего нет'}
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
    color: colors.accent, fontSize: font.sizeLG, fontWeight: '800',
    textAlign: 'center', paddingVertical: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: font.sizeMD },
  blockTitle: {
    color: colors.text, fontSize: font.sizeLG, fontWeight: '800',
    paddingHorizontal: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md,
  },

  catGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.md, paddingHorizontal: spacing.sm,
  },
  catCard: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  catCardActive: { borderColor: colors.accent },
  catTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },

  brandWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm, paddingHorizontal: spacing.sm, marginBottom: spacing.md,
  },
  brandChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.chipInactive,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  brandChipActive: { backgroundColor: 'transparent', borderColor: colors.accent },
  brandText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '600' },
  brandTextActive: { color: colors.accent },

  grid: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
