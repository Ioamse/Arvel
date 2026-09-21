import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, CameraIcon, ChevronRight, CloseIcon } from '../components/Icons';
import PrimaryButton from '../components/PrimaryButton';
import KeyboardAware from '../components/KeyboardAware';
import SuccessOverlay from '../components/SuccessOverlay';
import { useProducts } from '../context/ProductsContext';
import { useAppConfig } from '../context/AppConfigContext';
import { listCategories, listBrands } from '../api/catalog';
import { createProduct, addProductImage } from '../api/products';
import { pickAndUploadImage } from '../utils/upload';
import { numericSizeValues, rangeValues, waistInseamValue } from '../utils/sizeSystem';

function CheckIcon({ size = 18, color = colors.accent }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="5 12.5 9.5 17 19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Дропдаун с плоским списком строк — используется и напрямую (система
// размера), и как основа для полей, у которых значение и подпись совпадают.
function DropdownField({ label, value, placeholder, options, open, onToggle, onSelect, disabled }) {
  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={[styles.input, disabled && styles.inputDisabled]} onPress={disabled ? undefined : onToggle}>
        <Text style={[styles.inputText, !value && styles.inputTextFaint]}>{value || placeholder}</Text>
        <View style={{ transform: [{ rotate: open ? '270deg' : '90deg' }] }}>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.dropdown}>
          <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
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
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function ChipGroup({ options, value, onSelect }) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          style={[styles.chip, value === opt.value && styles.chipActive]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Строит "Мужчины / Обувь / Кроссовки" из parent_id, для подписи под полем
// категории — API отдаёт только плоский список + path (не для показа).
function ancestryLabel(category, byId) {
  const names = [category.name];
  let current = category;
  while (current.parent_id && byId.has(current.parent_id)) {
    current = byId.get(current.parent_id);
    names.unshift(current.name);
  }
  return names.join(' / ');
}

// Модалка выбора категории: плоский список из GET /categories, дерево и
// навигация по уровням строятся на клиенте через parent_id (см. описание
// эндпоинта в спеке — "the client builds the tree").
function CategoryPickerModal({ visible, categories, onSelect, onClose }) {
  const [stack, setStack] = useState([]);
  useEffect(() => {
    if (visible) setStack([]);
  }, [visible]);

  const currentParentId = stack.length ? stack[stack.length - 1].id : null;
  const level = categories.filter((c) => (c.parent_id || null) === currentParentId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            {stack.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => setStack((s) => s.slice(0, -1))}>
                <BackIcon size={22} />
              </Pressable>
            ) : (
              <View style={{ width: 22 }} />
            )}
            <Text style={styles.modalTitle} numberOfLines={1}>
              {stack.length ? stack[stack.length - 1].name : 'Категория'}
            </Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <CloseIcon size={20} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }}>
            {level.length === 0 ? (
              <Text style={styles.modalEmpty}>Нет подкатегорий</Text>
            ) : (
              level.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.modalItem}
                  onPress={() => {
                    if (item.is_leaf) onSelect(item);
                    else setStack((s) => [...s, item]);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {!item.is_leaf && <ChevronRight size={18} color={colors.textMuted} />}
                </Pressable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BrandField({ brand, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      listBrands({ q: query || undefined, limit: 20 })
        .then((res) => { if (!cancelled) setResults(res.data || []); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, query]);

  return (
    <View>
      <Text style={styles.label}>Бренд</Text>
      <Pressable style={styles.input} onPress={() => setOpen((v) => !v)}>
        <Text style={[styles.inputText, !brand && styles.inputTextFaint]}>{brand?.name || 'Без бренда'}</Text>
        <View style={{ transform: [{ rotate: open ? '270deg' : '90deg' }] }}>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.dropdown}>
          <TextInput
            style={styles.brandSearchInput}
            placeholder="Поиск бренда"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            <Pressable
              style={[styles.dropdownItem, styles.dropdownItemBorder]}
              onPress={() => { onSelect(null); setOpen(false); }}
            >
              <Text style={styles.dropdownItemText}>Без бренда</Text>
              {!brand && <CheckIcon size={18} />}
            </Pressable>
            {loading ? (
              <ActivityIndicator color={colors.accent} style={{ margin: spacing.md }} />
            ) : (
              results.map((b, i) => (
                <Pressable
                  key={b.id}
                  style={[styles.dropdownItem, i < results.length - 1 && styles.dropdownItemBorder]}
                  onPress={() => { onSelect(b); setOpen(false); }}
                >
                  <Text style={styles.dropdownItemText}>{b.name}</Text>
                  {brand?.id === b.id && <CheckIcon size={18} />}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function AddProductScreen({ navigation }) {
  const { refresh } = useProducts();
  const {
    colors: colorOptions, conditions, sizeSystems,
    maxImagesPerProduct, maxImageBytes, maxImageWidth, maxImageHeight, allowedImageContentTypes,
  } = useAppConfig();
  const scrollRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [categoriesById, setCategoriesById] = useState(new Map());
  const [category, setCategory] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    listCategories()
      .then((res) => {
        const data = res.data || [];
        setCategories(data);
        setCategoriesById(new Map(data.map((c) => [c.id, c])));
      })
      .catch(() => {});
  }, []);

  const [brand, setBrand] = useState(null);
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState(null);
  const [color, setColor] = useState(null);

  const [sizeSystemOpen, setSizeSystemOpen] = useState(false);
  const [sizeSystem, setSizeSystem] = useState(null); // выбранный SizeSystemRule
  const [sizeValueOpen, setSizeValueOpen] = useState(false);
  const [sizeValue, setSizeValue] = useState('');
  const [waistOpen, setWaistOpen] = useState(false);
  const [waist, setWaist] = useState('');
  const [inseamOpen, setInseamOpen] = useState(false);
  const [inseam, setInseam] = useState('');

  const maxPhotos = maxImagesPerProduct || 5;
  const [photos, setPhotos] = useState([]); // [{uri, fileUrl} | {uploading:true} | undefined]
  const [publishing, setPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const onSelectSizeSystem = (label) => {
    const rule = sizeSystems.find((s) => s.label === label);
    setSizeSystem(rule || null);
    setSizeValue('');
    setWaist('');
    setInseam('');
    setSizeSystemOpen(false);
  };

  const resolvedSizeValue = !sizeSystem
    ? null
    : sizeSystem.input_type === 'none'
      ? null
      : sizeSystem.input_type === 'waist_inseam'
        ? waistInseamValue(waist, inseam)
        : sizeValue || null;

  const sizeReady = !sizeSystem
    ? false
    : sizeSystem.input_type === 'none'
      ? true
      : !!resolvedSizeValue;

  const photosUploading = photos.some((p) => p?.uploading);
  const hasPhoto = photos.some((p) => p?.fileUrl);

  const canPublish =
    !!category &&
    model.trim().length > 0 &&
    description.trim().length > 0 &&
    Number(price) > 0 &&
    !!condition &&
    !!color &&
    sizeReady &&
    hasPhoto &&
    !photosUploading &&
    !publishing;

  const pickPhotoAt = async (i) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[i] = { uploading: true };
      return next;
    });
    try {
      const result = await pickAndUploadImage({
        allowedContentTypes: allowedImageContentTypes,
        maxBytes: maxImageBytes,
        maxWidth: maxImageWidth,
        maxHeight: maxImageHeight,
      });
      setPhotos((prev) => {
        const next = [...prev];
        next[i] = result.canceled ? null : { uri: result.uri, fileUrl: result.fileUrl };
        return next;
      });
      if (result.permissionDenied) {
        Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее в настройках телефона, чтобы добавить фотографию.');
      }
    } catch (e) {
      setPhotos((prev) => {
        const next = [...prev];
        next[i] = null;
        return next;
      });
      Alert.alert('Не удалось загрузить фото', e.message || 'Попробуйте ещё раз.');
    }
  };

  const removePhotoAt = (i) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[i] = null;
      return next;
    });
  };

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    try {
      // position нумеруем по порядку уже заполненных слотов: пользователь
      // может оставить дырки (заполнить 2-й квадрат, а 1-й нет), и тогда
      // первая картинка уезжала бы на position 1 — без position 0 превью
      // объявления у покупателя не находилось.
      const images = photos
        .filter((p) => p?.fileUrl)
        .map((p, i) => ({ url: p.fileUrl, position: i }));
      const created = await createProduct({
        category_id: category.id,
        brand_id: brand?.id ?? null,
        title: model.trim(),
        description: description.trim(),
        price_minor: Math.round(Number(price) * 100),
        condition,
        color,
        size_system: sizeSystem.system,
        size_value: sizeSystem.input_type === 'none' ? null : resolvedSizeValue,
        images,
      });

      // Страховка: объявления, созданные из приложения, приходили обратно с
      // images: [] — то есть POST /products поле `images` не применил. Без
      // картинок объявление у покупателя выглядит пустой карточкой, поэтому
      // если сервер их не принял, досылаем каждую отдельным
      // POST /products/{id}/images.
      if (created?.id && images.length && !created.images?.length) {
        for (const image of images) {
          await addProductImage(created.id, image);
        }
      }

      refresh();
      setShowSuccess(true);
    } catch (e) {
      Alert.alert('Не удалось опубликовать', e.message || 'Попробуйте ещё раз.');
    } finally {
      setPublishing(false);
    }
  };

  const formatPriceInput = (t) => t.replace(/\D/g, '');

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
        <Text style={styles.label}>Категория</Text>
        <Pressable style={styles.input} onPress={() => setCategoryModalVisible(true)}>
          <Text style={[styles.inputText, !category && styles.inputTextFaint]} numberOfLines={1}>
            {category ? ancestryLabel(category, categoriesById) : 'Выберите категорию'}
          </Text>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Фотографии (минимум 1)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {Array.from({ length: maxPhotos }).map((_, i) => {
            const slot = photos[i];
            const isMain = i === 0;
            return (
              <Pressable
                key={i}
                style={[styles.photoBox, !slot && styles.photoBoxEmpty, isMain && slot?.uri && styles.photoBoxMainFilled]}
                onPress={() => { if (!slot && !photosUploading) pickPhotoAt(i); }}
                disabled={!!slot || photosUploading}
              >
                {slot?.uploading ? (
                  <ActivityIndicator color={colors.accent} />
                ) : slot?.uri ? (
                  <>
                    <Image source={{ uri: slot.uri }} style={styles.photoImage} />
                    {isMain && (
                      <View style={styles.mainBadge}>
                        <Text style={styles.mainBadgeText}>ГЛАВНОЕ</Text>
                      </View>
                    )}
                    <Pressable hitSlop={8} style={styles.photoRemove} onPress={() => removePhotoAt(i)}>
                      <CloseIcon size={12} color={colors.text} />
                    </Pressable>
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
          <BrandField brand={brand} onSelect={setBrand} />
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Модель</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Например, Air Max 90"
          placeholderTextColor={colors.textFaint}
          value={model}
          onChangeText={setModel}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Цвет</Text>
        <ChipGroup options={colorOptions} value={color} onSelect={setColor} />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Система размеров</Text>
        <DropdownField
          value={sizeSystem?.label}
          placeholder={sizeSystems.length ? 'Выберите систему' : 'Загрузка...'}
          options={sizeSystems.map((s) => s.label)}
          open={sizeSystemOpen}
          onToggle={() => setSizeSystemOpen((v) => !v)}
          onSelect={onSelectSizeSystem}
          disabled={!sizeSystems.length}
        />

        {sizeSystem?.input_type === 'select' && (
          <View style={{ marginTop: spacing.sm }}>
            <DropdownField
              label="Размер"
              value={sizeValue}
              placeholder="Выберите размер"
              options={sizeSystem.values}
              open={sizeValueOpen}
              onToggle={() => setSizeValueOpen((v) => !v)}
              onSelect={(v) => { setSizeValue(v); setSizeValueOpen(false); }}
            />
          </View>
        )}

        {sizeSystem?.input_type === 'numeric' && (
          <View style={{ marginTop: spacing.sm }}>
            <DropdownField
              label="Размер"
              value={sizeValue}
              placeholder="Выберите размер"
              options={numericSizeValues(sizeSystem)}
              open={sizeValueOpen}
              onToggle={() => setSizeValueOpen((v) => !v)}
              onSelect={(v) => { setSizeValue(v); setSizeValueOpen(false); }}
            />
          </View>
        )}

        {sizeSystem?.input_type === 'waist_inseam' && (
          <View style={{ marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <DropdownField
                label="Талия"
                value={waist}
                placeholder="—"
                options={rangeValues(sizeSystem.min_waist, sizeSystem.max_waist)}
                open={waistOpen}
                onToggle={() => setWaistOpen((v) => !v)}
                onSelect={(v) => { setWaist(v); setWaistOpen(false); }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DropdownField
                label="Длина"
                value={inseam}
                placeholder="—"
                options={rangeValues(sizeSystem.min_inseam, sizeSystem.max_inseam)}
                open={inseamOpen}
                onToggle={() => setInseamOpen((v) => !v)}
                onSelect={(v) => { setInseam(v); setInseamOpen(false); }}
              />
            </View>
          </View>
        )}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Цена, ₽</Text>
        <TextInput
          style={styles.textInput}
          placeholder="8 900"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          value={price}
          onChangeText={(t) => setPrice(formatPriceInput(t))}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Состояние</Text>
        <ChipGroup options={conditions} value={condition} onSelect={setCondition} />

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

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <PrimaryButton
          title={publishing ? 'Публикация...' : 'Опубликовать'}
          disabled={!canPublish}
          onPress={publish}
        />
      </SafeAreaView>
      </KeyboardAware>

      <CategoryPickerModal
        visible={categoryModalVisible}
        categories={categories}
        onSelect={(c) => { setCategory(c); setCategoryModalVisible(false); }}
        onClose={() => setCategoryModalVisible(false)}
      />

      <SuccessOverlay
        visible={showSuccess}
        title="Товар опубликован"
        message="Ваш товар уже виден в ленте ARVELL."
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
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoBoxEmpty: { borderColor: colors.border, borderStyle: 'dashed' },
  photoBoxMainFilled: { borderWidth: 2, borderColor: colors.accent },
  photoImage: { width: '100%', height: '100%' },
  photoHint: { color: colors.textMuted, fontSize: font.sizeXS, marginTop: 4 },
  mainBadge: {
    position: 'absolute', left: 6, bottom: 6,
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  mainBadgeText: { color: colors.accentText, fontSize: 9, fontWeight: '800' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },

  input: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  inputDisabled: { opacity: 0.5 },
  inputText: { color: colors.text, fontSize: font.sizeMD, flexShrink: 1 },
  inputTextFaint: { color: colors.textFaint },
  textInput: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    color: colors.text, fontSize: font.sizeMD,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  brandSearchInput: {
    color: colors.text, fontSize: font.sizeMD,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },

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

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: font.sizeSM, fontWeight: '700' },
  chipTextActive: { color: colors.accentText },

  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '75%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: font.sizeMD, fontWeight: '800' },
  modalEmpty: { color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalItemText: { color: colors.text, fontSize: font.sizeMD },
});
