import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { SearchIcon, ClockIcon, CloseIcon, TeeIcon } from '../components/Icons';
import ProductCard from '../components/ProductCard';
import { listProducts } from '../api/products';
import { listBrands } from '../api/catalog';
import { useProducts } from '../context/ProductsContext';
import { formatPrice } from '../utils/price';

// «Недавнее» — пока только локальный список без сохранения между сессиями,
// в спеке нет эндпоинта под историю поиска.
const INITIAL_RECENT = ['Air Max', 'Stone Island худи', 'Куртка зима'];

export default function SearchScreen({ navigation }) {
  const { products: feedProducts } = useProducts();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(INITIAL_RECENT);
  const [popularBrands, setPopularBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);

  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    listBrands({ limit: 5 })
      .then((res) => setPopularBrands(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      listProducts({ q })
        .then((page) => setResults(page.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const removeRecent = (item) => setRecent((r) => r.filter((x) => x !== item));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>Поиск</Text>

      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <SearchIcon size={20} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Поиск брендов..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Text style={styles.cancel}>Отмена</Text>
          </Pressable>
        )}
      </View>

      {results ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item.id })} />
          )}
          ListEmptyComponent={
            searching
              ? <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
              : <Text style={styles.empty}>Ничего не найдено</Text>
          }
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <Text style={styles.blockTitle}>Популярное</Text>
          <View style={styles.brandWrap}>
            {popularBrands.map((b) => {
              const active = b.id === selectedBrand;
              return (
                <Pressable
                  key={b.id}
                  style={[styles.brandChip, active && styles.brandChipActive]}
                  onPress={() => { setSelectedBrand(b.id); setQuery(b.name); }}
                >
                  <Text style={[styles.brandText, active && styles.brandTextActive]}>{b.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {recent.length > 0 && (
            <>
              <Text style={styles.blockTitle}>Недавнее</Text>
              {recent.map((item) => (
                <Pressable key={item} style={styles.recentRow} onPress={() => setQuery(item)}>
                  <ClockIcon size={20} />
                  <Text style={styles.recentText}>{item}</Text>
                  <Pressable hitSlop={10} onPress={() => removeRecent(item)}>
                    <CloseIcon size={20} />
                  </Pressable>
                </Pressable>
              ))}
            </>
          )}

          {/* Не персонализировано — просто первые товары ленты, в спеке нет эндпоинта рекомендаций */}
          <Text style={styles.blockTitle}>Для вас</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forYou}>
            {feedProducts.slice(0, 5).map((p) => (
              <Pressable
                key={p.id}
                style={styles.forYouCard}
                onPress={() => navigation.navigate('Product', { id: p.id })}
              >
                <View style={styles.forYouImg}><TeeIcon size={72} /></View>
                <Text style={styles.forYouBrand} numberOfLines={1}>
                  {typeof p.brand === 'string' ? p.brand : p.brand?.name || ''}
                </Text>
                <Text style={styles.forYouPrice}>
                  {p.price_minor != null ? formatPrice(p.price_minor) : (p.price?.toLocaleString('ru-RU') ?? '—')} ₽
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800', textAlign: 'center', paddingVertical: spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, color: colors.text, fontSize: font.sizeMD, paddingVertical: spacing.md },
  cancel: { color: colors.accent, fontSize: font.sizeMD, fontWeight: '700' },

  blockTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800', paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md },
  brandWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  brandChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: colors.chipInactive, borderWidth: 1.5, borderColor: 'transparent' },
  brandChipActive: { backgroundColor: 'transparent', borderColor: colors.accent },
  brandText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '600' },
  brandTextActive: { color: colors.accent },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  recentText: { flex: 1, color: colors.text, fontSize: font.sizeMD },

  forYou: { paddingHorizontal: spacing.lg, gap: spacing.md },
  forYouCard: { width: 150, marginRight: spacing.md },
  forYouImg: { height: 150, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  forYouBrand: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700', marginTop: spacing.sm },
  forYouPrice: { color: colors.accent, fontSize: font.sizeMD, fontWeight: '800', marginTop: 2 },

  grid: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
