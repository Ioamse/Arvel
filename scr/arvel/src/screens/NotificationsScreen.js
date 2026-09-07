// Настройки уведомлений.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon } from '../components/Icons';
import Toggle from '../components/Toggle';

function Row({ title, subtitle, value, onValueChange, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [msg, setMsg] = useState(true);
  const [deal, setDeal] = useState(true);
  const [auth, setAuth] = useState(true);
  const [price, setPrice] = useState(true);
  const [news, setNews] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}><BackIcon size={26} /></Pressable>
        <Text style={styles.headerTitle}>Уведомления</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.section}>Сделки</Text>
        <View style={styles.card}>
          <Row title="Новые сообщения" subtitle="Когда продавец или покупатель пишет вам" value={msg} onValueChange={setMsg} />
          <Row title="Статус сделки" subtitle="Оформление, подтверждение, завершение" value={deal} onValueChange={setDeal} />
          <Row title="Проверка подлинности" subtitle="Результат проверки вашего товара" value={auth} onValueChange={setAuth} last />
        </View>

        <Text style={styles.section}>Товары</Text>
        <View style={styles.card}>
          <Row title="Снижение цены" subtitle="На товары из избранного" value={price} onValueChange={setPrice} />
          <Row title="Новости и акции" subtitle="Подборки и предложения ARVELL" value={news} onValueChange={setNews} last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800' },
  section: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800', paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md },
  card: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  rowSub: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 4, lineHeight: 18 },
});