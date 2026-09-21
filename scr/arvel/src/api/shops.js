import { request } from './client';

export function getShop(shopId) {
  return request(`/shops/${shopId}`, { auth: false });
}
