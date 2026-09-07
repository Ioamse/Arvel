import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, radius, font } from '../theme';
import {
  StarIcon, HeartIcon, GridIcon, BellIcon, HelpIcon, DocIcon,
  LogoutIcon, ChevronRight, ChatIcon, SunIcon,
} from '../components/Icons';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useProducts } from '../context/ProductsContext';
import { dealsHistory } from '../data/products';

// Сумка для плитки «Заказы» / «Продажи»
function BagIcon({ size = 22, color = colors.accent }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8h14l-1 12H6L5 8z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 10V6a3 3 0 016 0v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function StatTile({ icon, value, label, onPress }) {
  return (
    <Pressable style={styles.statBox} onPress={onPress}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function SettingRow({ icon, label, onPress, danger }) {
  return (
    <Pressable style={styles.setRow} onPress={onPress}>
      {icon}
      <Text style={[styles.setLabel, danger && { color: colors.danger }]}>{label}</Text>
      {!danger && <ChevronRight size={20} />}
    </Pressable>
  );
}

export default function AccountScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { count: favCount } = useFavorites();
  const { products } = useProducts();
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const name = user?.name || 'Александр Петров';
  const initial = name.trim()[0]?.toUpperCase() || 'A';
  const isSeller = user?.role === 'seller';
  // is_admin приходит с бэкенда в /me и ортогонален role (см. OpenAPI) —
  // админом может быть и покупатель, не только продавец.
  const isAdmin = !!user?.is_admin;

  const myListingsCount = useMemo(
    () => products.filter((p) => p.mine).length,
    [products]
  );

  const confirmLogout = () => setLogoutConfirmVisible(true);

  // ФИКС: guardTab в MainTabs перехватывает только переключение вкладки,
  // когда пользователь уже разлогинен — а не сам момент выхода, если
  // он находится прямо на экране "Профиль". Без явного перехода экран
  // просто оставался на месте с user === null (заглушка вместо имени),
  // и выглядело так, будто кнопка ничего не делает.
  const handleLogout = async () => {
    setLogoutConfirmVisible(false);
    await signOut();
    navigation.getParent()?.navigate('Feed');
  };

  const openSupportChat = () => {
    navigation.navigate('Conversation', { name: 'Поддержка ARVELL', rating: 5.0 });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Шапка: заголовок жёлтым по центру */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Профиль</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Блок аватара */}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            {isSeller && (
              <>
                <View style={styles.ratingRow}>
                  <StarIcon size={16} />
                  <Text style={styles.ratingText}>4.8 · 34 отзыва</Text>
                </View>
                <View style={styles.sellerBadge}>
                  <Text style={styles.sellerBadgeText}>Продавец</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <Pressable style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.editText}>Редактировать профиль</Text>
        </Pressable>

        {/* Плитки статистики: 2 в ряд, набор зависит от роли */}
        <View style={styles.stats}>
          {isSeller ? (
            <>
              <StatTile
                icon={<BagIcon size={22} />}
                value="47"
                label="Продажи"
                onPress={() => navigation.navigate('Orders')}
              />
              <StatTile
                icon={<GridIcon size={22} color={colors.accent} />}
                value={String(myListingsCount)}
                label="Мои объявления"
                onPress={() => navigation.navigate('MyListings')}
              />
            </>
          ) : (
            <>
              <StatTile
                icon={<BagIcon size={22} />}
                value={String(dealsHistory.length)}
                label="Заказы"
                onPress={() => navigation.navigate('Orders')}
              />
              <StatTile
                icon={<HeartIcon size={22} color={colors.accent} />}
                value={String(favCount)}
                label="Избранное"
                onPress={() => navigation.getParent()?.navigate('Favorites')}
              />
            </>
          )}
        </View>

        {/* Настройки */}
        <Text style={styles.section}>Настройки</Text>
        <View style={styles.card}>
          <SettingRow
            icon={<BellIcon size={22} color={colors.text} />}
            label="Уведомления"
            onPress={() => navigation.navigate('Notifications')}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon={<ChatIcon size={22} color={colors.text} />}
            label="Чат с поддержкой"
            onPress={openSupportChat}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon={<HelpIcon size={22} />}
            label="Помощь"
            onPress={() => navigation.navigate('Help')}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon={<DocIcon size={22} />}
            label="Правила"
            onPress={() => navigation.navigate('Rules')}
          />
          {isAdmin && (
            <>
              <View style={styles.rowDivider} />
              <SettingRow
                icon={<SunIcon size={22} />}
                label="Админ-панель"
                onPress={() => navigation.navigate('AdminPanel')}
              />
            </>
          )}
          <View style={styles.rowDivider} />
          <SettingRow
            icon={<LogoutIcon size={22} />}
            label="Выйти"
            danger
            onPress={confirmLogout}
          />
        </View>

        <Text style={styles.version}>ARVELL · версия 1.4.0</Text>
      </ScrollView>

      <ConfirmDialog
        visible={logoutConfirmVisible}
        title="Выйти из аккаунта?"
        message="Вы вернётесь на экран входа."
        confirmText="Выйти"
        cancelText="Отмена"
        onCancel={() => setLogoutConfirmVisible(false)}
        onConfirm={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  headerTitle: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800' },

  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, marginTop: spacing.sm,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.text, fontSize: font.sizeXL, fontWeight: '800' },
  name: { color: colors.text, fontSize: 20, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingText: { color: colors.textMuted, fontSize: font.sizeMD },
  sellerBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.accent,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8,
  },
  sellerBadgeText: { color: colors.accentText, fontSize: font.sizeSM, fontWeight: '800' },

  // Серый контур, как в промте
  editBtn: {
    marginHorizontal: spacing.md, marginTop: spacing.lg,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl, paddingVertical: 14, alignItems: 'center',
  },
  editText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },

  stats: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.lg },
  statBox: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center', gap: 6,
  },
  statValue: { color: colors.text, fontSize: font.sizeXL, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: font.sizeSM },

  section: {
    color: colors.text, fontSize: font.sizeLG, fontWeight: '800',
    paddingHorizontal: spacing.md, marginTop: spacing.xl, marginBottom: spacing.md,
  },
  card: {
    marginHorizontal: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.md, overflow: 'hidden',
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  setLabel: { flex: 1, color: colors.text, fontSize: font.sizeMD, fontWeight: '600' },
  rowDivider: { height: 1, backgroundColor: colors.border, marginLeft: 52 },

  version: {
    color: colors.textFaint, fontSize: font.sizeXS,
    textAlign: 'center', marginTop: spacing.xl,
  },
});