// Экран «Заказы» (покупатель) / «Продажи» (продавец).
// Открывается из плитки статистики в «Профиле».
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, TeeIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { listMyPurchases, listMyPurchaseConfirmations } from '../api/purchases';
import { formatPrice } from '../utils/price';

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const title = isSeller ? 'Продажи' : 'Заказы';
  const rowLabel = isSeller ? 'Продажа' : 'Покупка';

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const fetchDeals = isSeller ? listMyPurchaseConfirmations : listMyPurchases;
    fetchDeals({ limit: 50 })
      .then((page) => { if (!cancelled) setDeals(page.data || []); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isSeller]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon size={26} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : deals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {error ? 'Не удалось загрузить' : isSeller ? 'Пока нет продаж' : 'Пока нет заказов'}
            </Text>
            {!error && (
              <Text style={styles.emptySub}>
                {isSeller
                  ? 'Завершённые сделки появятся здесь.'
                  : 'Ваши покупки появятся здесь после первой сделки.'}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            {deals.map((d, i) => {
              const product = d.product;
              const subtitle = [
                rowLabel,
                new Date(d.confirmed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
                isSeller ? d.buyer?.display_name : null,
              ].filter(Boolean).join(' · ');
              return (
                <View
                  key={d.id}
                  style={[styles.dealRow, i < deals.length - 1 && styles.dealBorder]}
                >
                  <View style={styles.dealImg}><TeeIcon size={36} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dealTitle} numberOfLines={1}>
                      {[product?.brand?.name, product?.title].filter(Boolean).join(' ')}
                    </Text>
                    <Text style={styles.dealSub} numberOfLines={1}>{subtitle}</Text>
                  </View>
                  <Text style={styles.dealPrice}>{formatPrice(product?.price_minor)} ₽</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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

  card: {
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden',
  },
  dealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  dealBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dealImg: {
    width: 52, height: 52, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  dealTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  dealSub: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
  dealPrice: { color: colors.text, fontSize: font.sizeMD, fontWeight: '800' },

  empty: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '700', textAlign: 'center' },
  emptySub: {
    color: colors.textMuted, fontSize: font.sizeMD, textAlign: 'center',
    marginTop: spacing.sm, lineHeight: 22,
  },
});
