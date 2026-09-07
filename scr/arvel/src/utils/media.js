import { API_BASE_URL } from '../api/client';

// Бэкенд отдаёт thumbnail_url/images[].url относительным путём
// ("/media/files/xxx.jpg") — без хоста Image из react-native такой uri
// загрузить не может, картинка просто не появляется. Достраиваем полный
// адрес; если путь уже абсолютный (начинается с http), не трогаем его.
export function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}
