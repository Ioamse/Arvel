import { request } from './client';

export function getMe() {
  return request('/me');
}

export function updateMe(patch) {
  return request('/me', { method: 'PATCH', body: patch });
}

export function getMyShop() {
  return request('/me/shop');
}

export function updateMyShop(patch) {
  return request('/me/shop', { method: 'PATCH', body: patch });
}
