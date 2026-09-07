import { request, buildQuery } from './client';

export function listCategories(parentId) {
  return request(`/categories${buildQuery({ parent_id: parentId })}`, { auth: false });
}

export function getCategory(categoryId) {
  return request(`/categories/${categoryId}`, { auth: false });
}

export function listBrands({ q, cursor, limit } = {}) {
  return request(`/brands${buildQuery({ q, cursor, limit })}`, { auth: false });
}
