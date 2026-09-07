# ARVELL

Маркетплейс брендовой одежды с гарантией подлинности.

## Установка

```bash
cd arvell
npm install
npx expo start -c
```

Флаг `-c` чистит кеш — полезно, если видишь старую версию экрана.

Тестовый SMS-код на экране подтверждения: **111111**

## Структура

```
arvell/
├── App.js                       // запуск: провайдеры + навигатор
├── index.js                     // регистрация в Expo
├── app.json                     // конфиг Expo (тёмная тема)
├── package.json
├── assets/                      // иконки (сейчас заглушки 1×1, замени своими)
│
└── src/
    ├── theme.js                 // ЦВЕТА и ОТСТУПЫ — один файл на всё
    │
    ├── navigation/              // КАК устроены переходы
    │   ├── RootNavigator.js     //   вошёл -> MainTabs, нет -> AuthNavigator
    │   ├── AuthNavigator.js     //   welcome -> phone -> verify -> profile
    │   └── MainTabs.js          //   нижние табы: Каталог/Поиск/Корзина/Профиль
    │
    ├── screens/                 // ЭКРАНЫ (один файл = один экран)
    │   ├── WelcomeScreen.js
    │   ├── PhoneScreen.js
    │   ├── VerifyScreen.js
    │   ├── ProfileSetupScreen.js  // профиль при регистрации
    │   ├── FeedScreen.js          // лента товаров (главная после входа)
    │   ├── SearchScreen.js
    │   ├── CartScreen.js
    │   └── AccountScreen.js       // профиль во вкладке + кнопка «Выйти»
    │
    ├── components/              // переиспользуемые кусочки UI
    │   ├── Logo.js
    │   ├── ShieldIcon.js
    │   └── ProductCard.js
    │
    └── data/
        └── products.js          // моковые товары (потом заменишь на сервер)
```

## Как это работает

- **Вход в приложение.** `RootNavigator` хранит флаг `isLoggedIn`. Пока `false` —
  показывается `AuthNavigator` (экраны входа). После «Завершить» вызывается
  `signIn()` из `AuthContext`, флаг становится `true`, и показываются табы.
  Кнопка «Выйти» в профиле вызывает `signOut()`.
- **Переходы между экранами входа** — через `navigation.navigate('Phone')` и т.п.
  Имена экранов заданы в `AuthNavigator.js`.
- **Цвета** берутся только из `theme.js`. Меняешь там — меняется во всём приложении.
- **Никаких `index.js` в папках** — каждый файл импортируется по своему уникальному
  имени, ничего не пересекается.

## Что дальше

- Заменить заглушки в `assets/` своими иконками.
- В `FeedScreen` сделать переход на экран товара (добавить `ProductDetailScreen`
  и обернуть ленту в стек, как сделано в AuthNavigator).
- Подключить реальные данные в `data/products.js`.
- Заменить эмодзи-иконки табов на `@expo/vector-icons`.
