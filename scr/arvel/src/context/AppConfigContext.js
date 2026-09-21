import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getAppConfig } from '../api/config';
import { currencySymbol, formatPrice, formatAmount, withCurrency } from '../utils/price';

const EMPTY_CONFIG = {
  currency: null,
  sizeSystems: [],
  colors: [],
  conditions: [],
  // Лимиты загрузки картинок — нужны форме создания товара.
  maxImages: 10,
  maxImageBytes: null,
  allowedImageTypes: [],
  loading: true,
  error: null,
  reload: () => {},
};

const AppConfigContext = createContext(EMPTY_CONFIG);

// GET /config — публичные константы платформы (валюта, размеры, цвета,
// состояния). Грузится при старте, не ждёт авторизации; при сбое сети
// экраны могут перезапросить его через reload() (иначе без валюты и
// справочников приложение оставалось бы до перезапуска).
export function AppConfigProvider({ children }) {
  const [state, setState] = useState(EMPTY_CONFIG);
  const aliveRef = useRef(true);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getAppConfig()
      .then((config) => {
        if (!aliveRef.current) return;
        setState({
          currency: config.currency,
          sizeSystems: config.size_systems || [],
          colors: config.colors || [],
          conditions: config.conditions || [],
          maxImages: config.max_images_per_product ?? EMPTY_CONFIG.maxImages,
          maxImageBytes: config.max_image_bytes ?? null,
          allowedImageTypes: config.allowed_image_content_types || [],
          loading: false,
          error: null,
          reload: EMPTY_CONFIG.reload,
        });
      })
      .catch((error) => {
        if (!aliveRef.current) return;
        setState((s) => ({ ...s, loading: false, error }));
      });
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => {
      aliveRef.current = false;
    };
  }, [load]);

  const value = useMemo(() => ({ ...state, reload: load }), [state, load]);

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}

// Форматирование денег в единственной валюте платформы (GET /config → currency).
//   formatMinor(price_minor) — цена с бэкенда (минорные единицы), «12,50 €»
//   formatMajor(n)           — сумма в основных единицах (локальные моки, ввод формы)
//   symbol                   — только символ валюты («€»), '' пока конфиг не загружен
export function useMoney() {
  const { currency } = useAppConfig();
  return useMemo(() => ({
    symbol: currencySymbol(currency),
    formatMinor: (priceMinor) => withCurrency(formatPrice(priceMinor), currency),
    formatMajor: (amount) => withCurrency(formatAmount(amount), currency),
  }), [currency]);
}

// value -> label из GET /config (conditions/colors). Возвращает value как
// фолбэк, пока конфиг не загрузился или пока бэкенд не отдаёт этот роут.
export function labelFor(options, value) {
  return options.find((o) => o.value === value)?.label ?? value;
}
