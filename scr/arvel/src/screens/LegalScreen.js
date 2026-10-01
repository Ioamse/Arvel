// Пользовательское соглашение и политика конфиденциальности.
// route.params.doc: 'terms' | 'privacy'.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, font } from '../theme';
import { BackIcon } from '../components/Icons';

const DOCS = {
  terms: {
    title: 'Условия использования',
    sections: [
      { title: 'Общие положения', text: 'Настоящие условия регулируют использование приложения ARVELL. Регистрируясь или продолжая пользоваться приложением, вы подтверждаете, что прочитали и принимаете эти условия.' },
      { title: 'Роль ARVELL', text: 'ARVELL — площадка для общения покупателей и продавцов брендовой одежды. ARVELL не является стороной сделки купли-продажи, не проводит платежи и не хранит средства пользователей.' },
      { title: 'Аккаунт', text: 'Для входа используется номер телефона, подтверждённый кодом из SMS. Вы отвечаете за сохранность доступа к своему номеру и за действия, совершённые из вашего аккаунта.' },
      { title: 'Продавцы', text: 'Продавцом можно стать только по приглашению действующего продавца ARVELL. Продавец обязан размещать подлинные фотографии, указывать точное состояние товара и продавать только оригинальные вещи.' },
      { title: 'Запрещено', text: 'Размещать подделки и товары, запрещённые законом; вводить других пользователей в заблуждение; рассылать спам и оскорбления; пытаться получить доступ к чужим аккаунтам.' },
      { title: 'Сделки', text: 'Покупатель и продавец самостоятельно договариваются о встрече, осмотре и оплате товара. Любая сторона может отказаться от сделки до передачи товара и оплаты.' },
      { title: 'Блокировка', text: 'ARVELL вправе ограничить или заблокировать аккаунт, если пользователь нарушает эти условия или правила площадки.' },
      { title: 'Изменения', text: 'Условия могут обновляться. Актуальная редакция всегда доступна в приложении; продолжая им пользоваться, вы принимаете обновлённые условия.' },
    ],
  },
  privacy: {
    title: 'Политика конфиденциальности',
    sections: [
      { title: 'Какие данные мы собираем', text: 'Номер телефона, никнейм, фото профиля, объявления и сообщения, которые вы отправляете в приложении, а также технические данные, необходимые для его работы.' },
      { title: 'Зачем они нужны', text: 'Чтобы подтвердить вход, показывать ваш профиль и объявления другим пользователям, передавать сообщения собеседнику и защищать площадку от мошенничества.' },
      { title: 'Кому мы их передаём', text: 'Мы не продаём ваши данные. Никнейм, фото профиля и объявления видят другие пользователи. Номер телефона показывается собеседнику, только если вы сами его указали для связи. Данные могут передаваться сервисам, которые обеспечивают работу приложения (например, отправку SMS), и государственным органам в случаях, предусмотренных законом.' },
      { title: 'Хранение', text: 'Данные хранятся, пока существует ваш аккаунт, и удаляются после его удаления, если закон не требует хранить их дольше.' },
      { title: 'Ваши права', text: 'Вы можете изменить данные профиля в разделе «Редактировать профиль», а также запросить копию или удаление своих данных через службу поддержки.' },
      { title: 'Изменения', text: 'Политика может обновляться. Актуальная редакция всегда доступна в приложении.' },
    ],
  },
};

export default function LegalScreen({ navigation, route }) {
  const doc = DOCS[route?.params?.doc] || DOCS.terms;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} accessibilityLabel="Назад" onPress={() => navigation.goBack()}><BackIcon size={26} /></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{doc.title}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        {doc.sections.map((s, i) => (
          <View key={i} style={{ marginBottom: spacing.lg }}>
            <View style={styles.rowHead}>
              <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
              <Text style={styles.title}>{s.title}</Text>
            </View>
            <Text style={styles.text}>{s.text}</Text>
          </View>
        ))}
        <Text style={styles.updated}>Последнее обновление: сентябрь 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { flex: 1, color: colors.text, fontSize: font.sizeLG, fontWeight: '800', textAlign: 'center' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  numText: { color: colors.accent, fontSize: font.sizeSM, fontWeight: '800' },
  title: { flex: 1, color: colors.text, fontSize: font.sizeLG, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: font.sizeMD, lineHeight: 23, paddingLeft: 32 },
  updated: { color: colors.textMuted, fontSize: font.sizeSM, textAlign: 'center', marginTop: spacing.md },
});
