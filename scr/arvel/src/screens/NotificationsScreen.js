import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, font } from '../theme';
import { BackIcon, ChatIcon } from '../components/Icons';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import { formatShortDate } from '../utils/time';

// В спеке единственный NotificationType — chat_message, поэтому и payload,
// и переход по тапу пока рассчитаны только на него.
export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listNotifications({ limit: 50 })
      .then((page) => setItems(page.data || []))
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  const openNotification = (item) => {
    if (!item.read_at) {
      markNotificationRead(item.id).catch(() => {});
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
    }
    const conversationId = item.payload?.conversation_id;
    if (item.type === 'chat_message' && conversationId) {
      navigation.navigate('Conversation', { conversationId });
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
    } catch (e) {
      Alert.alert('Не удалось отметить прочитанным', e.message || 'Попробуйте ещё раз.');
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = items.some((n) => !n.read_at);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}><BackIcon size={26} /></Pressable>
        <Text style={styles.headerTitle}>Уведомления</Text>
        <Pressable hitSlop={10} onPress={markAllRead} disabled={!hasUnread || markingAll}>
          <Text style={[styles.markAll, (!hasUnread || markingAll) && styles.markAllDisabled]}>Прочитать всё</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text style={styles.empty}>
              {error ? 'Не удалось загрузить уведомления' : 'Пока нет уведомлений'}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const unread = !item.read_at;
          const senderName = item.payload?.sender_display_name || item.payload?.sender_name;
          const title = senderName ? `Сообщение от ${senderName}` : 'Новое сообщение';
          const preview = item.payload?.preview || item.payload?.body || item.payload?.product_title;
          return (
            <Pressable style={styles.row} onPress={() => openNotification(item)}>
              <View style={styles.iconWrap}>
                <ChatIcon size={20} color={colors.accent} />
                {unread && <View style={styles.dot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>{title}</Text>
                {!!preview && <Text style={styles.preview} numberOfLines={1}>{preview}</Text>}
              </View>
              <Text style={styles.time}>{formatShortDate(item.created_at)}</Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { color: colors.text, fontSize: font.sizeLG, fontWeight: '800' },
  markAll: { color: colors.accent, fontSize: font.sizeSM, fontWeight: '700' },
  markAllDisabled: { color: colors.textFaint },

  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: { position: 'relative' },
  dot: { position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.bg },
  title: { color: colors.textMuted, fontSize: font.sizeMD, fontWeight: '600' },
  titleUnread: { color: colors.text, fontWeight: '800' },
  preview: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
  time: { color: colors.textFaint, fontSize: font.sizeXS },
});
