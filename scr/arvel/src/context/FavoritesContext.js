import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { listFavorites, addFavorite, removeFavorite } from '../api/favorites';
import { loadFavorites, saveFavorites, clearFavorites } from '../storage/favoritesStorage';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext({
  items: [],
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: () => {},
  count: 0,
  loading: false,
});

export function FavoritesProvider({ children }) {
  const { isLoggedIn } = useAuth();
  // items — полные FavoriteItem с вложенным product (для FavoritesScreen).
  // favoriteIds — только id, для быстрых проверок isFavorite() на карточках.
  const [items, setItems] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading, setLoading] = useState(false);
  // Синхронный доступ к актуальным items внутри toggleFavorite без того,
  // чтобы делать items зависимостью useCallback (иначе он бы пересоздавался
  // на каждый лайк и ломал мемоизацию value ниже).
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setItems([]);
      setFavoriteIds([]);
      await clearFavorites();
      return;
    }
    setLoading(true);
    const local = await loadFavorites();
    try {
      const page = await listFavorites();
      const serverData = page.data || [];
      // Объединяем с локальным, а не затираем им: если PUT/DELETE
      // /me/favorites не реализованы (см. toggleFavorite), а GET при этом
      // отвечает 200 с пустым списком, слепая перезапись стёрла бы
      // локально добавленное избранное навсегда.
      const merged = new Map();
      [...local, ...serverData].forEach((it) => merged.set(it.product.id, it));
      const data = Array.from(merged.values());
      setItems(data);
      setFavoriteIds(data.map((it) => it.product.id));
      await saveFavorites(data);
    } catch {
      // GET /me/favorites на бэкенде пока не реализован ("not implemented") —
      // вместо пустого списка показываем то, что сохранено локально.
      setItems(local);
      setFavoriteIds(local.map((it) => it.product.id));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFavorite = useCallback((id) => favoriteIds.includes(id), [favoriteIds]);

  // product — опционально, чтобы сразу отрисовать карточку в списке «Избранное»
  // (см. FavoritesScreen), не дожидаясь фонового refresh().
  //
  // PUT/DELETE /me/favorites/:id на бэкенде сейчас отвечают "not
  // implemented" — сервер аутентифицирует запрос, но саму запись не
  // выполняет. Поэтому источником истины держим локальное хранилище на
  // устройстве (см. favoritesStorage): пишем в него сразу и оптимистично,
  // не откатываем и не показываем алерт при ошибке записи на бэкенд —
  // иначе избранное вообще нельзя было бы добавить, пока backend не
  // доделает эндпоинт. Запрос к API всё равно шлём — как только бэкенд
  // заработает, синхронизация начнёт проходить сама, без правок здесь.
  const toggleFavorite = useCallback(async (id, product) => {
    const wasLiked = favoriteIds.includes(id);
    const nextFavoriteIds = wasLiked
      ? favoriteIds.filter((x) => x !== id)
      : [...favoriteIds, id];
    const nextItems = wasLiked
      ? itemsRef.current.filter((it) => it.product.id !== id)
      : (!product || itemsRef.current.some((it) => it.product.id === id))
        ? itemsRef.current
        : [...itemsRef.current, { id: `local-${id}`, product }];

    setFavoriteIds(nextFavoriteIds);
    setItems(nextItems);
    saveFavorites(nextItems);

    try {
      if (wasLiked) await removeFavorite(id);
      else await addFavorite(id);
    } catch (e) {
      console.warn('toggleFavorite: бэкенд не подтвердил запись, остаёмся на локальном состоянии', e);
    }
  }, [favoriteIds]);

  const value = useMemo(
    () => ({
      items,
      favorites: favoriteIds,
      isFavorite,
      toggleFavorite,
      count: favoriteIds.length,
      loading,
    }),
    [items, favoriteIds, isFavorite, toggleFavorite, loading]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
