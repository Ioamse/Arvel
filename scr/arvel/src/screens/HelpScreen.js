// Экран помощи: FAQ (раскрывающиеся) + служба поддержки.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, ChevronRight, ChatIcon } from '../components/Icons';

const FAQ = [
  { q: 'Как понять, что товар прошёл проверку подлинности?', a: 'Любой товар, загруженный на ARVELL, автоматически проходит проверку подлинности — отдельно ничего проверять не нужно.' },
  { q: 'Когда и как я оплачиваю товар?', a: 'Оплата происходит лично при получении товара. ARVELL не проводит платежи и не хранит средства пользователей.' },
  { q: 'Кто организует доставку?', a: 'Доставку и встречу стороны организуют сами. ARVELL не несёт ответственности за встречу — выбирайте безопасное людное место.' },
  { q: 'Как стать продавцом на ARVELL?', a: 'Регистрация продавца возможна только по приглашению от действующего продавца ARVELL.' },
  { q: 'Что делать, если товар не соответствует описанию?', a: 'Осмотрите вещь при встрече. Любая сторона может отказаться от сделки до передачи товара и оплаты без санкций.' },
];

function FaqItem({ item, open, onToggle, last }) {
  return (
    <View style={[!last && styles.faqBorder]}>
      <Pressable style={styles.faqHead} onPress={onToggle}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <View style={open && styles.chevronOpen}>
          <ChevronRight size={20} />
        </View>
      </Pressable>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </View>
  );
}

export default function HelpScreen({ navigation }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}><BackIcon size={26} /></Pressable>
        <Text style={styles.headerTitle}>Помощь</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.section}>Частые вопросы</Text>
        <View style={styles.card}>
          {FAQ.map((item, i) => (
            <FaqItem
              key={i}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              last={i === FAQ.length - 1}
            />
          ))}
        </View>

        <Text style={styles.section}>Служба поддержки</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.supportRow}
            onPress={() => navigation.navigate('Conversation', { name: 'Поддержка ARVELL', rating: 5.0 })}
          >
            <View style={styles.supportIcon}><ChatIcon size={20} color={colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.supportTitle}>Написать в поддержку</Text>
              <Text style={styles.supportSub}>Ответим в течение дня</Text>
            </View>
            <ChevronRight size={20} />
          </Pressable>
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
  faqBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  faqHead: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  faqQ: { flex: 1, color: colors.text, fontSize: font.sizeMD, fontWeight: '700', lineHeight: 22 },
  faqA: { color: colors.textMuted, fontSize: font.sizeMD, lineHeight: 22, paddingHorizontal: spacing.md, paddingBottom: spacing.md, marginTop: -4 },
  supportRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  supportIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  supportTitle: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  supportSub: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
});