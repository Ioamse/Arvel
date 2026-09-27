// Общие помощники для выбора и загрузки картинок (фото товара, аватар).
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export function guessContentType(asset) {
  if (asset.mimeType) return asset.mimeType;
  const ext = String(asset.uri).split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

// Ассет из expo-image-picker -> то, что принимает uploadImage().
export function toUploadAsset(asset) {
  return { uri: asset.uri, contentType: guessContentType(asset), filename: asset.fileName || null };
}

// Качество JPEG, которое пробуем по очереди, пока файл не влезет в max_image_bytes.
const JPEG_QUALITIES = [0.85, 0.7, 0.55, 0.4];

async function byteSize(uri) {
  try {
    return (await (await fetch(uri)).blob()).size;
  } catch {
    return null;
  }
}

// Хранилище отвечает 422 на всё, что больше max_image_width × max_image_height
// или тяжелее max_image_bytes (см. GET /config), а фото с камеры телефона —
// это 3000–4000 px и несколько мегабайт. Поэтому перед загрузкой вписываем
// картинку в разрешённый размер и пережимаем в JPEG (заодно HEIC и прочие
// форматы, которых нет в allowed_image_content_types, становятся JPEG).
// Пока /config не загрузился, берём его текущие значения, чтобы не отправить
// заведомо отклоняемый файл.
export async function prepareForUpload(asset, limits = {}) {
  const maxWidth = limits.maxWidth || 800;
  const maxHeight = limits.maxHeight || 800;
  const maxBytes = limits.maxBytes || 2 * 1024 * 1024;
  // Размеры берём у декодированной картинки, а не у ассета пикера: после
  // кадрирования (allowsEditing) width/height ассета бывают неточными или пустыми.
  let image = await ImageManipulator.manipulate(asset.uri).renderAsync();
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  if (scale < 1) {
    image = await ImageManipulator.manipulate(image)
      .resize({
        width: Math.max(1, Math.floor(image.width * scale)),
        height: Math.max(1, Math.floor(image.height * scale)),
      })
      .renderAsync();
  }

  let result = null;
  for (const compress of JPEG_QUALITIES) {
    result = await image.saveAsync({ compress, format: SaveFormat.JPEG });
    const size = await byteSize(result.uri);
    if (size == null || size <= maxBytes) break;
  }

  const base = (asset.filename || 'photo').replace(/\.[^.]+$/, '');
  return { uri: result.uri, contentType: 'image/jpeg', filename: `${base}.jpg` };
}
