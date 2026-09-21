import { request, buildQuery } from './client';

// Покупатель: свои подтверждённые покупки.
export function listMyPurchases({ cursor, limit } = {}) {
  return request(`/me/purchases${buildQuery({ cursor, limit })}`);
}

// Продавец: подтверждения, которые он выдал.
export function listMyPurchaseConfirmations({ cursor, limit } = {}) {
  return request(`/purchase-confirmations${buildQuery({ cursor, limit })}`);
}

export function createPurchaseConfirmation({ buyerId, productId }) {
  return request('/purchase-confirmations', {
    method: 'POST',
    body: { buyer_id: buyerId, product_id: productId },
  });
}
