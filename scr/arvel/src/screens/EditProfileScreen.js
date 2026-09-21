// Экран редактирования профиля.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import { uploadImage } from '../api/media';
import { updateMyShop } from '../api/shops';
import { toUploadAsset, imageProblem } from '../utils/imageUpload';
import { resolveMediaUrl } from '../utils/media';

export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile } = useAuth();
  const { allowedImageTypes, maxImageBytes } = useAppConfig();
  const [fullName, setFullName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  // Новый аватар, выбранный на этом экране, { uri, contentType, filename }.
  // Пока не нажали «Сохранить», на сервер ничего не уходит.
  const [newAvatar, setNewAvatar] = useState(null);

  const initial = fullName.trim().charAt(0).toUpperCase() || 'A';
  const avatarUri = newAvatar?.uri || resolveMediaUrl(user?.profile_pic_url);
  const isSeller = user?.role === 'seller';

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее в настройках, чтобы выбрать аватар.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    const problem = imageProblem(asset, { allowedTypes: allowedImageTypes, maxBytes: maxImageBytes });
    if (problem) {
      Alert.alert('Это фото не подходит', problem);
      return;
    }
    setNewAvatar(toUploadAsset(asset));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const patch = { display_name: fullName.trim() };
      let profilePicUrl = null;
      if (newAvatar) {
        profilePicUrl = await uploadImage(newAvatar);
        patch.profile_pic_url = profilePicUrl;
      }
      await updateProfile(patch);
      // Продавцу это же фото показываем как логотип магазина (seller.profile_pic_url
      // на карточке товара берётся из магазина, а не из профиля).
      if (profilePicUrl && isSeller) await updateMyShop({ profile_pic_url: profilePicUrl });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Не удалось сохранить', e.message || 'Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
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
            <TouchableOpacity style={styles.avatar} activeOpacity={0.8} onPress={pickAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraBadge} onPress={pickAvatar}>
              <Text style={styles.cameraIcon}>📷</Text>
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
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={saving || fullName.trim().length === 0}
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