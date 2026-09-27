import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, font } from '../theme';
import { SearchIcon, ClockIcon, CloseIcon, TeeIcon } from '../components/Icons';
import ProductCard from '../components/ProductCard';
import { listProducts } from '../api/products';
import { listBrands } from '../api/catalog';
import { useProducts } from '../context/ProductsContext';
import { useMoney } from '../context/AppConfigContext';

// «Недавнее» переживает уход с экрана (стек «Каталога»/«Главной» сбрасывается
// на первый экран при переключении вкладки, см. popToTopOnBlur в MainTabs) —
// без AsyncStorage список каждый раз возвращался к этим трём заглушкам.
const RECENT_KEY = 'arvell.recent_searches';
const RECENT_LIMIT = 8;
const INITIAL_RECENT = ['Air Max', 'Stone Island худи', 'Куртка зима'];

export default function SearchScreen({ navigation }) {
  const { products: feedProducts } = useProducts();
  const money = useMoney();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(INITIAL_RECENT);
  const [popularBrands, setPopularBrands] = useState([]);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);

  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const recentLoaded = useRef(false);

  useEffect(() => {
    listBrands({ limit: 5 })
      .then((res) => setPopularBrands(res.data || []))
      .catch(() => {});
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved)) setRecent(saved);
        }
      })
      .catch(() => {})
      .finally(() => { recentLoaded.current = true; });
  }, []);

  const addRecent = (term) => {
    const clean = term.trim();
    if (!clean) return;
    setRecent((r) => {
      const next = [clean, ...r.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, RECENT_LIMIT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const removeRecent = (item) => {
    setRecent((r) => {
      const next = r.filter((x) => x !== item);
      // Пишем только после первой загрузки — иначе стартовый рендер с
      // заглушками успевал бы затереть уже сохранённый список.
      if (recentLoaded.current) AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setBrandSuggestions([]);
      return;
    }
    setSearching(true);
    setSearchError(false);
    // cancelled: ответ на прежний запрос («ab») не должен перезаписать
    // результаты нового («abc»), если он пришёл позже.
    let cancelled = false;
    const t = setTimeout(() => {
      listBrands({ q, limit: 6 })
        .then((res) => { if (!cancelled) setBrandSuggestions(res.data || []); })
        .catch(() => { if (!cancelled) setBrandSuggestions([]); });
      listProducts({ q })
        .then((page) => {
          if (cancelled) return;
          setResults(page.data || []);
          addRecent(q);
        })
        .catch(() => { if (!cancelled) { setResults([]); setSearchError(true); } })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

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
          {/* Раньше единственный способ стереть введённый текст — «Отмена»
              справа от поля; крестик внутри поля стирает сразу, без бэкспейса
              по букве и привычнее (как в iOS/Android поиске). */}
          {query.length > 0 && (
            <Pressable hitSlop={10} onPress={() => setQuery('')}>
              <CloseIcon size={16} color={colors.textMuted} />
            </Pressable>
          )}
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
          ListHeaderComponent={
            // Бренды, чьё название начинается похоже на введённый текст —
            // подсказка на случай опечатки или неполного названия.
            brandSuggestions.length > 0 && brandSuggestions.some((b) => b.name.toLowerCase() !== query.trim().toLowerCase()) ? (
              <View style={styles.suggestWrap}>
                {brandSuggestions
                  .filter((b) => b.name.toLowerCase() !== query.trim().toLowerCase())
                  .map((b) => (
                    <Pressable key={b.id} style={styles.suggestChip} onPress={() => setQuery(b.name)}>
                      <Text style={styles.suggestText}>{b.name}</Text>
                    </Pressable>
                  ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            searching
              ? <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
              : <Text style={styles.empty}>{searchError ? 'Не удалось выполнить поиск. Проверьте соединение.' : 'Ничего не найдено'}</Text>
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
                // Раньше кнопка удаления была вложенным Pressable внутри
                // строки-Pressable — на части устройств вложенный жест-хендлер
                // перехватывал тач, и тап по самой строке переставал отвечать.
                // Теперь это два независимых Pressable рядом в обычном View.
                <View key={item} style={styles.recentRow}>
                  <Pressable style={styles.recentTap} onPress={() => setQuery(item)}>
                    <ClockIcon size={20} />
                    <Text style={styles.recentText}>{item}</Text>
                  </Pressable>
                  <Pressable hitSlop={10} onPress={() => removeRecent(item)}>
                    <CloseIcon size={20} />
                  </Pressable>
                </View>
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
                  {p.price_minor != null ? money.formatMinor(p.price_minor) : (p.price != null ? money.formatMajor(p.price) : '—')}
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

  recentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  recentTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recentText: { flex: 1, color: colors.text, fontSize: font.sizeMD },

  suggestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  suggestChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  suggestText: { color: colors.text, fontSize: font.sizeSM, fontWeight: '600' },

  forYou: { paddingHorizontal: spacing.lg, gap: spacing.md },
  forYouCard: { width: 150, marginRight: spacing.md },
  forYouImg: { height: 150, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  forYouBrand: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700', marginTop: spacing.sm },
  forYouPrice: { color: colors.accent, fontSize: font.sizeMD, fontWeight: '800', marginTop: 2 },

  grid: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
