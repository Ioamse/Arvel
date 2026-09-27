// Экран редактирования профиля.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme';
import { useAuth, isPlaceholderName } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import { uploadImage } from '../api/media';
import { updateMyShop } from '../api/shops';
import { toUploadAsset, prepareForUpload } from '../utils/imageUpload';
import { resolveMediaUrl } from '../utils/media';
import PhotoSourceSheet from '../components/PhotoSourceSheet';
import ConfirmDialog from '../components/ConfirmDialog';

export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile } = useAuth();
  const { maxImageWidth, maxImageHeight, maxImageBytes } = useAppConfig();
  // Номер телефона, который бэкенд подставляет вместо незаполненного имени,
  // никнеймом не считаем — поле тогда пустое.
  const initialNickname = isPlaceholderName(user) ? '' : (user?.name || '');
  const [nickname, setNickname] = useState(initialNickname);
  const [saving, setSaving] = useState(false);
  // Новый аватар, выбранный на этом экране, { uri, contentType, filename }.
  // Пока не нажали «Сохранить», на сервер ничего не уходит.
  const [newAvatar, setNewAvatar] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  // Уход с экрана, отложенный до ответа в диалоге «Сохранить изменения?».
  const [pendingLeave, setPendingLeave] = useState(null);

  const initial = nickname.trim().charAt(0).toUpperCase() || 'A';
  const avatarUri = newAvatar?.uri || resolveMediaUrl(user?.profile_pic_url);
  const isSeller = user?.role === 'seller';
  const canSave = nickname.trim().length > 0;
  const dirty = nickname.trim() !== initialNickname.trim() || !!newAvatar;

  // Выход «Назад» (кнопка, жест, системная кнопка Android) с несохранёнными
  // правками — сначала спрашиваем, сохранить ли их.
  const leaveGuard = useRef({ dirty, saving });
  leaveGuard.current = { dirty, saving };
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    const { dirty: isDirty, saving: isSaving } = leaveGuard.current;
    if (!isDirty || isSaving) return;
    e.preventDefault();
    setPendingLeave(e.data.action);
  }), [navigation]);

  const save = async () => {
    setSaving(true);
    leaveGuard.current.saving = true;
    try {
      const patch = { display_name: nickname.trim() };
      let profilePicUrl = null;
      if (newAvatar) {
        // Фото с камеры намного больше лимитов хранилища (GET /config) —
        // без ужатия оно отвечало 422.
        const prepared = await prepareForUpload(newAvatar, {
          maxWidth: maxImageWidth, maxHeight: maxImageHeight, maxBytes: maxImageBytes,
        });
        profilePicUrl = await uploadImage(prepared);
        patch.profile_pic_url = profilePicUrl;
      }
      await updateProfile(patch);
      // Продавцу это же фото показываем как логотип магазина (seller.profile_pic_url
      // на карточке товара берётся из магазина, а не из профиля).
      if (profilePicUrl && isSeller) await updateMyShop({ profile_pic_url: profilePicUrl });
      return true;
    } catch (e) {
      Alert.alert('Не удалось сохранить', e.message || 'Попробуйте ещё раз.');
      return false;
    } finally {
      setSaving(false);
      leaveGuard.current.saving = false;
    }
  };

  // После успешного сохранения правок больше нет — уходим без вопроса.
  const leave = (action) => {
    leaveGuard.current.dirty = false;
    if (action) navigation.dispatch(action);
    else navigation.goBack();
  };

  const onSave = async () => {
    if (await save()) leave();
  };

  const onLeaveSave = async () => {
    const action = pendingLeave;
    setPendingLeave(null);
    if (!canSave) {
      Alert.alert('Укажите никнейм', 'Без никнейма профиль сохранить нельзя.');
      return;
    }
    if (await save()) leave(action);
  };

  const onLeaveDiscard = () => {
    const action = pendingLeave;
    setPendingLeave(null);
    leave(action);
  };

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
            <TouchableOpacity style={styles.avatar} activeOpacity={0.8} onPress={() => setSheetVisible(true)}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraBadge} onPress={() => setSheetVisible(true)}>
              <Text style={styles.cameraIcon}>📷</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Никнейм</Text>
          <TextInput
            style={[styles.input, styles.inputActive]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Придумайте никнейм"
            autoCapitalize="none"
            autoCorrect={false}
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
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={saving || !canSave}
          >
            <Text style={styles.saveText}>{saving ? 'Сохранение...' : 'Сохранить'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PhotoSourceSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onPick={(asset) => setNewAvatar(toUploadAsset(asset))}
        onRemove={newAvatar ? () => setNewAvatar(null) : undefined}
      />

      <ConfirmDialog
        visible={!!pendingLeave}
        title="Сохранить изменения?"
        message="Вы изменили профиль, но не сохранили изменения."
        confirmText="Сохранить"
        cancelText="Не сохранять"
        confirmTone="accent"
        onConfirm={onLeaveSave}
        onCancel={onLeaveDiscard}
        onDismiss={() => setPendingLeave(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 8 },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { color: colors.text, fontSize: 34, lineHeight: 34 },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 20 },
  avatarBlock: { alignSelf: 'center', marginVertical: 20 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'rgba(255,255,255,0.5)', fontSize: 48, fontWeight: '600' },
  avatarImage: { width: 110, height: 110, borderRadius: 55 },
  cameraBadge: { position: 'absolute', right: 2, bottom: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { fontSize: 15 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 20 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: colors.text },
  inputActive: { borderColor: colors.accent },
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