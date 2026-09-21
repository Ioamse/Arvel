import { request, buildQuery } from './client';

export function listProducts(filters = {}) {
  const {
    q, categoryId, shopId, brandId, color, sizeSystem, sizeValue,
    condition, priceMin, priceMax, status, sort, cursor, limit,
  } = filters;
  const query = buildQuery({
    q,
    category_id: categoryId,
    shop_id: shopId,
    brand_id: brandId,
    color,
    size_system: sizeSystem,
    size_value: sizeValue,
    condition,
    price_min: priceMin,
    price_max: priceMax,
    status,
    sort,
    cursor,
    limit,
  });
  return request(`/products${query}`);
}

export function getProduct(productId) {
  return request(`/products/${productId}`);
}

export function createProduct(payload) {
  return request('/products', { method: 'POST', body: payload });
}

export function updateProduct(productId, patch) {
  return request(`/products/${productId}`, { method: 'PATCH', body: patch });
}

export function setProductStatus(productId, status) {
  return request(`/products/${productId}/status`, { method: 'POST', body: { status } });
}

export function addProductImage(productId, { url, position } = {}) {
  return request(`/products/${productId}/images`, {
    method: 'POST',
    body: { url, position: position ?? null },
  });
}

export function updateProductImage(productId, imageId, position) {
  return request(`/products/${productId}/images/${imageId}`, {
    method: 'PATCH',
    body: { position },
  });
}

export function deleteProductImage(productId, imageId) {
  return request(`/products/${productId}/images/${imageId}`, { method: 'DELETE' });
}

export function getProductFacets(filters = {}) {
  const { categoryId, q, shopId, brandId, color, sizeSystem, sizeValue, condition, priceMin, priceMax } = filters;
  const query = buildQuery({
    category_id: categoryId,
    q,
    shop_id: shopId,
    brand_id: brandId,
    color,
    size_system: sizeSystem,
    size_value: sizeValue,
    condition,
    price_min: priceMin,
    price_max: priceMax,
  });
  return request(`/products/facets${query}`, { auth: false });
}
