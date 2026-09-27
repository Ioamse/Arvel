// Экран «Заказы» (покупатель) / «Продажи» (продавец).
// Открывается из плиток статистики в «Профиле».
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, TeeIcon, SneakerIcon, CloseIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useMoney } from '../context/AppConfigContext';
import { dealsHistory } from '../data/products';

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const money = useMoney();
  const isSeller = user?.role === 'seller';
  // «Заказы»/«Продажи» подразумевали текущие, незавершённые заказы — а тут
  // только история уже прошедших сделок (mock, нет эндпоинта активных
  // заказов). Заголовок и пустое состояние теперь говорят прямо об этом.
  const title = isSeller ? 'Завершённые продажи' : 'Завершённые сделки';
  const rowLabel = isSeller ? 'Продажа' : 'Покупка';
  // Пока это статичная история (mock-данные, нет эндпоинта сделок) — строки
  // раньше вообще ничего не делали по тапу. Открываем то, что реально есть,
  // отдельным экраном не заводимся, т.к. деталей сделки на бэкенде ещё нет.
  const [selected, setSelected] = useState(null);

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
              {isSeller ? 'Пока нет завершённых продаж' : 'Пока нет завершённых сделок'}
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
                <Pressable
                  key={d.id}
                  style={[styles.dealRow, i < dealsHistory.length - 1 && styles.dealBorder]}
                  onPress={() => setSelected(d)}
                >
                  <View style={styles.dealImg}><Ph size={36} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dealTitle}>{d.title}</Text>
                    <Text style={styles.dealSub}>{rowLabel} · {d.date}</Text>
                  </View>
                  <Text style={styles.dealPrice}>{money.formatMajor(d.price)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selected && (() => {
              const SelectedIcon = selected.kind === 'sneaker' ? SneakerIcon : TeeIcon;
              return (
                <>
                  <View style={styles.modalHead}>
                    <View style={styles.dealImg}><SelectedIcon size={36} /></View>
                    <Pressable hitSlop={10} onPress={() => setSelected(null)}>
                      <CloseIcon size={20} />
                    </Pressable>
                  </View>
                  <Text style={styles.modalTitle}>{selected.title}</Text>
                  <Text style={styles.modalRow}>{rowLabel} · {selected.date}</Text>
                  <Text style={styles.modalPrice}>{money.formatMajor(selected.price)}</Text>
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