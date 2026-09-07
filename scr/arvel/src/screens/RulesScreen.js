// Экран правил площадки.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, font } from '../theme';
import { BackIcon } from '../components/Icons';

const RULES = [
  { title: 'Как работает ARVELL', text: 'Покупатель общается с продавцом в чате и договаривается о встрече. Оплата происходит лично, при получении товара. ARVELL не проводит платежи и не хранит средства пользователей.' },
  { title: 'Проверка подлинности', text: 'Товары продавцов, прошедших проверку, отмечены бейджем «Проверено ARVELL». Это не гарантирует состояние конкретного экземпляра — осмотрите вещь при встрече.' },
  { title: 'Продавцы', text: 'Регистрация продавца возможна только по приглашению от действующего продавца ARVELL. Продавец обязан указывать точное состояние и подлинные фотографии товара.' },
  { title: 'Доставка и встречи', text: 'ARVELL не организует доставку и не несёт ответственности за встречу между покупателем и продавцом. Выбирайте безопасное людное место.' },
  { title: 'Отмена сделки', text: 'Любая сторона может отказаться от сделки до момента передачи товара и оплаты без каких-либо санкций.' },
  { title: 'Ответственность', text: 'ARVELL — площадка для общения покупателей и продавцов и не является стороной сделки купли-продажи.' },
];

export default function RulesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}><BackIcon size={26} /></Pressable>
        <Text style={styles.headerTitle}>Правила</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        {RULES.map((r, i) => (
          <View key={i} style={{ marginBottom: spacing.lg }}>
            <View style={styles.rowHead}>
              <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
              <Text style={styles.title}>{r.title}</Text>
            </View>
            <Text style={styles.text}>{r.text}</Text>
          </View>
        ))}
        <Text style={styles.updated}>Последнее обновление: июнь 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  numText: { color: colors.accent, fontSize: font.sizeSM, fontWeight: '800' },
  title: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: font.sizeMD, lineHeight: 23, paddingLeft: 32 },
  updated: { color: colors.textMuted, fontSize: font.sizeSM, textAlign: 'center', marginTop: spacing.md },
});