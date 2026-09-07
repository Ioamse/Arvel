import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { SearchIcon, CheckCircle, TrashIcon } from '../components/Icons';

const initialThreads = [
  { id: '1', name: 'Алексей',        last: 'Хочу купить, товар в наличии?',        time: 'сейчас', unread: 0, dot: false },
  { id: '2', name: 'Алексей Иванов', last: 'Привет! Товар в отличном состоянии',  time: '12:30',  unread: 0, dot: true },
  { id: '3', name: 'Мария С.',       last: 'Договорились, оформляйте сделку',      time: '11:05',  unread: 2, dot: false },
  { id: '4', name: 'Дмитрий К.',     last: 'Могу скинуть ещё фото',                time: 'Вчера',  unread: 0, dot: false },
  { id: '5', name: 'Сергей П.',      last: '✅ Вы договорились о сделке',          time: '09:14',  unread: 0, dot: false },
];

export default function ChatScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [threads, setThreads] = useState(initialThreads);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const data = threads.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()));

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const toggleSelectMode = () => {
    if (selectMode) exitSelectMode();
    else setSelectMode(true);
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRowPress = (item) => {
    if (selectMode) toggleSelected(item.id);
    else navigation.navigate('Conversation', { name: item.name });
  };

  const markSelectedRead = () => {
    if (selectedIds.length === 0) return;
    setThreads((prev) => prev.map((t) => (selectedIds.includes(t.id) ? { ...t, unread: 0, dot: false } : t)));
    exitSelectMode();
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      'Удалить чаты?',
      `Будет удалено чатов: ${selectedIds.length}. Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            setThreads((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
            exitSelectMode();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        {/* симметричные боковые зоны держат заголовок по центру */}
        <View style={styles.headerSide} />
        <Text style={styles.title}>Чаты</Text>
        <Pressable style={[styles.headerSide, styles.headerRight]} onPress={toggleSelectMode}>
          <Text style={styles.action} numberOfLines={1}>{selectMode ? 'Готово' : 'Выбрать'}</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <SearchIcon size={20} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Поиск по чатам"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={(t) => t.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        renderItem={({ item }) => {
          const checked = selectedIds.includes(item.id);
          return (
            <Pressable style={styles.row} onPress={() => handleRowPress(item)}>
              {selectMode && (
                <View style={styles.checkboxWrap}>
                  {checked ? <CheckCircle size={22} /> : <View style={styles.checkboxEmpty} />}
                </View>
              )}
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name[0]}</Text>
                </View>
                {item.dot && <View style={styles.redDot} />}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.time}>{item.time}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.last} numberOfLines={1}>{item.last}</Text>
                  {item.unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {selectMode && (
        <View style={styles.panel}>
          <Text style={styles.panelCaption}>
            {selectedIds.length === 0 ? 'Выберите чаты' : `Выбрано: ${selectedIds.length}`}
          </Text>
          <View style={styles.panelButtons}>
            <Pressable
              style={[styles.panelBtn, selectedIds.length === 0 && styles.panelBtnDisabled]}
              onPress={markSelectedRead}
              disabled={selectedIds.length === 0}
            >
              <Text style={styles.panelBtnText}>Прочитано</Text>
            </Pressable>
            <Pressable
              style={[styles.panelBtn, styles.panelBtnDanger, selectedIds.length === 0 && styles.panelBtnDisabled]}
              onPress={deleteSelected}
              disabled={selectedIds.length === 0}
            >
              <TrashIcon size={18} color={colors.danger} />
              <Text style={styles.panelBtnDangerText}>Удалить</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800' },
  headerSide: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  action: { color: colors.accent, fontSize: font.sizeMD, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  input: { flex: 1, color: colors.text, fontSize: font.sizeMD, paddingVertical: spacing.md },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  checkboxWrap: { width: 22, height: 22 },
  checkboxEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.textMuted },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontSize: font.sizeLG, fontWeight: '700' },
  redDot: { position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.bg },

  rowBody: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  time: { color: colors.textMuted, fontSize: font.sizeXS },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  last: { flex: 1, color: colors.textMuted, fontSize: font.sizeSM },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  badgeText: { color: colors.accentText, fontSize: font.sizeXS, fontWeight: '800' },

  panel: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  panelCaption: { color: colors.textMuted, fontSize: font.sizeSM, textAlign: 'center', marginBottom: spacing.sm },
  panelButtons: { flexDirection: 'row', gap: spacing.sm },
  panelBtn: {
    flex: 1, flexDirection: 'row', gap: spacing.xs,
    alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  panelBtnDanger: { borderColor: colors.danger },
  panelBtnDisabled: { opacity: 0.4 },
  panelBtnText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  panelBtnDangerText: { color: colors.danger, fontSize: font.sizeMD, fontWeight: '700' },
});