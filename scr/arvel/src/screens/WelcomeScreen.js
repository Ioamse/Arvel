import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, font } from '../theme';
import Logo from '../components/Logo';
import ShieldIcon from '../components/ShieldIcon';
import PrimaryButton from '../components/PrimaryButton';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Logo size={96} />
        <Text style={styles.brand}>ARVELL</Text>

        <Text style={styles.sub}>
          Площадка брендовой одежды с{'\n'}гарантией подлинности
        </Text>

        <View style={styles.tagRow}>
          <ShieldIcon size={18} filled />
          <Text style={styles.tag}>Каждый товар проверен</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton title="Войти" onPress={() => navigation.navigate('Phone')} />
        <Text style={styles.legal}>
          Продолжая, вы принимаете <Text style={styles.legalLink}>Условия</Text> и{' '}
          <Text style={styles.legalLink}>Политику{'\n'}конфиденциальности</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  brand: {
    color: colors.text, fontSize: font.sizeLG, fontWeight: '800',
    letterSpacing: 6, marginTop: spacing.lg,
  },
  sub: {
    color: colors.textMuted, fontSize: font.sizeMD, textAlign: 'center',
    marginTop: spacing.lg, lineHeight: 24,
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.lg },
  tag: { color: colors.textMuted, fontSize: font.sizeSM },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  legal: {
    color: colors.textFaint, fontSize: font.sizeXS, textAlign: 'center',
    marginTop: spacing.md, lineHeight: 18,
  },
  legalLink: { color: colors.textMuted, fontWeight: '600' },
});