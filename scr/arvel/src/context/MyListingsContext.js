import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductsContext';
import { getMyShop } from '../api/shops';
import { listProducts, setProductStatus } from '../api/products';

const PAGE_LIMIT = 100;
const MAX_PAGES = 5;

const MyListingsContext = createContext({
  items: [],
  loading: false,
  error: null,
  refresh: async () => {},
  reloadAfterChange: () => {},
  markSold: async () => {},
  archive: async () => {},
});

// Все страницы товаров магазина в одном статусе. Список объявлений одного
// продавца небольшой — страницы читаем подряд, с потолком MAX_PAGES.
async function fetchAll(shopId, status) {
  const out = [];
  let cursor;
  for (let i = 0; i < MAX_PAGES; i += 1) {
    const page = await listProducts({ shopId, status, cursor, limit: PAGE_LIMIT });
    out.push(...(page.data || []));
    if (!page.page?.has_more || !page.page?.next_cursor) break;
    cursor = page.page.next_cursor;
  }
  return out;
}

// Объявления текущего продавца. Живут на сервере (GET /products?shop_id=
// со своим статусом — чужие статусы кроме active бэкенд отдаёт только
// владельцу), поэтому видны с любого устройства.
//   active       — «Активно»
//   out_of_stock — «Продано»
//   archived     — удалённые, в списке не показываем
export function MyListingsProvider({ children }) {
  const { user, isLoggedIn } = useAuth();
  const { refresh: refreshFeed } = useProducts();
  const isSeller = isLoggedIn && user?.role === 'seller';
  const userId = user?.id ?? null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const shopIdRef = useRef(null);
  // Номер запроса: ответ, пришедший уже после смены аккаунта/нового запроса,
  // выбрасываем — иначе список прошлого продавца попадал бы к следующему.
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++requestRef.current;
    if (!isSeller) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!shopIdRef.current) shopIdRef.current = (await getMyShop()).id;
      const shopId = shopIdRef.current;
      const [active, sold] = await Promise.all([
        fetchAll(shopId, 'active'),
        fetchAll(shopId, 'out_of_stock'),
      ]);
      if (mine !== requestRef.current) return;
      setItems([...active, ...sold].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
    } catch (e) {
      if (mine === requestRef.current) setError(e);
    } finally {
      if (mine === requestRef.current) setLoading(false);
    }
  }, [isSeller]);

  useEffect(() => {
    shopIdRef.current = null;
    setItems([]);
    refresh();
  }, [userId, refresh]);

  // После создания/смены статуса лента покупателей тоже меняется.
  const reloadAfterChange = useCallback(() => {
    refresh();
    refreshFeed();
  }, [refresh, refreshFeed]);

  const markSold = useCallback(async (id) => {
    const updated = await setProductStatus(id, 'out_of_stock');
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: updated?.status ?? 'out_of_stock' } : p)));
    refreshFeed();
  }, [refreshFeed]);

  // Удаление — это архивирование: по спеке товар скрывается из каталога,
  // но остаётся в истории.
  const archive = useCallback(async (id) => {
    await setProductStatus(id, 'archived');
    setItems((prev) => prev.filter((p) => p.id !== id));
    refreshFeed();
  }, [refreshFeed]);

  const value = useMemo(
    () => ({ items, loading, error, refresh, reloadAfterChange, markSold, archive }),
    [items, loading, error, refresh, reloadAfterChange, markSold, archive]
  );

  return (
    <MyListingsContext.Provider value={value}>
      {children}
    </MyListingsContext.Provider>
  );
}

export function useMyListings() {
  return useContext(MyListingsContext);
}
