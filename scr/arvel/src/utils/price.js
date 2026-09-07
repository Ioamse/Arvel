// price_minor приходит с бэкенда в минорных единицах валюты (копейки/центы).
export function formatPrice(priceMinor) {
  if (priceMinor == null) return '—';
  return Math.round(priceMinor / 100).toLocaleString('ru-RU');
}
