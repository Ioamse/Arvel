import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, font } from '../theme';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../context/ProductsContext';

export default function FeedScreen({ navigation }) {
  const { products, loading, error, refresh, loadMore } = useProducts();
  // Спиннер «потяни вниз» — только для ручного обновления: loading в контексте
  // включается и при догрузке следующей страницы, и тогда сверху крутился бы он же.
  const [pulling, setPulling] = useState(false);
  const pullToRefresh = async () => {
    setPulling(true);
    try {
      await refresh();
    } finally {
      setPulling(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Шапка: логотип */}
      <View style={styles.topbar}>
        <Text style={styles.logo}>ARVELL</Text>
      </View>

      {/* Поиск переехал в «Каталог» — там же, где фильтры по категориям/брендам */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        // Раньше показывалась только первая страница (20 товаров): loadMore
        // существовал, но нигде не вызывался.
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={pulling}
        onRefresh={pullToRefresh}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item.id })} />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : error ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Не удалось загрузить товары</Text>
              <Text style={styles.emptySub}>{error.message}</Text>
              <Pressable style={styles.retryBtn} onPress={refresh}>
                <Text style={styles.retryText}>Повторить</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.empty}>Пока нет товаров</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  logo: {
    color: colors.accent,
    fontSize: font.sizeXL,
    fontWeight: '800',
    letterSpacing: 2,
  },
  list: {
    paddingHorizontal: 10,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  emptyWrap: { alignItems: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: font.sizeSM, textAlign: 'center', marginTop: spacing.xs },
  retryBtn: { marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.accent, fontSize: font.sizeSM, fontWeight: '700' },
});