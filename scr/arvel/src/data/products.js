// Моковые товары под макет.
// kind: 'tee' | 'sneaker' — выбор заглушки-иконки.
// category: 'men' | 'women' | 'kids' | 'accessories' — для фильтров и каталога.
export const products = [
  {
    id: '1', brand: 'Nike', title: 'Air Max 90', price: 8900,
    kind: 'sneaker', category: 'men', verified: true, liked: false,
    rating: 4.9, size: 'EUR 42', condition: 'Отлично',
    description: 'Оригинал, покупал в официальном магазине. Носился аккуратно.',
    seller: { name: 'Алексей', deals: 5 },
  },
  {
    id: '2', brand: 'Stone Island', title: 'Худи', price: 12500,
    kind: 'tee', category: 'men', verified: true, liked: true,
    rating: 4.7, size: 'L', condition: 'Хорошее',
    description: 'Носил один сезон, без дефектов. Все бирки на месте.',
    seller: { name: 'Мария С.', deals: 12 },
  },
  {
    id: '3', brand: 'Carhartt WIP', title: 'Футболка', price: 3200,
    kind: 'tee', category: 'men', verified: false, liked: false,
    rating: 4.5, size: 'M', condition: 'Новое',
    description: 'Новая, не подошёл размер. С биркой.',
    seller: { name: 'Дмитрий К.', deals: 3 },
  },
  {
    id: '4', brand: 'The North Face', title: 'Куртка', price: 15900,
    kind: 'tee', category: 'women', verified: true, liked: true,
    rating: 4.8, size: 'S', condition: 'Отлично',
    description: 'Зимняя куртка, тёплая. Носилась бережно один сезон.',
    seller: { name: 'Сергей П.', deals: 8 },
  },
  {
    id: '5', brand: 'New Balance', title: '550', price: 11200,
    kind: 'sneaker', category: 'men', verified: true, liked: false,
    rating: 4.6, size: 'EUR 43', condition: 'Хорошее',
    description: 'Удобные, состояние хорошее. Подошва целая.',
    seller: { name: 'Алексей', deals: 5 },
  },
  {
    id: '6', brand: 'Acne Studios', title: 'Свитер', price: 21000,
    kind: 'tee', category: 'women', verified: true, liked: false,
    rating: 5.0, size: 'M', condition: 'Новое',
    description: 'Новый, шерсть. Не подошёл по стилю.',
    seller: { name: 'Мария С.', deals: 12 },
  },
  {
    id: '7', brand: 'Ralph Lauren', title: 'Поло детское', price: 4500,
    kind: 'tee', category: 'kids', verified: false, liked: false,
    rating: 4.4, size: '8 лет', condition: 'Хорошее',
    description: 'Детское поло, ребёнок вырос.',
    seller: { name: 'Дмитрий К.', deals: 3 },
  },
  {
    id: '8', brand: 'Adidas', title: 'Samba', price: 9900,
    kind: 'sneaker', category: 'men', verified: true, liked: true,
    rating: 4.9, size: 'EUR 41', condition: 'Отлично',
    description: 'Классика. Носились пару раз.',
    seller: { name: 'Сергей П.', deals: 8 },
  },
  {
    id: '9', brand: 'Nike', title: 'Кроссовки детские', price: 3900,
    kind: 'sneaker', category: 'kids', verified: true, liked: false,
    rating: 4.6, size: '31', condition: 'Хорошее',
    description: 'Ребёнок быстро вырос, состояние хорошее.',
    seller: { name: 'Мария С.', deals: 12 },
  },
  {
    id: '10', brand: 'Stüssy', title: 'Кепка', price: 2900,
    kind: 'tee', category: 'accessories', verified: true, liked: false,
    rating: 4.8, size: 'One size', condition: 'Отлично',
    description: 'Оригинал, носилась редко.',
    seller: { name: 'Алексей', deals: 5 },
  },
  {
    id: '11', brand: 'Supreme', title: 'Сумка', price: 5500,
    kind: 'tee', category: 'accessories', verified: false, liked: false,
    rating: 4.5, size: '—', condition: 'Хорошее',
    description: 'Поясная сумка, без дефектов.',
    seller: { name: 'Дмитрий К.', deals: 3 },
  },
];

export const categories = [
  { key: 'all',   label: 'Все' },
  { key: 'men',   label: 'Мужчины' },
  { key: 'women', label: 'Женщины' },
  { key: 'kids',  label: 'Дети' },
];

// Бренды для чипсов на экране «Каталог» (по макету)
export const catalogBrands = [
  'Nike', 'Stone Island', 'Carhartt WIP', 'The North Face',
  'Adidas', 'Stüssy', 'Supreme', 'Champion',
];

// Для блоков «Популярное» и «Недавнее» на экране поиска
export const popularBrands = ['Nike', 'Stone Island', 'Carhartt', 'Adidas', 'The North Face'];
export const recentSearches = ['Air Max', 'Stone Island худи', 'Куртка зима'];

// История сделок для профиля
export const dealsHistory = [
  { id: 'd1', title: 'Nike Air Max 90',       date: '14 мая', price: 8900,  kind: 'sneaker' },
  { id: 'd2', title: 'Carhartt WIP Футболка', date: '2 мая',  price: 3200,  kind: 'tee' },
  { id: 'd3', title: 'The North Face Куртка', date: '28 апр', price: 15900, kind: 'tee' },
];