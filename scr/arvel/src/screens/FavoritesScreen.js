import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { HeartIcon } from '../components/Icons';
import ProductCard from '../components/ProductCard';
import { useFavorites } from '../context/FavoritesContext';

export default function FavoritesScreen({ navigation }) {
  // GET /me/favorites уже отдаёт товар вложенным в каждый FavoriteItem —
  // не нужно сверяться с отдельным списком товаров.
  const { items } = useFavorites();
  const liked = items.map((it) => it.product);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Избранное</Text>
        {liked.length > 0 && <Text style={styles.count}>{liked.length}</Text>}
      </View>

      {liked.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyCircle}>
            <HeartIcon size={40} color={colors.textFaint} />
          </View>
          <Text style={styles.emptyTitle}>Здесь пока пусто</Text>
          <Text style={styles.emptySub}>
            Нажимайте на сердечко у товаров, чтобы сохранить их сюда
          </Text>
          <Pressable style={styles.browseBtn} onPress={() => navigation.navigate('Catalog')}>
            <Text style={styles.browseText}>Перейти к товарам</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={liked}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('Product', { id: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
  },
  header: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800' },
  count: {
    color: colors.accentText, backgroundColor: colors.accent,
    fontSize: font.sizeXS, fontWeight: '800',
    minWidth: 22, height: 22, borderRadius: 11,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: 6, overflow: 'hidden',
  },
  list: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '700' },
  emptySub: {
    color: colors.textMuted, fontSize: font.sizeMD, textAlign: 'center',
    marginTop: spacing.sm, lineHeight: 22,
  },
  browseBtn: {
    marginTop: spacing.xl, backgroundColor: colors.accent,
    borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  browseText: { color: colors.accentText, fontSize: font.sizeMD, fontWeight: '800' },
});
