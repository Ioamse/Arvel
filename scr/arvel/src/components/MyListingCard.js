import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { colors, spacing, radius, font } from '../theme';
import { CheckCircle, TeeIcon, TrashIcon } from './Icons';
import ConfirmDialog from './ConfirmDialog';
import { formatPrice } from '../utils/price';
import { resolveMediaUrl } from '../utils/media';

export default function MyListingCard({ product, onPress, onSetStatus, onArchive }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  // Модели "sold"/"delete" в бэкенде нет: жизненный цикл товара — это
  // active <-> out_of_stock, либо необратимо archived (скрыт, но хранится
  // для истории). "Продано" здесь — out_of_stock, "удалить" — archived.
  const outOfStock = product.status === 'out_of_stock';
  const photoUrl = resolveMediaUrl(product.thumbnail_url);

  const askArchive = () => {
    setMenuOpen(false);
    setConfirmVisible(true);
  };

  return (
    <Pressable style={[styles.card, outOfStock && styles.cardSold]} onPress={onPress}>
      <View style={styles.imageWrap}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <TeeIcon size={90} />
        )}
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, outOfStock ? styles.statusBadgeSold : styles.statusBadgeActive]}>
          <Text style={[styles.statusText, outOfStock ? styles.statusTextSold : styles.statusTextActive]}>
            {outOfStock ? 'Продано' : 'Активно'}
          </Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>{product.brand?.name || 'Без бренда'}</Text>
        <Text style={styles.title} numberOfLines={1}>{product.title}</Text>
        <Text style={styles.price}>{formatPrice(product.price_minor)} ₽</Text>
      </View>

      <View style={styles.menuWrap}>
        <Pressable style={styles.menuBtn} hitSlop={8} onPress={() => setMenuOpen((v) => !v)}>
          <TrashIcon size={16} color={colors.text} />
        </Pressable>

        {menuOpen && (
          <View style={styles.dropdown}>
            <Pressable
              style={[styles.dropdownItem, styles.dropdownItemBorder]}
              onPress={() => { setMenuOpen(false); onSetStatus(product.id, outOfStock ? 'active' : 'out_of_stock'); }}
            >
              <CheckCircle size={16} />
              <Text style={styles.dropdownText}>{outOfStock ? 'Вернуть в продажу' : 'Отметить проданным'}</Text>
            </Pressable>
            <Pressable style={styles.dropdownItem} onPress={askArchive}>
              <TrashIcon size={16} color={colors.danger} />
              <Text style={[styles.dropdownText, styles.dropdownTextDanger]}>Скрыть объявление</Text>
            </Pressable>
          </View>
        )}
      </View>

      <ConfirmDialog
        visible={confirmVisible}
        title="Скрыть объявление?"
        message="Товар будет скрыт из каталога и переведён в архив. Вернуть его в продажу будет нельзя."
        confirmText="Скрыть"
        cancelText="Отмена"
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => { setConfirmVisible(false); onArchive(product.id); }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: '50%',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    margin: 6,
  },
  cardSold: { opacity: 0.55 },
  imageWrap: {
    height: 160,
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },

  statusRow: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  statusBadge: {
    alignSelf: 'flex-start', borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusBadgeActive: { backgroundColor: colors.accentDim },
  statusBadgeSold: { backgroundColor: colors.chipInactive },
  statusText: { fontSize: font.sizeXS, fontWeight: '800' },
  statusTextActive: { color: colors.accent },
  statusTextSold: { color: colors.textMuted },

  info: { padding: spacing.md, paddingTop: spacing.sm },
  brand: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  title: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
  price: { color: colors.accent, fontSize: font.sizeMD, fontWeight: '800', marginTop: spacing.sm },

  menuWrap: { position: 'absolute', top: spacing.sm + 2, right: spacing.sm + 2 },
  menuBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute', top: 38, right: 0, minWidth: 190,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', zIndex: 20, elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownText: { color: colors.text, fontSize: font.sizeSM, fontWeight: '600' },
  dropdownTextDanger: { color: colors.danger },
});
