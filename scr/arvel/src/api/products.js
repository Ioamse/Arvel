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
