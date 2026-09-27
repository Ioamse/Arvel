// Настройки уведомлений.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon } from '../components/Icons';
import Toggle from '../components/Toggle';

// Пока это не настройки на бэкенде (в спеке нет эндпоинта) — сохраняем
// локально, иначе переключатели сбрасывались при каждом уходе с экрана
// (стек вкладки «Профиль» сбрасывается на первый экран, см. MainTabs).
const STORAGE_KEY = 'arvell.notification_prefs';
const DEFAULTS = { msg: true, deal: true, auth: true, price: true, news: false };

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
  const [msg, setMsg] = useState(DEFAULTS.msg);
  const [deal, setDeal] = useState(DEFAULTS.deal);
  const [auth, setAuth] = useState(DEFAULTS.auth);
  const [price, setPrice] = useState(DEFAULTS.price);
  const [news, setNews] = useState(DEFAULTS.news);
  // Не пишем в хранилище, пока не прочитали сохранённые значения —
  // иначе первый рендер с дефолтами затёр бы то, что человек уже выбрал.
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.msg != null) setMsg(saved.msg);
        if (saved.deal != null) setDeal(saved.deal);
        if (saved.auth != null) setAuth(saved.auth);
        if (saved.price != null) setPrice(saved.price);
        if (saved.news != null) setNews(saved.news);
      })
      .catch(() => {})
      .finally(() => { loaded.current = true; });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ msg, deal, auth, price, news })).catch(() => {});
  }, [msg, deal, auth, price, news]);

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