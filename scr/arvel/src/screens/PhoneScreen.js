import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon } from '../components/Icons';
import KeyboardAware from '../components/KeyboardAware';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

// Полный формат: +7 (XXX) XXX-XX-XX — ровно 18 символов.
// maxLength на TextInput блокирует ввод на уровне нативного поля:
// лишняя цифра не появляется вовсе (ни мигания, ни обрезки постфактум).
const MAX_FORMATTED_LENGTH = 18;

// Берём до 10 цифр (без ведущей 7) и раскладываем в +7 (XXX) XXX-XX-XX.
// При пустых digits возвращает просто '+7' — так первая нажатая «7»
// сразу превращается в префикс, а не исчезает.
function formatPhone(digits) {
  const d = digits.slice(0, 10);
  let out = '+7';
  if (d.length > 0) out += ' (' + d.slice(0, 3);
  if (d.length >= 3) out += ')';
  if (d.length > 3) out += ' ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return out;
}

export default function PhoneScreen({ navigation }) {
  const { registerPhone } = useAuth();
  const [digits, setDigits] = useState('');
  // Поле "начато": показываем '+7' даже когда национальных цифр ещё нет.
  // Включается первой нажатой клавишей (в т.ч. «7» или «8»),
  // выключается, когда пользователь стирает и сам префикс.
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const prevFormatted = useRef('');
  const valid = digits.length === 10;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      // Бэкенду нужен E.164-формат без пробелов/скобок, экрану — с ними.
      await registerPhone(`+7${digits}`);
      navigation.navigate('Verify', { phone: formatPhone(digits) });
    } catch (e) {
      setError(e.message || 'Не удалось отправить код. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (text) => {
    // вычищаем всё, кроме цифр; ведущую 7/8 трактуем как код страны
    let only = text.replace(/\D/g, '');
    if (only.startsWith('7') || only.startsWith('8')) only = only.slice(1);
    only = only.slice(0, 10);

    let nextStarted = text.length > 0;

    // Фикс залипания backspace: если пользователь стёр символ маски
    // (скобку, дефис, пробел), цифры не изменились, но текст стал короче —
    // значит, намерение было удалить.
    if (text.length < prevFormatted.current.length && only === digits) {
      if (only.length > 0) {
        only = only.slice(0, -1);
      } else {
        // цифр уже нет — пользователь стирает сам префикс '+7',
        // очищаем поле полностью
        nextStarted = false;
      }
    }

    setDigits(only);
    setStarted(nextStarted);
    prevFormatted.current = nextStarted ? formatPhone(only) : '';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAware>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Вход</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Введите номер{'\n'}телефона</Text>
        <Text style={styles.sub}>Мы отправим SMS с кодом подтверждения</Text>

        <TextInput
          style={styles.input}
          placeholder="+7 (___) ___-__-__"
          placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad"
          value={started ? formatPhone(digits) : ''}
          onChangeText={onChange}
          maxLength={MAX_FORMATTED_LENGTH}
          autoFocus
        />

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title={submitting ? 'Отправка...' : 'Получить код'}
          disabled={!valid || submitting}
          onPress={submit}
        />
      </View>
      </KeyboardAware>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.textMuted, fontSize: font.sizeMD, fontWeight: '600' },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { color: colors.text, fontSize: font.sizeXXL, fontWeight: '800', lineHeight: 40 },
  sub: { color: colors.textMuted, fontSize: font.sizeMD, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: font.sizeLG,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  error: { color: colors.danger, fontSize: font.sizeSM, marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});