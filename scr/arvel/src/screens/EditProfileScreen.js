// Единый экран редактирования: профиль (PATCH /me) и, для продавца, магазин
// (PATCH /me/shop). Раньше это были два отдельных экрана с двумя кнопками в
// «Профиле» — формы почти одинаковые, и разносить их по разным экранам смысла
// не было.
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import { getMyShop, updateMyShop } from '../api/me';
import { pickAndUploadImage } from '../utils/upload';
import { resolveMediaUrl } from '../utils/media';

export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile } = useAuth();
  const { maxImageBytes, maxImageWidth, maxImageHeight, allowedImageContentTypes } = useAppConfig();
  const isSeller = user?.role === 'seller';

  const [fullName, setFullName] = useState(user?.name || '');

  // Блок магазина — только у продавца.
  const [loadingShop, setLoadingShop] = useState(isSeller);
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(resolveMediaUrl(user?.profile_pic_url));
  const [photoFileUrl, setPhotoFileUrl] = useState(undefined); // undefined = не менялось
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSeller) return undefined;
    let cancelled = false;
    getMyShop()
      .then((shop) => {
        if (cancelled) return;
        setShopName(shop.shop_name || '');
        setDescription(shop.description || '');
        // Фото одно; если у магазина своего нет — показываем профильное.
        setPhotoUri(resolveMediaUrl(shop.profile_pic_url) ?? resolveMediaUrl(user?.profile_pic_url));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingShop(false); });
    return () => { cancelled = true; };
  }, [isSeller, user?.profile_pic_url]);

  const initial = (isSeller ? shopName : fullName).trim().charAt(0).toUpperCase() || 'A';

  const changePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const result = await pickAndUploadImage({
        allowedContentTypes: allowedImageContentTypes,
        maxBytes: maxImageBytes,
        maxWidth: maxImageWidth,
        maxHeight: maxImageHeight,
      });
      if (!result.canceled) {
        setPhotoUri(result.uri);
        setPhotoFileUrl(result.fileUrl);
      } else if (result.permissionDenied) {
        Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее в настройках телефона, чтобы сменить фотографию.');
      }
    } catch (e) {
      Alert.alert('Не удалось загрузить фото', e.message || 'Попробуйте ещё раз.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const canSave =
    !saving &&
    !uploadingPhoto &&
    !loadingShop &&
    fullName.trim().length > 0 &&
    (!isSeller || shopName.trim().length > 0);

  // Аватар один на профиль и магазин, поэтому одно и то же значение уходит в
  // оба патча. Поддержку profile_pic_url в PATCH /me проверить по живому API
  // не удалось, так что если сервер это поле не примет — повторяем запрос без
  // него: имя всё равно должно сохраниться, а у продавца фото уже уехало в
  // магазин (именно оно видно покупателю на карточке товара и в магазине).
  const saveProfile = async () => {
    const patch = { display_name: fullName.trim() };
    if (photoFileUrl === undefined) {
      await updateProfile(patch);
      return true;
    }
    try {
      await updateProfile({ ...patch, profile_pic_url: photoFileUrl });
      return true;
    } catch (e) {
      if (e.status !== 400 && e.status !== 422) throw e;
      await updateProfile(patch);
      return false; // имя сохранено, фото профиля сервер не принял
    }
  };

  // Профиль и магазин — два разных запроса. Профиль сохраняем первым: если
  // упадёт второй, пользователю честно говорим, что именно не сохранилось,
  // и оставляем его на экране с введёнными данными.
  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    let profileSaved = false;
    try {
      const photoAccepted = await saveProfile();
      profileSaved = true;

      if (isSeller) {
        const patch = { shop_name: shopName.trim(), description: description.trim() || null };
        if (photoFileUrl !== undefined) patch.profile_pic_url = photoFileUrl;
        await updateMyShop(patch);
      }

      if (!photoAccepted && !isSeller) {
        Alert.alert('Фото не сохранено', 'Имя обновлено, но сервер не принял фото профиля.');
        return;
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        profileSaved ? 'Магазин не сохранён' : 'Не удалось сохранить',
        e.message || 'Попробуйте ещё раз.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingShop) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['top']}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Редактирование</Text>
          <View style={styles.back} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarBlock}>
            <View style={styles.avatar}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.cameraBadge} onPress={changePhoto} disabled={uploadingPhoto}>
              {uploadingPhoto
                ? <ActivityIndicator size="small" color={colors.accentText} />
                : <Text style={styles.cameraIcon}>📷</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Имя и фамилия</Text>
          <TextInput
            style={[styles.input, styles.inputActive]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Имя и фамилия"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />

          <Text style={styles.label}>Телефон</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.phoneText}>{user?.phone || '—'}</Text>
            <Text style={styles.check}>✓</Text>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeIcon}>🛡</Text>
            <Text style={styles.noticeText}>
              Номер телефона подтверждён и не может быть изменён здесь. Чтобы сменить номер — обратитесь в поддержку.
            </Text>
          </View>

          {isSeller && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Магазин</Text>

              <Text style={styles.label}>Название магазина</Text>
              <TextInput
                style={[styles.input, styles.inputActive]}
                value={shopName}
                onChangeText={setShopName}
                placeholder="Название магазина"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              <Text style={styles.label}>Описание</Text>
              <TextInput
                style={[styles.input, styles.inputActive, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Расскажите о вашем магазине"
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={4}
              />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>{saving ? 'Сохранение...' : 'Сохранить'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 8 },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { color: colors.text, fontSize: 34, lineHeight: 34 },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 20 },
  avatarBlock: { alignSelf: 'center', marginTop: 20, marginBottom: 8 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: 'rgba(255,255,255,0.5)', fontSize: 48, fontWeight: '600' },
  cameraBadge: { position: 'absolute', right: 2, bottom: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 28 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 20 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 20 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: colors.text },
  inputActive: { borderColor: colors.accent },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 16 },
  phoneText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  check: { color: colors.success, fontSize: 18, fontWeight: '700' },
  notice: { flexDirection: 'row', marginTop: 24, paddingRight: 10 },
  noticeIcon: { fontSize: 14, marginRight: 8, color: colors.textMuted },
  noticeText: { flex: 1, color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 20 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 20 },
  saveButton: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 18, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
});
