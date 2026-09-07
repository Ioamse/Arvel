import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, CameraIcon, ChevronRight, TeeIcon, SneakerIcon } from '../components/Icons';
import PrimaryButton from '../components/PrimaryButton';
import KeyboardAware from '../components/KeyboardAware';
import SuccessOverlay from '../components/SuccessOverlay';
import { useProducts } from '../context/ProductsContext';
import { useAuth } from '../context/AuthContext';

const PRODUCT_TYPES = ['Обувь', 'Футболка', 'Худи', 'Куртка', 'Рубашка', 'Брюки/Джинсы', 'Аксессуары', 'Другое'];
const BRANDS = ['Nike', 'Adidas', 'New Balance', 'Stone Island', 'Carhartt WIP', 'The North Face', 'Acne Studios', 'Ralph Lauren', 'Другой'];
const CONDITIONS = ['Отлично', 'Хорошо', 'Средне'];

const SIZE_PLACEHOLDER = {
  'Обувь': 'EUR 42',
  'Футболка': 'M',
  'Худи': 'L',
  'Куртка': 'M',
  'Рубашка': 'L',
  'Брюки/Джинсы': '32/32',
  'Аксессуары': 'One size',
  'Другое': 'M',
};

const MODEL_PLACEHOLDER = {
  'Обувь': 'Air Max 90',
  'Футболка': 'Базовая футболка',
  'Худи': 'Худи Hooded',
  'Куртка': 'Куртка зимняя',
  'Рубашка': 'Оксфорд',
  'Брюки/Джинсы': 'Прямые джинсы',
  'Аксессуары': 'Кепка 8-Ball',
  'Другое': 'Название модели',
};

