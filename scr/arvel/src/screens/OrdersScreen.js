// Экран «Заказы» (покупатель) / «Продажи» (продавец).
// Открывается из плиток статистики в «Профиле».
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, TeeIcon, SneakerIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { dealsHistory } from '../data/products';

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const title = isSeller ? 'Продажи' : 'Заказы';
  const rowLabel = isSeller ? 'Продажа' : 'Покупка';

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
        {dealsHistory.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {isSeller ? 'Пока нет продаж' : 'Пока нет заказов'}
            </Text>
            <Text style={styles.emptySub}>
              {isSeller
                ? 'Завершённые сделки появятся здесь.'
                : 'Ваши покупки появятся здесь после первой сделки.'}
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {dealsHistory.map((d, i) => {
              const Ph = d.kind === 'sneaker' ? SneakerIcon : TeeIcon;
              return (
                <View
                  key={d.id}
                  style={[styles.dealRow, i < dealsHistory.length - 1 && styles.dealBorder]}
                >
                  <View style={styles.dealImg}><Ph size={36} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dealTitle}>{d.title}</Text>
                    <Text style={styles.dealSub}>{rowLabel} · {d.date}</Text>
                  </View>
                  <Text style={styles.dealPrice}>{d.price.toLocaleString('ru-RU')} ₽</Text>
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