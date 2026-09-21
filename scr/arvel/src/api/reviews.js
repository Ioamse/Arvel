import { request, buildQuery } from './client';

export function listMyReviews({ cursor, limit } = {}) {
  return request(`/me/reviews${buildQuery({ cursor, limit })}`);
}

export function listProductReviews(productId, { cursor, limit } = {}) {
  return request(`/products/${productId}/reviews${buildQuery({ cursor, limit })}`, { auth: false });
}

export function createProductReview(productId, { rating, comment }) {
  return request(`/products/${productId}/reviews`, {
    method: 'POST',
    body: { rating, comment: comment ?? null },
  });
}

export function listShopReviews(shopId, { cursor, limit } = {}) {
  return request(`/shops/${shopId}/reviews${buildQuery({ cursor, limit })}`, { auth: false });
}
