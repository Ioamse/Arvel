// Экран «Заказы» (покупатель) / «Продажи» (продавец).
// Открывается из плиток статистики в «Профиле».
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, TeeIcon, CloseIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useMoney } from '../context/AppConfigContext';
import { listMyPurchases, listMySales } from '../api/purchases';
import { resolveMediaUrl } from '../utils/media';
import { formatTime } from '../utils/chatFormat';

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const money = useMoney();
  const isSeller = user?.role === 'seller';
  // «Заказы»/«Продажи» подразумевали текущие, незавершённые заказы — а тут
  // только история уже прошедших сделок (mock, нет эндпоинта активных
  // заказов). Заголовок и пустое состояние теперь говорят прямо об этом.
  const title = isSeller ? 'Завершённые продажи' : 'Завершённые сделки';
  const rowLabel = isSeller ? 'Продажа' : 'Покупка';
  const [selected, setSelected] = useState(null);

  // Раньше экран показывал одну и ту же выдуманную историю всем подряд.
  // Подтверждения покупок бэкенд отдаёт: покупателю — /me/purchases,
  // продавцу — /purchase-confirmations, схема ответа одинаковая.
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await (isSeller ? listMySales({ limit: 50 }) : listMyPurchases({ limit: 50 }));
      setDeals((res?.data ?? []).map((c) => ({
        id: c.id,
        title: [c.product?.brand?.name, c.product?.title].filter(Boolean).join(' '),
        priceMinor: c.product?.price_minor,
        date: formatTime(c.confirmed_at),
        thumbnail: resolveMediaUrl(c.product?.thumbnail_url),
      })));
    } catch (e) {
      setError(e?.message || 'Не удалось загрузить историю сделок.');
    } finally {
      setLoading(false);
    }
  }, [isSeller]);

  useEffect(() => { load(); }, [load]);

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
          <View style={styles.empty}><ActivityIndicator color={colors.accent} /></View>
        ) : deals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {error || (isSeller ? 'Пока нет завершённых продаж' : 'Пока нет завершённых сделок')}
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
            {deals.map((d, i) => (
              <Pressable
                key={d.id}
                style={[styles.dealRow, i < deals.length - 1 && styles.dealBorder]}
                onPress={() => setSelected(d)}
              >
                <View style={styles.dealImg}>
                  {d.thumbnail
                    ? <Image source={{ uri: d.thumbnail }} style={styles.dealThumb} />
                    : <TeeIcon size={36} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dealTitle}>{d.title}</Text>
                  <Text style={styles.dealSub}>{rowLabel} · {d.date}</Text>
                </View>
                <Text style={styles.dealPrice}>{money.formatMinor(d.priceMinor)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selected && (() => {
              return (
                <>
                  <View style={styles.modalHead}>
                    <View style={styles.dealImg}>
                      {selected.thumbnail
                        ? <Image source={{ uri: selected.thumbnail }} style={styles.dealThumb} />
                        : <TeeIcon size={36} />}
                    </View>
                    <Pressable hitSlop={10} onPress={() => setSelected(null)}>
                      <CloseIcon size={20} />
                    </Pressable>
                  </View>
                  <Text style={styles.modalTitle}>{selected.title}</Text>
                  <Text style={styles.modalRow}>{rowLabel} · {selected.date}</Text>
                  <Text style={styles.modalPrice}>{money.formatMinor(selected.priceMinor)}</Text>
                  <Text style={styles.modalNote}>
                    Это запись из истории сделок. Подробности переписки и статус проверки подлинности
                    появятся здесь, когда сделки будут вестись через ARVELL.
                  </Text>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
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
  dealThumb: { width: '100%', height: '100%', borderRadius: radius.md },

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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  modalHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800', marginTop: spacing.md },
  modalRow: { color: colors.textMuted, fontSize: font.sizeMD, marginTop: 4 },
  modalPrice: { color: colors.accent, fontSize: font.sizeXL, fontWeight: '800', marginTop: spacing.sm },
  modalNote: { color: colors.textFaint, fontSize: font.sizeSM, lineHeight: 19, marginTop: spacing.md },

  empty: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '700', textAlign: 'center' },
  emptySub: {
    color: colors.textMuted, fontSize: font.sizeMD, textAlign: 'center',
    marginTop: spacing.sm, lineHeight: 22,
  },
});