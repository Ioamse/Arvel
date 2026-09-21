// Символы для валют, которые может отдать GET /config (currency — ISO 4217).
// Неизвестный код показываем как есть, а не подменяем чужим символом.
const SYMBOLS = { EUR: '€', USD: '$', GBP: '£', RUB: '₽', UAH: '₴', PLN: 'zł', CZK: 'Kč' };

export function currencySymbol(code) {
  if (!code) return '';
  return SYMBOLS[code] ?? code;
}

// Сумма в основных денежных единицах -> строка с разделителями разрядов.
// Дробную часть показываем, только если она есть.
export function formatAmount(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const n = Number(amount);
  const hasFraction = !Number.isInteger(n);
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

// price_minor приходит с бэкенда в минорных единицах валюты (копейки/центы),
// 100 минорных = 1 основная. Раньше округляли до целых — 12,50 превращалось
// в 13, теперь центы сохраняются.
export function formatPrice(priceMinor) {
  if (priceMinor == null) return '—';
  return formatAmount(priceMinor / 100);
}

// Сумма + символ валюты из GET /config: «1 200 €». Пока конфиг не загрузился
// (currency == null) символа нет — лучше без него, чем с чужим.
export function withCurrency(valueLabel, currency) {
  const symbol = currencySymbol(currency);
  return symbol && valueLabel !== '—' ? `${valueLabel} ${symbol}` : valueLabel;
}
