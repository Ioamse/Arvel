// Экран «Мои объявления» продавца: список его товаров + «Добавить товар».
// Открывается из плитки статистики в «Профиле».
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon } from '../components/Icons';
import MyListingCard from '../components/MyListingCard';
import { getMyShop } from '../api/me';
import { listProducts, setProductStatus } from '../api/products';

export default function MyListingsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // GET /products?status= отдаёт только один статус за раз и только
  // владельцу магазина — тянем active и out_of_stock отдельно и сводим в
  // один список (archived сознательно не показываем, он скрыт из каталога).
  const load = useCallback(async (cancelledRef) => {
    setLoading(true);
    setError(null);
    try {
      const shop = await getMyShop();
      const [activePage, outOfStockPage] = await Promise.all([
        listProducts({ shopId: shop.id, status: 'active' }),
        listProducts({ shopId: shop.id, status: 'out_of_stock' }),
      ]);
      if (cancelledRef?.current) return;
      const merged = [...(activePage.data || []), ...(outOfStockPage.data || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setProducts(merged);
    } catch (e) {
      if (!cancelledRef?.current) setError(e);
    } finally {
      if (!cancelledRef?.current) setLoading(false);
    }
  }, []);

  // Экран не размонтируется при переходе на AddProduct — обновляем список
  // при каждом возврате в фокус, а не только при первом монтировании.
  // cancelledRef защищает от гонки, если фокус срабатывает повторно
  // (быстрый уход и возврат) раньше, чем разрешился предыдущий load().
  useEffect(() => {
    const cancelledRef = { current: false };
    const unsubscribe = navigation.addListener('focus', () => load(cancelledRef));
    return () => {
      cancelledRef.current = true;
      unsubscribe();
    };
  }, [navigation, load]);

  const onSetStatus = async (id, status) => {
    try {
      await setProductStatus(id, status);
      load();
    } catch (e) {
      Alert.alert('Не удалось обновить статус', e.message || 'Попробуйте ещё раз.');
    }
  };

  const onArchive = async (id) => {
    try {
      await setProductStatus(id, 'archived');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      Alert.alert('Не удалось скрыть объявление', e.message || 'Попробуйте ещё раз.');
    }
  };

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
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {error ? 'Не удалось загрузить объявления' : 'Объявлений пока нет'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <MyListingCard
            product={item}
            onPress={() => navigation.navigate('Product', { id: item.id })}
            onSetStatus={onSetStatus}
            onArchive={onArchive}
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
