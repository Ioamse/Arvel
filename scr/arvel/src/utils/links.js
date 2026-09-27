// Ссылки, которыми делятся из приложения. Открываются через deep link
// (схема задана в app.json → expo.scheme, маршруты — в navigation/linking.js).
//
// Схема arvell:// ведёт прямо в приложение, но мессенджеры обычно не делают
// кликабельными нестандартные схемы. Когда появится веб-домен с переадресацией
// в приложение (App Links / Universal Links), достаточно поменять SHARE_BASE_URL
// на него, например 'https://arvell.ru/'.
export const APP_SCHEME = 'arvell';
export const SHARE_BASE_URL = `${APP_SCHEME}://`;

export function productUrl(productId) {
  return `${SHARE_BASE_URL}product/${productId}`;
}
