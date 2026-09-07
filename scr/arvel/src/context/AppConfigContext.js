import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAppConfig } from '../api/config';

const AppConfigContext = createContext({
  currency: null,
  sizeSystems: [],
  colors: [],
  conditions: [],
  loading: true,
  error: null,
});

// GET /config — публичные константы платформы (валюта, размеры, цвета,
// состояния). Грузится один раз при старте, не ждёт авторизации.
export function AppConfigProvider({ children }) {
  const [state, setState] = useState({
    currency: null,
    sizeSystems: [],
    colors: [],
    conditions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    getAppConfig()
      .then((config) => {
        if (cancelled) return;
        setState({
          currency: config.currency,
          sizeSystems: config.size_systems || [],
          colors: config.colors || [],
          conditions: config.conditions || [],
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppConfigContext.Provider value={state}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}

// value -> label из GET /config (conditions/colors). Возвращает value как
// фолбэк, пока конфиг не загрузился или пока бэкенд не отдаёт этот роут.
export function labelFor(options, value) {
  return options.find((o) => o.value === value)?.label ?? value;
}
