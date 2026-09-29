import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, font } from '../theme';
import { SearchIcon, CheckCircle, TrashIcon } from '../components/Icons';
import { listConversations, markConversationRead } from '../api/chat';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '../utils/chatFormat';
import { loadHiddenChats, hideChats } from '../storage/chatStorage';

export default function ChatScreen({ navigation }) {
  const [query, setQuery] = useState('');
  // Диалоги приходят с бэкенда. Раньше тут лежали выдуманные собеседники,
  // из-за чего раздел выглядел работающим, хотя ни одного настоящего
  // сообщения в нём не было.
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const mapConversation = useCallback((c) => {
    // Собеседник зависит от роли: покупатель видит магазин, продавец —
    // покупателя.
    const iAmSeller = !!user?.id && c.seller?.seller_id === user.id;
    return {
      id: c.id,
      name: (iAmSeller ? c.buyer?.display_name : c.seller?.shop_name) || 'Диалог',
      rating: c.seller?.rating,
      phone: c.seller?.phone,
      last: c.last_message_preview || 'Нет сообщений',
      at: c.last_message_at || c.created_at,
      unread: c.unread_count || 0,
      dot: (c.unread_count || 0) > 0,
    };
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setError(null);
        try {
          const [res, hidden] = await Promise.all([
            listConversations({ limit: 50 }),
            loadHiddenChats(),
          ]);
          if (!alive) return;
          setThreads((res?.data ?? [])
            .filter((c) => !hidden.includes(c.id))
            .map(mapConversation));
        } catch (e) {
          if (alive) setError(e?.message || 'Не удалось загрузить чаты.');
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => { alive = false; };
    }, [mapConversation]),
  );
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const data = threads.filter((t) => (t.name || '').toLowerCase().includes(query.trim().toLowerCase()));

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
    else navigation.navigate('Conversation', {
      conversationId: item.id, name: item.name, rating: item.rating, phone: item.phone,
    });
  };

  const markSelectedRead = () => {
    if (selectedIds.length === 0) return;
    const ids = selectedIds;
    setThreads(threads.map((t) => (ids.includes(t.id) ? { ...t, unread: 0, dot: false } : t)));
    ids.forEach((id) => { markConversationRead(id).catch(() => {}); });
    exitSelectMode();
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      'Скрыть чаты?',
      `Будет скрыто чатов: ${selectedIds.length}. Они исчезнут только у вас — собеседник продолжит видеть переписку.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Скрыть',
          style: 'destructive',
          onPress: () => {
            const ids = selectedIds;
            setThreads(threads.filter((t) => !ids.includes(t.id)));
            hideChats(ids);
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
        contentContainerStyle={[
          { paddingHorizontal: spacing.lg },
          data.length === 0 && styles.emptyWrap,
        ]}
        ListEmptyComponent={(
          <Text style={styles.empty}>
            {loading ? 'Загружаем чаты...'
              : error || (query.trim()
                ? 'Ничего не найдено'
                : 'Пока нет переписок. Напишите продавцу со страницы товара — диалог появится здесь.')}
          </Text>
        )}
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
                  <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                {item.dot && <View style={styles.redDot} />}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.time}>{formatTime(item.at)}</Text>
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
              <Text style={styles.panelBtnDangerText}>Скрыть</Text>
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

  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: {
    color: colors.textMuted, fontSize: font.sizeMD,
    textAlign: 'center', lineHeight: 24, paddingHorizontal: spacing.lg,
  },

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