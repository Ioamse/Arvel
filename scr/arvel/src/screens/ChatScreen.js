import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { SearchIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../context/ConversationsContext';
import { resolveMediaUrl } from '../utils/media';
import { formatShortDate } from '../utils/time';

export default function ChatScreen({ navigation }) {
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const { conversations, loading, error, refresh } = useConversations();
  const [query, setQuery] = useState('');

  // Экран не размонтируется при переходе в диалог — обновляем список при
  // каждом возврате в фокус, чтобы последнее сообщение/счётчик были свежими.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refresh);
    return unsubscribe;
  }, [navigation, refresh]);

  const nameOf = (c) => (isSeller ? c.buyer?.display_name : c.seller?.shop_name) || '—';

  const data = conversations.filter((c) =>
    nameOf(c).toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Чаты</Text>
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
        contentContainerStyle={{ paddingHorizontal: spacing.lg, flexGrow: 1 }}
        refreshing={loading}
        onRefresh={refresh}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text style={styles.empty}>
              {error ? 'Не удалось загрузить чаты' : 'Пока нет переписок'}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const name = nameOf(item);
          const initial = name.trim()[0]?.toUpperCase() || '?';
          const photoUrl = resolveMediaUrl(item.product?.thumbnail_url);
          return (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('Conversation', { conversationId: item.id })}
            >
              <View style={styles.avatarWrap}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                )}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  <Text style={styles.time}>{formatShortDate(item.last_message_at)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.last} numberOfLines={1}>
                    {item.last_message_preview || item.product?.title || 'Нет сообщений'}
                  </Text>
                  {item.unread_count > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  input: { flex: 1, color: colors.text, fontSize: font.sizeMD, paddingVertical: spacing.md },

  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontSize: font.sizeLG, fontWeight: '700' },

  rowBody: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  time: { color: colors.textMuted, fontSize: font.sizeXS },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  last: { flex: 1, color: colors.textMuted, fontSize: font.sizeSM },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  badgeText: { color: colors.accentText, fontSize: font.sizeXS, fontWeight: '800' },
});
