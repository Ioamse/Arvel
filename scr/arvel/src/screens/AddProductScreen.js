import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { colors, spacing, radius, font } from '../theme';
import { BackIcon, CameraIcon, ChevronRight, CloseIcon } from '../components/Icons';
import PrimaryButton from '../components/PrimaryButton';
import KeyboardAware from '../components/KeyboardAware';
import SuccessOverlay from '../components/SuccessOverlay';
import { useMyListings } from '../context/MyListingsContext';
import { useAppConfig, useMoney } from '../context/AppConfigContext';
import { listCategories, listBrands } from '../api/catalog';
import { createProduct } from '../api/products';
import { uploadImage } from '../api/media';
import { guessContentType } from '../utils/imageUpload';

const NO_BRAND = '';

function CheckIcon({ size = 18, color = colors.accent }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="5 12.5 9.5 17 19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// options: [{ value, label }]. Длинные списки (категории, бренды) прокручиваются
// внутри собственного окна, чтобы не растягивать всю форму.
function DropdownField({ label, value, placeholder, options, open, onToggle, onSelect, emptyText }) {
  const selected = options.find((o) => o.value === value);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={onToggle}>
        <Text style={[styles.inputText, !selected && styles.inputTextFaint]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <View style={{ transform: [{ rotate: open ? '270deg' : '90deg' }] }}>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.length === 0 && (
              <Text style={[styles.dropdownItemText, { padding: spacing.md }]}>{emptyText || 'Нет вариантов'}</Text>
            )}
            {options.map((opt, i) => (
              <Pressable
                key={String(opt.value)}
                style={[styles.dropdownItem, i < options.length - 1 && styles.dropdownItemBorder]}
                onPress={() => onSelect(opt.value)}
              >
                <Text style={styles.dropdownItemText}>{opt.label}</Text>
                {value === opt.value && <CheckIcon size={18} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// Значения размера по правилу из GET /config → size_systems.
// select — готовый список, numeric — min..max с шагом (без хвоста ".0").
function sizeOptionsFor(rule) {
  if (!rule) return [];
  if (rule.input_type === 'select') return (rule.values || []).map(String);
  if (rule.input_type === 'numeric') {
    const out = [];
    const count = Math.round((rule.max - rule.min) / rule.step);
    for (let i = 0; i <= count; i += 1) {
      out.push(String(Math.round((rule.min + i * rule.step) * 100) / 100));
    }
    return out;
  }
  return [];
}

// Текст ошибки API + подсказки по полям (422 приходит с fields[]).
function describeError(e) {
  const base = e?.message || 'Не удалось опубликовать товар. Попробуйте ещё раз.';
  const fields = Array.isArray(e?.fields)
    ? e.fields.map((f) => `${f.field}: ${f.message || f.code}`).join('\n')
    : '';
  return fields ? `${base}\n${fields}` : base;
}

export default function AddProductScreen({ navigation }) {
  const { reloadAfterChange } = useMyListings();
  const { symbol: currencySign } = useMoney();
  const {
    colors: colorOptions, conditions, sizeSystems,
    maxImages, maxImageBytes, allowedImageTypes, loading: configLoading, reload: reloadConfig,
  } = useAppConfig();
  const scrollRef = useRef(null);
  // uri -> file_url: если публикация упала уже после загрузки фото,
  // повторная попытка не заливает те же файлы заново.
  const uploadedRef = useRef({});

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [refsError, setRefsError] = useState(null);

  const [openKey, setOpenKey] = useState(null);
  const toggle = (key) => setOpenKey((k) => (k === key ? null : key));

  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState(NO_BRAND);
  const [photos, setPhotos] = useState([]); // [{ uri, contentType, filename }]
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('');
  const [sizeSystem, setSizeSystem] = useState('');
  const [sizeValue, setSizeValue] = useState('');
  const [waist, setWaist] = useState('');
  const [inseam, setInseam] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const loadRefs = useCallback(() => {
    setRefsError(null);
    Promise.all([listCategories(), listBrands({ limit: 100 })])
      .then(([cats, brs]) => {
        setCategories(cats.data || []);
        setBrands(brs.data || []);
      })
      .catch((e) => setRefsError(e));
  }, []);

  useEffect(() => { loadRefs(); }, [loadRefs]);

  // Товар можно привязать только к листовой категории; показываем путь
  // целиком («Одежда › Куртки»), чтобы одинаковые названия не путались.
  const categoryOptions = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const labelOf = (c) => {
      const names = [];
      for (let cur = c, guard = 0; cur && guard < 10; cur = byId.get(cur.parent_id), guard += 1) {
        names.unshift(cur.name);
      }
      return names.join(' › ');
    };
    return categories
      .filter((c) => c.is_leaf)
      .map((c) => ({ value: c.id, label: labelOf(c) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [categories]);

  const brandOptions = useMemo(
    () => [{ value: NO_BRAND, label: 'Без бренда' }, ...brands.map((b) => ({ value: b.id, label: b.name }))],
    [brands]
  );
  const colorChoices = useMemo(() => colorOptions.map((c) => ({ value: c.value, label: c.label })), [colorOptions]);
  const systemChoices = useMemo(() => sizeSystems.map((s) => ({ value: s.system, label: s.label })), [sizeSystems]);

  const rule = useMemo(() => sizeSystems.find((s) => s.system === sizeSystem) || null, [sizeSystems, sizeSystem]);
  const sizeChoices = useMemo(() => sizeOptionsFor(rule).map((v) => ({ value: v, label: v })), [rule]);

  const inRange = (raw, min, max) => /^\d+$/.test(raw) && Number(raw) >= min && Number(raw) <= max;
  const waistInseamValid = rule?.input_type === 'waist_inseam'
    && inRange(waist, rule.min_waist, rule.max_waist)
    && inRange(inseam, rule.min_inseam, rule.max_inseam);

  const sizeReady = !rule ? false
    : rule.input_type === 'none' ? true
    : rule.input_type === 'waist_inseam' ? waistInseamValid
    : sizeValue !== '';

  const canPublish =
    !submitting &&
    categoryId !== '' &&
    photos.length > 0 &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    color !== '' &&
    condition !== '' &&
    sizeReady &&
    Number(price) > 0;

  const onSelectSystem = (value) => {
    setSizeSystem(value);
    setSizeValue('');
    setWaist('');
    setInseam('');
    setOpenKey(null);
  };

  // --- Фото ---

  const addPhotos = async () => {
    const room = maxImages - photos.length;
    if (room <= 0) {
      Alert.alert('Достаточно фото', `В объявлении может быть не больше ${maxImages} фото.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее в настройках, чтобы выбрать фото.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: room,
      quality: 0.8,
    });
    if (res.canceled) return;

    const accepted = [];
    let rejected = 0;
    res.assets.forEach((asset) => {
      const contentType = guessContentType(asset);
      const typeOk = allowedImageTypes.length === 0 || allowedImageTypes.includes(contentType);
      const sizeOk = !maxImageBytes || !asset.fileSize || asset.fileSize <= maxImageBytes;
      if (typeOk && sizeOk) {
        accepted.push({ uri: asset.uri, contentType, filename: asset.fileName || null });
      } else {
        rejected += 1;
      }
    });
    if (accepted.length) setPhotos((prev) => [...prev, ...accepted].slice(0, maxImages));
    if (rejected) {
      const mb = maxImageBytes ? ` и до ${Math.round(maxImageBytes / 1048576)} МБ` : '';
      Alert.alert(
        'Часть фото не подошла',
        `Допустимы форматы: ${allowedImageTypes.join(', ') || 'JPEG, PNG, WebP'}${mb}. Пропущено: ${rejected}.`
      );
    }
  };

  const removePhoto = (uri) => setPhotos((prev) => prev.filter((p) => p.uri !== uri));

  // --- Публикация ---

  const publish = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const urls = [];
      for (let i = 0; i < photos.length; i += 1) {
        const p = photos[i];
        if (!uploadedRef.current[p.uri]) {
          setProgress(`Загрузка фото ${i + 1} из ${photos.length}…`);
          uploadedRef.current[p.uri] = await uploadImage(p);
        }
        urls.push(uploadedRef.current[p.uri]);
      }

      setProgress('Публикация…');
      await createProduct({
        category_id: categoryId,
        brand_id: brandId || null,
        title: title.trim(),
        description: description.trim(),
        price_minor: Math.round(Number(price) * 100),
        condition,
        color,
        size_system: sizeSystem,
        size_value: rule.input_type === 'none'
          ? null
          : rule.input_type === 'waist_inseam' ? `${Number(waist)}x${Number(inseam)}` : sizeValue,
        images: urls.map((url, position) => ({ url, position })),
      });

      // Сервер принял объявление — подтягиваем «Мои объявления» и общую ленту.
      reloadAfterChange();
      setShowSuccess(true);
    } catch (e) {
      setSubmitError(describeError(e));
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  const refsReady = !configLoading && sizeSystems.length > 0 && !refsError;

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
        {!refsReady && !configLoading && (
          <Pressable style={styles.notice} onPress={() => { reloadConfig(); loadRefs(); }}>
            <Text style={styles.noticeText}>
              Не удалось загрузить справочники (категории, размеры). Нажмите, чтобы повторить.
            </Text>
          </Pressable>
        )}

        <DropdownField
          label="Категория"
          value={categoryId}
          placeholder="Выберите категорию"
          options={categoryOptions}
          open={openKey === 'category'}
          onToggle={() => toggle('category')}
          onSelect={(v) => { setCategoryId(v); setOpenKey(null); }}
          emptyText="Категории не загружены"
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>
          {`Фотографии (${photos.length}/${maxImages})`}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photos.map((p, i) => (
            <View key={p.uri} style={[styles.photoBox, i === 0 && styles.photoBoxMainFilled]}>
              <Image source={{ uri: p.uri }} style={styles.photoImage} resizeMode="cover" />
              {i === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>ГЛАВНОЕ</Text>
                </View>
              )}
              <Pressable style={styles.removeBtn} hitSlop={8} onPress={() => removePhoto(p.uri)}>
                <CloseIcon size={12} color={colors.text} />
              </Pressable>
            </View>
          ))}
          {photos.length < maxImages && (
            <Pressable style={[styles.photoBox, styles.photoBoxEmpty]} onPress={addPhotos}>
              <CameraIcon size={22} color={colors.accent} />
              {photos.length === 0 && <Text style={styles.photoHint}>главное</Text>}
            </Pressable>
          )}
        </ScrollView>

        <View style={{ marginTop: spacing.lg }}>
          <DropdownField
            label="Бренд"
            value={brandId}
            placeholder="Выберите бренд"
            options={brandOptions}
            open={openKey === 'brand'}
            onToggle={() => toggle('brand')}
            onSelect={(v) => { setBrandId(v); setOpenKey(null); }}
          />
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Название</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Например, Air Max 90"
          placeholderTextColor={colors.textFaint}
          value={title}
          onChangeText={setTitle}
        />

        <View style={{ marginTop: spacing.lg }}>
          <DropdownField
            label="Цвет"
            value={color}
            placeholder="Выберите цвет"
            options={colorChoices}
            open={openKey === 'color'}
            onToggle={() => toggle('color')}
            onSelect={(v) => { setColor(v); setOpenKey(null); }}
          />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <DropdownField
            label="Система размеров"
            value={sizeSystem}
            placeholder="Выберите систему"
            options={systemChoices}
            open={openKey === 'system'}
            onToggle={() => toggle('system')}
            onSelect={onSelectSystem}
          />
        </View>

        {(rule?.input_type === 'select' || rule?.input_type === 'numeric') && (
          <View style={{ marginTop: spacing.lg }}>
            <DropdownField
              label="Размер"
              value={sizeValue}
              placeholder="Выберите размер"
              options={sizeChoices}
              open={openKey === 'size'}
              onToggle={() => toggle('size')}
              onSelect={(v) => { setSizeValue(v); setOpenKey(null); }}
            />
          </View>
        )}

        {rule?.input_type === 'waist_inseam' && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.label}>Размер: обхват талии × длина по внутреннему шву</Text>
            <View style={styles.waistRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder={`${rule.min_waist}–${rule.max_waist}`}
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                value={waist}
                onChangeText={(t) => setWaist(t.replace(/\D/g, ''))}
              />
              <Text style={styles.waistX}>×</Text>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder={`${rule.min_inseam}–${rule.max_inseam}`}
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                value={inseam}
                onChangeText={(t) => setInseam(t.replace(/\D/g, ''))}
              />
            </View>
          </View>
        )}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>{currencySign ? `Цена, ${currencySign}` : 'Цена'}</Text>
        <TextInput
          style={styles.textInput}
          placeholder="8900"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          value={price}
          onChangeText={(t) => setPrice(t.replace(/\D/g, ''))}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Состояние</Text>
        <View style={styles.condRow}>
          {conditions.map((c) => (
            <Pressable
              key={c.value}
              style={[styles.condChip, condition === c.value && styles.condChipActive]}
              onPress={() => setCondition(c.value)}
            >
              <Text style={[styles.condText, condition === c.value && styles.condTextActive]}>{c.label}</Text>
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

        {submitError && <Text style={styles.error}>{submitError}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={submitting ? (progress || 'Публикация…') : 'Опубликовать'}
          disabled={!canPublish || !refsReady}
          onPress={publish}
        />
      </View>
      </KeyboardAware>

      <SuccessOverlay
        visible={showSuccess}
        title="Товар опубликован"
        message="Ваше объявление сохранено и уже доступно покупателям в ленте ARVELL"
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

  notice: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  noticeText: { color: colors.danger, fontSize: font.sizeSM },
  error: { color: colors.danger, fontSize: font.sizeSM, marginTop: spacing.lg },

  photoRow: { gap: spacing.sm },
  photoBox: {
    width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  photoBoxEmpty: { borderColor: colors.border, borderStyle: 'dashed' },
  photoBoxMainFilled: { borderWidth: 2, borderColor: colors.accent, borderStyle: 'solid' },
  photoImage: { width: '100%', height: '100%' },
  photoHint: { color: colors.textMuted, fontSize: font.sizeXS, marginTop: 4 },
  mainBadge: {
    position: 'absolute', left: 6, bottom: 6,
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  mainBadgeText: { color: colors.accentText, fontSize: 9, fontWeight: '800' },
  removeBtn: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },

  input: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  inputText: { color: colors.text, fontSize: font.sizeMD, flex: 1, marginRight: spacing.sm },
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
  dropdownScroll: { maxHeight: 260 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemText: { color: colors.text, fontSize: font.sizeMD },

  waistRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waistX: { color: colors.textMuted, fontSize: font.sizeLG },

  condRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  condChip: { paddingHorizontal: spacing.lg, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  condChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  condText: { color: colors.text, fontSize: font.sizeMD, fontWeight: '700' },
  condTextActive: { color: colors.accentText },

  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
});
