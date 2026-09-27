import { APP_SCHEME, SHARE_BASE_URL } from '../utils/links';

// Deep link-и: arvell://product/<id> открывает карточку товара на «Главной».
// Карточка доступна гостю, поэтому вход для перехода по ссылке не нужен.
const linking = {
  prefixes: [...new Set([`${APP_SCHEME}://`, SHARE_BASE_URL])],
  config: {
    screens: {
      Main: {
        screens: {
          Feed: {
            initialRouteName: 'List',
            screens: {
              Product: 'product/:id',
            },
          },
        },
      },
    },
  },
};

export default linking;
