import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon } from '../components/Icons';
import KeyboardAware from '../components/KeyboardAware';
import { useAuth } from '../context/AuthContext';

const LEN = 4;
const RESEND_SECONDS = 30;

// Паттерн «скрытое поле + ячейки-отображение»:
// весь код живёт одной строкой в невидимом TextInput, а ячейки —
// обычные Text, рисующие по одному символу из состояния.
// Нативному полю негде мигать (оно невидимо), лишняя цифра
// не может появиться на экране ни на мгновение.
export default function VerifyScreen({ navigation, route }) {
  const phone = route?.params?.phone ?? '+7 (999) 000-00-00';
  const { verifyCode, registerPhone, pendingPhone } = useAuth();
  const [value, setValue] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const hidden = useRef(null);

  // Автофокус при открытии экрана — клавиатура поднимается сразу
  useEffect(() => {
    const t = setTimeout(() => hidden.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Таймер повторной отправки
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const onChange = (text) => {
    if (verifying) return;
    const digits = text.replace(/\D/g, '').slice(0, LEN);
    setValue(digits);
    setError(null);

    if (digits.length === LEN) {
      setVerifying(true);
      hidden.current?.blur();
      verifyCode(digits)
        .then(() => navigation.navigate('ProfileSetup'))
        .catch((e) => {
          setError(e.message || 'Неверный код. Попробуйте ещё раз.');
          setValue('');
          setVerifying(false);
        });
    }
  };

  const resend = () => {
    if (!pendingPhone) return;
    setSeconds(RESEND_SECONDS);
    registerPhone(pendingPhone).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAware>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Подтверждение</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Введите код</Text>
        <Text style={styles.sub}>Код отправлен на {phone}</Text>

        {/* Тап по любой ячейке возвращает фокус в скрытое поле */}
        <Pressable style={styles.cells} onPress={() => hidden.current?.focus()}>
          {Array.from({ length: LEN }).map((_, i) => (
            <View
              key={i}
              style={[styles.cell, value[i] ? styles.cellFilled : null]}
            >
              <Text style={styles.cellText}>{value[i] ?? ''}</Text>
            </View>
          ))}
        </Pressable>

        {/* Невидимое поле, в котором реально идёт ввод.
            Backspace здесь стирает последнюю цифру — визуально это
            «стереть и перейти в предыдущую ячейку», удержание
            стирает весь код справа налево. */}
        <TextInput
          ref={hidden}
          style={styles.hiddenInput}
          keyboardType="number-pad"
          value={value}
          onChangeText={onChange}
          maxLength={LEN}
          editable={!verifying}
          caretHidden
        />

        {error && <Text style={styles.error}>{error}</Text>}

        {seconds > 0 ? (
          <Text style={styles.resendOff}>
            Отправить код повторно через {seconds} с
          </Text>
        ) : (
          <Pressable onPress={resend}>
            <Text style={styles.resendOn}>Отправить код повторно</Text>
          </Pressable>
        )}
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
  title: { color: colors.text, fontSize: font.sizeXXL, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: font.sizeMD, marginTop: spacing.sm },
  cells: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  cell: {
    width: 70, height: 84,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cellFilled: { borderColor: colors.accent },
  cellText: { color: colors.text, fontSize: font.sizeXXL, fontWeight: '700' },
  hiddenInput: {
    position: 'absolute',
    width: 1, height: 1,
    opacity: 0,
  },
  error: {
    color: colors.danger, fontSize: font.sizeSM,
    textAlign: 'center', marginTop: spacing.lg,
  },
  resendOff: {
    color: colors.textMuted, fontSize: font.sizeMD,
    textAlign: 'center', marginTop: spacing.xl,
  },
  resendOn: {
    color: colors.accent, fontSize: font.sizeMD, fontWeight: '600',
    textAlign: 'center', marginTop: spacing.xl,
  },
});