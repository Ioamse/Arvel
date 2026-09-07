import { request } from './client';

export function getAppConfig() {
  return request('/config', { auth: false });
}
