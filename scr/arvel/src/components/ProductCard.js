import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, font } from '../theme';
import { HeartIcon, TeeIcon, SneakerIcon } from './Icons';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/price';
import { resolveMediaUrl } from '../utils/media';

// Товар приходит в одной из двух форм: реальный ProductSummary с бэкенда
// (brand — объект, price_minor — копейки) или локально добавленный мок из
// AddProductScreen (brand — строка, price — рубли; см. ProductsContext).
// Читаем оба варианта, пока создание объявлений не переведено на реальный
// POST /products (Phase 2).
function getBrandLabel(product) {
  return typeof product.brand === 'string' ? product.brand : product.brand?.name || '';
}

function getPriceLabel(product) {
  if (product.price_minor != null) return formatPrice(product.price_minor);
  if (product.price != null) return product.price.toLocaleString('ru-RU');
  return '—';
}

export default function ProductCard({ product, onPress }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isLoggedIn } = useAuth();
  const navigation = useNavigation();
  const liked = isFavorite(product.id);
  const Placeholder = product.kind === 'sneaker' ? SneakerIcon : TeeIcon;
  const imageUrl = resolveMediaUrl(product.thumbnail_url);

  const onLikePress = () => {
    if (!isLoggedIn) {
      navigation.navigate('Auth');
      return;
    }
    toggleFavorite(product.id, product);
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <Placeholder size={90} />
        )}

        <Pressable
          style={styles.likeBtn}
          hitSlop={8}
          onPress={onLikePress}
        >
          <View style={styles.likeCircle}>
            <HeartIcon
              size={16}
              color={liked ? colors.accent : colors.text}
              filled={liked}
            />
          </View>
        </Pressable>
      </View>

      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>{getBrandLabel(product)}</Text>
        <Text style={styles.title} numberOfLines={1}>{product.title}</Text>
        <Text style={styles.price}>{getPriceLabel(product)} ₽</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    // одиночная карточка в последнем ряду не растягивается на всю ширину
    maxWidth: '50%',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    margin: 6, // вместе с paddingHorizontal:10 списка даёт отступы как в макете
    overflow: 'hidden',
  },
  imageWrap: {
    height: 160,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  likeBtn: { position: 'absolute', top: spacing.sm + 2, right: spacing.sm + 2 },
  likeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: spacing.md },
  brand: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  title: { color: colors.textMuted, fontSize: font.sizeSM, marginTop: 2 },
  price: { color: colors.accent, fontSize: font.sizeMD, fontWeight: '800', marginTop: spacing.sm },
});