function CheckIcon({ size = 18, color = colors.accent }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="5 12.5 9.5 17 19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DropdownField({ label, value, placeholder, options, open, onToggle, onSelect }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={onToggle}>
        <Text style={[styles.inputText, !value && styles.inputTextFaint]}>{value || placeholder}</Text>
        <View style={{ transform: [{ rotate: open ? '270deg' : '90deg' }] }}>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.dropdown}>
          {options.map((opt, i) => (
            <Pressable
              key={opt}
              style={[styles.dropdownItem, i < options.length - 1 && styles.dropdownItemBorder]}
              onPress={() => onSelect(opt)}
            >
              <Text style={styles.dropdownItemText}>{opt}</Text>
              {value === opt && <CheckIcon size={18} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AddProductScreen({ navigation }) {
  const { addProduct } = useProducts();
  const { user } = useAuth();
  const scrollRef = useRef(null);

  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [typeOpen, setTypeOpen] = useState(false);

  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);

  const [photos, setPhotos] = useState([false, false, false, false, false]);
  const [model, setModel] = useState('');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('Отлично');
  const [description, setDescription] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const finalType = type === 'Другое' ? customType.trim() : type;
  const finalBrand = brand === 'Другой' ? customBrand.trim() : brand;
  const canPublish =
    finalType.length > 0 &&
    finalBrand.length > 0 &&
    model.trim().length > 0 &&
    size.trim().length > 0 &&
    Number(price) > 0;

  const togglePhoto = (i) => {
    setPhotos((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const publish = () => {
    addProduct({
      brand: finalBrand,
      title: model.trim(),
      price: Number(price),
      size: size.trim() || '—',
      condition,
      verified: true,
      productType: finalType,
      kind: type === 'Обувь' ? 'sneaker' : 'tee',
      category: 'men',
      description: description.trim(),
      sellerName: user?.name || 'Вы',
    });
    setShowSuccess(true);
  };

  const formatPrice = (t) => t.replace(/\D/g, '');

  const KindIcon = type === 'Обувь' ? SneakerIcon : TeeIcon;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}><BackIcon size={26} /></Pressable>
        <Text style={styles.headerTitle}>Новый товар</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAware dismissOnTap={false}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DropdownField
          label="Тип товара"
          value={type}
          placeholder="Выберите тип товара"
          options={PRODUCT_TYPES}
          open={typeOpen}
          onToggle={() => setTypeOpen((v) => !v)}
          onSelect={(opt) => { setType(opt); setTypeOpen(false); }}
        />

        {type === 'Другое' && (
          <TextInput
            style={[styles.textInput, { marginTop: spacing.sm }]}
            placeholder="Уточните тип товара"
            placeholderTextColor={colors.textFaint}
            value={customType}
            onChangeText={setCustomType}
          />
        )}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Фотографии</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photos.map((hasPhoto, i) => {
            const isMain = i === 0;
            return (
              <Pressable
                key={i}
                style={[
                  styles.photoBox,
                  isMain && hasPhoto && styles.photoBoxMainFilled,
                  !hasPhoto && styles.photoBoxEmpty,
                ]}
                onPress={() => togglePhoto(i)}
              >
                {hasPhoto ? (
                  <>
                    <KindIcon size={40} />
                    {isMain && (
                      <View style={styles.mainBadge}>
                        <Text style={styles.mainBadgeText}>ГЛАВНОЕ</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <CameraIcon size={22} color={colors.accent} />
                    {isMain && <Text style={styles.photoHint}>главное</Text>}
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginTop: spacing.lg }}>
          <DropdownField
            label="Бренд"
            value={brand}
            placeholder="Выберите бренд"
            options={BRANDS}
            open={brandOpen}
            onToggle={() => setBrandOpen((v) => !v)}
            onSelect={(opt) => { setBrand(opt); setBrandOpen(false); }}
          />
        </View>

        {brand === 'Другой' && (
          <TextInput
            style={[styles.textInput, { marginTop: spacing.sm }]}
            placeholder="Введите бренд"
            placeholderTextColor={colors.textFaint}
            value={customBrand}
            onChangeText={setCustomBrand}
          />
        )}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Модель</Text>
        <TextInput
          style={styles.textInput}
          placeholder={MODEL_PLACEHOLDER[type] || 'Название модели'}
          placeholderTextColor={colors.textFaint}
          value={model}
          onChangeText={setModel}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Размер</Text>
        <TextInput
          style={styles.textInput}
          placeholder={SIZE_PLACEHOLDER[type] || 'M'}
          placeholderTextColor={colors.textFaint}
          value={size}
          onChangeText={setSize}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Цена, ₽</Text>
        <TextInput
          style={styles.textInput}
          placeholder="8 900"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          value={price}
          onChangeText={(t) => setPrice(formatPrice(t))}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Состояние</Text>
        <View style={styles.condRow}>
          {CONDITIONS.map((c) => (
            <Pressable
              key={c}
              style={[styles.condChip, condition === c && styles.condChipActive]}
              onPress={() => setCondition(c)}
            >
              <Text style={[styles.condText, condition === c && styles.condTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Описание</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Расскажите о состоянии, истории покупки, дефектах — это повышает доверие покупателей"
          placeholderTextColor={colors.textFaint}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
        />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Опубликовать" disabled={!canPublish} onPress={publish} />
      </View>
      </KeyboardAware>

      <SuccessOverlay
        visible={showSuccess}
        title="Товар опубликован"
        message="Ваш товар отправлен на проверку подлинности. После проверки он появится в ленте ARVELL"
        buttonText="Отлично"
        onClose={() => { setShowSuccess(false); navigation.goBack(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { color: colors.accent, fontSize: font.sizeLG, fontWeight: '800' },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  label: { color: colors.text, fontSize: font.sizeSM, fontWeight: '600', marginBottom: spacing.sm },

  photoRow: { gap: spacing.sm },
  photoBox: {
    width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  photoBoxEmpty: { borderColor: colors.border, borderStyle: 'dashed' },
  photoBoxMainFilled: { borderWidth: 2, borderColor: colors.accent, borderStyle: 'solid' },
  photoHint: { color: colors.textMuted, fontSize: font.sizeXS, marginTop: 4 },
  mainBadge: {
    position: 'absolute', left: 6, bottom: 6,
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  mainBadgeText: { color: colors.accentText, fontSize: 9, fontWeight: '800' },

  input: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  inputText: { color: colors.text, fontSize: font.sizeMD },
  inputTextFaint: { color: colors.textFaint },
  textInput: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    color: colors.text, fontSize: font.sizeMD,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },

  dropdown: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.sm, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemText: { color: colors.text, fontSize: font.sizeMD },

  condRow: { flexDirection: 'row', gap: spacing.sm },
  condChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  condChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  condText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  condTextActive: { color: colors.accentText },

  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
});
