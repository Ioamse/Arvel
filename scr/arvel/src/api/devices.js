import { request } from './client';

export function listDevices() {
  return request('/me/devices');
}

// token в пути должен быть URL-encoded (см. спеку) — Expo push-токен
// содержит [ и ], которые иначе сломают путь.
export function registerDevice(token, platform) {
  return request(`/me/devices/${encodeURIComponent(token)}`, {
    method: 'PUT',
    body: { platform },
  });
}

export function deleteDevice(token) {
  return request(`/me/devices/${encodeURIComponent(token)}`, { method: 'DELETE' });
}
