import { request } from './client';

// Магазин текущего продавца. Нужен его id: GET /products?shop_id= фильтрует
// именно по id магазина, а не по id пользователя.
export function getMyShop() {
  return request('/me/shop');
}

// patch: { shop_name?, description?, profile_pic_url? }. Фото магазина при
// регистрации продавца не задаётся — его выставляют уже после входа.
export function updateMyShop(patch) {
  return request('/me/shop', { method: 'PATCH', body: patch });
}
