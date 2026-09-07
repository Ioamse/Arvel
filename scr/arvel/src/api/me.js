import { request } from './client';

export function getMe() {
  return request('/me');
}

export function updateMe(patch) {
  return request('/me', { method: 'PATCH', body: patch });
}
