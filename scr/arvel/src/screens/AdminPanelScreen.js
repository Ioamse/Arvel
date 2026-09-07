import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon } from '../components/Icons';
import {
  listSellerInvites, createSellerInvite, revokeSellerInvite,
  listAdminUsers, banUser, unbanUser,
} from '../api/admin';

const TABS = [
  { key: 'invites', label: 'Инвайты' },
  { key: 'users', label: 'Пользователи' },
];

// SellerInviteStatus: created | used | expired | revoked (см. OpenAPI)
const INVITE_STATUS_LABEL = {
  created: 'Активен', used: 'Использован', expired: 'Истёк', revoked: 'Отозван',
};

const ROLE_LABEL = { user: 'Покупатель', seller: 'Продавец' };

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU');
}

// created_by/used_by с бэкенда — id пользователя, не имя (в API нет
// отдельного лукапа id → имя для этого места) — показываем укороченный id.
function shortId(id) {
  return id ? id.slice(0, 8) : '';
}

function InviteBadge({ status }) {
  return (
    <View style={[styles.badge, styles[`badge_${status}`]]}>
      <Text style={[styles.badgeText, styles[`badgeText_${status}`]]}>{INVITE_STATUS_LABEL[status] || status}</Text>
    </View>
  );
}

function InviteRow({ invite, onRevoke }) {
  return (
    <View style={styles.inviteRow}>
      <View style={styles.inviteHead}>
        <Text style={styles.inviteCode}>{invite.token}</Text>
        <InviteBadge status={invite.status} />
      </View>
      <Text style={styles.inviteSub}>
        Создал {shortId(invite.created_by)} · {formatDate(invite.created_at)} · истекает {formatDate(invite.expires_at)}
        {invite.used_by ? ` · использовал ${shortId(invite.used_by)}` : ''}
      </Text>
      {invite.status === 'created' && (
        <Pressable style={styles.revokeBtn} onPress={() => onRevoke(invite.id)}>
          <Text style={styles.revokeText}>Отозвать</Text>
        </Pressable>
      )}
    </View>
  );
}

function UserRow({ user, onToggleBan }) {
  const initial = user.display_name.trim()[0]?.toUpperCase() || '?';
  const banned = !user.is_active;
  return (
    <View style={styles.userRow}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{user.display_name}</Text>
        <Text style={styles.userSub}>{ROLE_LABEL[user.role] || user.role} · с {formatDate(user.created_at)}</Text>
      </View>
      <Pressable
        style={[styles.banBtn, banned && styles.unbanBtn]}
        onPress={() => onToggleBan(user.id, banned)}
      >
        <Text style={[styles.banText, banned && styles.unbanText]}>
          {banned ? 'Разбанить' : 'Забанить'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function AdminPanelScreen({ navigation }) {
  const [tab, setTab] = useState('invites');

  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [invitesError, setInvitesError] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);

  const loadInvites = useCallback(() => {
    setInvitesLoading(true);
    setInvitesError(null);
    listSellerInvites()
      .then((page) => setInvites(page.data || []))
      .catch((e) => setInvitesError(e))
      .finally(() => setInvitesLoading(false));
  }, []);

  const loadUsers = useCallback(() => {
    setUsersLoading(true);
    setUsersError(null);
    listAdminUsers()
      .then((page) => setUsers(page.data || []))
      .catch((e) => setUsersError(e))
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => { loadInvites(); }, [loadInvites]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const revokeInvite = (id) => {
    revokeSellerInvite(id)
      .then((updated) => setInvites((prev) => prev.map((i) => (i.id === id ? updated : i))))
      .catch((e) => Alert.alert('Не удалось отозвать', e.message || 'Попробуйте ещё раз.'));
  };

  const createInvite = () => {
    createSellerInvite()
      .then((invite) => setInvites((prev) => [invite, ...prev]))
      .catch((e) => Alert.alert('Не удалось создать инвайт', e.message || 'Попробуйте ещё раз.'));
  };

  const toggleBan = (id, banned) => {
    const action = banned ? unbanUser : banUser;
    action(id)
      .then((updated) => setUsers((prev) => prev.map((u) => (u.id === id ? updated : u))))
      .catch((e) => Alert.alert('Не удалось изменить статус', e.message || 'Попробуйте ещё раз.'));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}><BackIcon size={26} /></Pressable>
        <Text style={styles.headerTitle}>Админ-панель</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {tab === 'invites' && (
          <>
            <Pressable style={styles.createBtn} onPress={createInvite}>
              <Text style={styles.createBtnText}>+ Создать инвайт</Text>
            </Pressable>

            {invitesLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
            ) : invitesError ? (
              <Text style={styles.empty}>Не удалось загрузить инвайты</Text>
            ) : invites.length === 0 ? (
              <Text style={styles.empty}>Инвайтов пока нет</Text>
            ) : (
              invites.map((invite) => (
                <InviteRow key={invite.id} invite={invite} onRevoke={revokeInvite} />
              ))
            )}
          </>
        )}

        {tab === 'users' && (
          usersLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : usersError ? (
            <Text style={styles.empty}>Не удалось загрузить пользователей</Text>
          ) : (
            <View style={styles.card}>
              {users.map((user, i) => (
                <View key={user.id}>
                  <UserRow user={user} onToggleBan={toggleBan} />
                  {i < users.length - 1 && <View style={styles.rowBorder} />}
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerTitle: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800' },

  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tabBtn: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.pill,
    paddingVertical: 10, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: colors.accent },
  tabText: { color: colors.text, fontSize: font.sizeSM, fontWeight: '700' },
  tabTextActive: { color: colors.accentText },

  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  rowBorder: { height: 1, backgroundColor: colors.border },

  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },

  createBtn: {
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingVertical: 14, alignItems: 'center', marginBottom: spacing.md,
  },
  createBtnText: { color: colors.accentText, fontSize: font.sizeMD, fontWeight: '800' },

  inviteRow: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, gap: 6,
  },
  inviteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inviteCode: { color: colors.text, fontSize: font.sizeMD, fontWeight: '800' },
  inviteSub: { color: colors.textMuted, fontSize: font.sizeSM },

  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badge_created: { backgroundColor: colors.accent },
  badge_revoked: { backgroundColor: colors.danger },
  badge_used: { backgroundColor: colors.chipInactive },
  badge_expired: { backgroundColor: colors.chipInactive },
  badgeText: { fontSize: font.sizeXS, fontWeight: '800' },
  badgeText_created: { color: colors.accentText },
  badgeText_revoked: { color: colors.text },
  badgeText_used: { color: colors.textMuted },
  badgeText_expired: { color: colors.textMuted },

  revokeBtn: {
    alignSelf: 'flex-start', borderWidth: 1.5, borderColor: colors.danger,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 7, marginTop: 2,
  },
  revokeText: { color: colors.danger, fontSize: font.sizeSM, fontWeight: '700' },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '800' },
  userName: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  userSub: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },

  banBtn: {
    borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  unbanBtn: { backgroundColor: colors.accent, borderColor: colors.accent },
  banText: { color: colors.danger, fontSize: font.sizeSM, fontWeight: '700' },
  unbanText: { color: colors.accentText },
});
