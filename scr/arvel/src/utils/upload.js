import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { presignUpload } from '../api/media';

// Бэкенд принимает только jpeg/png/webp (GET /config), поэтому картинку
// всегда перекодируем сами — так content-type гарантированно совпадает с
// реальными байтами файла.
const SAVE_FORMATS = [
  ['image/jpeg', SaveFormat.JPEG],
  ['image/png', SaveFormat.PNG],
  ['image/webp', SaveFormat.WEBP],
];

function pickSaveFormat(allowedContentTypes) {
  if (!allowedContentTypes?.length) return SAVE_FORMATS[0];
  return SAVE_FORMATS.find(([mime]) => allowedContentTypes.includes(mime)) ?? SAVE_FORMATS[0];
}

// Ширина, при которой картинка влезает в max_image_width/max_image_height из
// GET /config с сохранением пропорций. null — если лимитов нет или картинка
// уже меньше (увеличивать не нужно).
function targetWidth(asset, maxWidth, maxHeight) {
  const { width, height } = asset;
  if (!width || !height) return maxWidth ?? null;
  const scale = Math.min(1, maxWidth ? maxWidth / width : 1, maxHeight ? maxHeight / height : 1);
  return scale < 1 ? Math.max(1, Math.round(width * scale)) : null;
}

// Ресайзит и сжимает, пока файл не влезет в max_image_bytes. Размер меряем по
// реальному блобу: asset.fileSize на Android — это размер ИСХОДНОГО файла из
// MediaStore (на iOS — уже сконвертированного), поэтому доверять ему нельзя.
async function encodeWithinLimit(uri, { width, maxBytes, format }) {
  let currentWidth = width;
  let compress = 0.8;
  let last = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const ctx = ImageManipulator.manipulate(uri);
    if (currentWidth) ctx.resize({ width: currentWidth });
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ format, compress });

    const blob = await (await fetch(saved.uri)).blob();
    last = { uri: saved.uri, blob };
    if (!maxBytes || blob.size <= maxBytes) return last;

    // Не влезли — сначала режем качество, дальше уменьшаем сторону.
    currentWidth = Math.max(1, Math.round((currentWidth || saved.width) * 0.75));
    compress = Math.max(0.4, compress - 0.2);
  }

  throw new Error(
    `Не удалось сжать фото до ${Math.round(maxBytes / (1024 * 1024))} МБ. Попробуйте другое изображение.`,
  );
}

// Открывает галерею, приводит фото к лимитам из GET /config, загружает по
// presigned URL из POST /media/uploads и возвращает file_url для регистрации
// (например через `images` в POST /products, или PATCH /me / PATCH /me/shop
// для аватара).
export async function pickAndUploadImage({ allowedContentTypes, maxBytes, maxWidth, maxHeight } = {}) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { canceled: true, permissionDenied: true };
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Сжимаем не здесь, а в encodeWithinLimit — сюда просим оригинал, чтобы
    // не терять качество на двойной перекодировке.
    quality: 1,
    // По умолчанию ("automatic") iOS отдаёт фото в исходном формате — для
    // большинства айфонов это HEIC, который ImageManipulator на iOS читает,
    // но лишняя конвертация системой дешевле. "compatible" просит систему
    // выдать JPEG.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (res.canceled) return { canceled: true };

  const asset = res.assets[0];
  const [contentType, format] = pickSaveFormat(allowedContentTypes);

  const { uri, blob } = await encodeWithinLimit(asset.uri, {
    width: targetWidth(asset, maxWidth, maxHeight),
    maxBytes,
    format,
  });

  const presigned = await presignUpload({ contentType, filename: asset.fileName ?? null });

  const uploadRes = await fetch(presigned.upload_url, {
    method: presigned.method || 'PUT',
    headers: { 'Content-Type': contentType, ...(presigned.headers || {}) },
    body: blob,
  });
  if (!uploadRes.ok) {
    throw new Error(`Не удалось загрузить изображение (${uploadRes.status})`);
  }

  return { canceled: false, uri, fileUrl: presigned.file_url };
}
