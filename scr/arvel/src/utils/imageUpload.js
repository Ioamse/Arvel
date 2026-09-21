// Общие помощники для выбора и загрузки картинок (фото товара, аватар).

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

// Лимиты берём из GET /config (allowed_image_content_types, max_image_bytes).
// Возвращает текст ошибки или null, если файл подходит.
export function imageProblem(asset, { allowedTypes = [], maxBytes = null } = {}) {
  const contentType = guessContentType(asset);
  if (allowedTypes.length && !allowedTypes.includes(contentType)) {
    return `Формат ${contentType} не поддерживается. Допустимы: ${allowedTypes.join(', ')}.`;
  }
  if (maxBytes && asset.fileSize && asset.fileSize > maxBytes) {
    return `Фото слишком большое. Максимум ${Math.round(maxBytes / 1048576)} МБ.`;
  }
  return null;
}
