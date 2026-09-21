// Экран «Мои объявления» продавца: список его товаров + «Добавить товар».
// Открывается из плитки статистики в «Профиле».
import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon } from '../components/Icons';
import MyListingCard from '../components/MyListingCard';
import { useMyListings } from '../context/MyListingsContext';

export default function MyListingsScreen({ navigation }) {
  const { items, loading, error, refresh, markSold, archive } = useMyListings();

  // Список живёт на сервере — при каждом заходе на экран обновляем его,
  // чтобы видеть изменения, сделанные с другого устройства.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const run = (action, id) => {
    action(id).catch((e) => {
      Alert.alert('Не удалось выполнить действие', e?.message || 'Попробуйте ещё раз.');
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <BackIcon size={26} />
        </Pressable>
        <Text style={styles.headerTitle}>Мои объявления</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.topBtnWrap}>
        <Pressable style={styles.addBtn} onPress={() => navigation.navigate('AddProduct')}>
          <Text style={styles.addBtnText}>+ Добавить товар</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={loading && items.length > 0}
        onRefresh={refresh}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator color={colors.accent} size="large" />
            ) : error ? (
              <>
                <Text style={styles.emptyTitle}>Не удалось загрузить объявления</Text>
                <Text style={styles.emptySub}>{error.message}</Text>
                <Pressable style={styles.retryBtn} onPress={refresh}>
                  <Text style={styles.retryText}>Повторить</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.emptyTitle}>Объявлений пока нет</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <MyListingCard
            product={item}
            onPress={() => navigation.navigate('Product', { id: item.id })}
            onMarkSold={(id) => run(markSold, id)}
            onDelete={(id) => run(archive, id)}
          />
        )}
      />
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

  topBtnWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  addBtn: {
    backgroundColor: colors.accent, borderRadius: radius.xl,
    paddingVertical: 16, alignItems: 'center',
  },
  addBtnText: { color: colors.accentText, fontSize: font.sizeMD, fontWeight: '800' },

  list: { paddingHorizontal: 10, paddingBottom: spacing.xl, flexGrow: 1 },

  empty: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: font.sizeSM, textAlign: 'center', marginTop: spacing.sm },
  retryBtn: {
    marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  retryText: { color: colors.accent, fontSize: font.sizeMD, fontWeight: '700' },
});

