import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { listProducts } from '../api/products';
import { loadCachedProducts, saveCachedProducts } from '../storage/productsCache';

const ProductsContext = createContext({
  products: [],
  loading: true,
  error: null,
  hasMore: false,
  refresh: () => {},
  loadMore: () => {},
  addProduct: () => {},
  markSold: () => {},
  removeProduct: () => {},
});

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const gotFreshDataRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listProducts({});
      gotFreshDataRef.current = true;
      setProducts(page.data || []);
      setCursor(page.page?.next_cursor || null);
      setHasMore(!!page.page?.has_more);
      saveCachedProducts(page.data || []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Последний закэшированный список показываем сразу при старте, не дожидаясь
  // сети — на Android первый сетевой запрос после холодного старта заметно
  // медленнее, и без кэша лента первые секунды пустая/со спиннером. Настоящие
  // данные всё равно подтягиваются следом через refresh() ниже и подменяют
  // кэш, как только придут.
  useEffect(() => {
    let cancelled = false;
    loadCachedProducts().then((cached) => {
      if (!cancelled && cached?.length && !gotFreshDataRef.current) {
        setProducts(cached);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor || loading) return;
    setLoading(true);
    try {
      const page = await listProducts({ cursor });
      setProducts((prev) => [...prev, ...(page.data || [])]);
      setCursor(page.page?.next_cursor || null);
      setHasMore(!!page.page?.has_more);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // --- Локальные операции продавца (создание/отметка/удаление) ---
  // Пока работают только поверх уже загруженного списка в памяти — реальные
  // POST /products и POST /products/{id}/status подключаются в Phase 2
  // вместе с переработкой AddProductScreen/MyListingCard. Не переживают
  // перезапуск приложения и не долетают до бэкенда.
  const addProduct = useCallback((data) => {
    const newProduct = {
      id: 'local-' + Date.now(),
      liked: false,
      rating: 5.0,
      mine: true, // товар, добавленный текущим продавцом
      seller: { name: data.sellerName || 'Вы', deals: 0 },
      ...data,
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  }, []);

  const markSold = useCallback((id) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'sold' } : p)));
  }, []);

  const removeProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const value = useMemo(
    () => ({ products, loading, error, hasMore, refresh, loadMore, addProduct, markSold, removeProduct }),
    [products, loading, error, hasMore, refresh, loadMore, addProduct, markSold, removeProduct]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}
