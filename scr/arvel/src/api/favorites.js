import { request, buildQuery } from './client';

export function listFavorites({ cursor, limit } = {}) {
  return request(`/me/favorites${buildQuery({ cursor, limit })}`);
}

export function addFavorite(productId) {
  return request(`/me/favorites/${productId}`, { method: 'PUT' });
}

export function removeFavorite(productId) {
  return request(`/me/favorites/${productId}`, { method: 'DELETE' });
}
