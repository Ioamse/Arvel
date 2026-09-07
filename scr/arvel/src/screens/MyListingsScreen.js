// Экран «Мои объявления» продавца: список его товаров + «Добавить товар».
// Открывается из плитки статистики в «Профиле».
import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon } from '../components/Icons';
import MyListingCard from '../components/MyListingCard';
import { useProducts } from '../context/ProductsContext';

export default function MyListingsScreen({ navigation }) {
  const { products, markSold, removeProduct } = useProducts();
const myProducts = useMemo(() => products.filter((p) => p.mine), [products]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon size={26} />
        </Pressable>
        <Text style={styles.headerTitle}>Мои объявления</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.topBtnWrap}>
        <Pressable style={styles.addBtn} onPress={() => navigation.navigate('AddProduct')}>
          <Text style={styles.addBtnText}>+ Добавить товар</Text>
        </Pressable>
      </View>

      <FlatList
        data={myProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Объявлений пока нет</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MyListingCard
            product={item}
            onPress={() => navigation.navigate('Product', { id: item.id })}
            onMarkSold={markSold}
            onDelete={removeProduct}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  headerTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800' },

  topBtnWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  addBtn: {
    backgroundColor: colors.accent, borderRadius: radius.xl,
    paddingVertical: 16, alignItems: 'center',
  },
  addBtnText: { color: colors.accentText, fontSize: font.sizeMD, fontWeight: '800' },

  list: { paddingHorizontal: 10, paddingBottom: spacing.xl, flexGrow: 1 },

  empty: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '700', textAlign: 'center' },
});

