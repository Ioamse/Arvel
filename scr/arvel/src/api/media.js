import { request, ApiError } from './client';
import { resolveMediaUrl } from '../utils/media';

const UPLOAD_TIMEOUT_MS = 60000;

// POST /media/uploads — presigned-ссылка для прямой загрузки в хранилище.
export function presignUpload({ contentType, filename }) {
  return request('/media/uploads', {
    method: 'POST',
    body: { content_type: contentType, filename: filename ?? null },
  });
}

// Полный цикл загрузки одной картинки: presign -> отправка байтов ->
// публичный file_url, который потом регистрируется в товаре/профиле.
export async function uploadImage({ uri, contentType, filename }) {
  const presign = await presignUpload({ contentType, filename });

  // Файл читаем как blob по локальному uri (file://, content://) и шлём
  // сырым телом — так presigned PUT ожидает байты, а не multipart.
  const blob = await (await fetch(uri)).blob();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(resolveMediaUrl(presign.upload_url), {
      method: presign.method || 'PUT',
      headers: presign.headers || { 'Content-Type': contentType },
      body: blob,
      signal: controller.signal,
    });
  } catch (e) {
    throw new ApiError({
      status: 0,
      code: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      detail: 'Не удалось загрузить фото. Проверьте соединение и попробуйте ещё раз.',
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      code: 'UPLOAD_FAILED',
      detail: `Хранилище отклонило фото (код ${res.status}).`,
    });
  }
  return presign.file_url;
}
