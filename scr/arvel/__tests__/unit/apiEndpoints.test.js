// Обёртки над эндпоинтами: путь, метод, тело и флаг auth.
jest.mock('../../src/api/client', () => {
  const actual = jest.requireActual('../../src/api/client');
  return { ...actual, request: jest.fn(async () => ({})) };
});

const { request } = require('../../src/api/client');
const auth = require('../../src/api/auth');
const admin = require('../../src/api/admin');
const catalog = require('../../src/api/catalog');
const chat = require('../../src/api/chat');
const config = require('../../src/api/config');
const favorites = require('../../src/api/favorites');
const me = require('../../src/api/me');
const products = require('../../src/api/products');
const shops = require('../../src/api/shops');
const media = require('../../src/api/media');

const lastCall = () => request.mock.calls[request.mock.calls.length - 1];

describe('api/auth — публичные, auth: false, snake_case тела', () => {
  it.each([
    [() => auth.registerPhone('+7999'), '/auth/register', { phone: '+7999', display_name: null }],
    [() => auth.registerPhone('+7999', 'Иван'), '/auth/register', { phone: '+7999', display_name: 'Иван' }],
    [() => auth.verifyCode('+7999', '1234'), '/auth/verify', { phone: '+7999', code: '1234' }],
    [() => auth.sellerAcceptInvite('T', '+7999'), '/auth/seller/accept-invite', { invite_token: 'T', phone: '+7999' }],
    [
      () => auth.sellerComplete({ inviteToken: 'T', phone: '+7', code: '1', shopName: 'S' }),
      '/auth/seller/complete',
      { invite_token: 'T', phone: '+7', code: '1', shop_name: 'S', description: null, display_name: null },
    ],
    [() => auth.refreshTokens('r'), '/auth/refresh', { refresh_token: 'r' }],
    [() => auth.logout('r'), '/auth/logout', { refresh_token: 'r' }],
    [() => auth.adminLogin('a', 'p'), '/auth/admin/login', { username: 'a', password: 'p' }],
  ])('%#: %s', async (call, path, body) => {
    await call();
    expect(lastCall()).toEqual([path, { method: 'POST', auth: false, body }]);
  });
});

describe('api/admin', () => {
  it('списки с фильтрами', () => {
    admin.listSellerInvites({ status: 'created', limit: 10 });
    expect(lastCall()[0]).toBe('/admin/seller-invites?status=created&limit=10');
    admin.listAdminUsers({ q: 'ив', isActive: false });
    expect(lastCall()[0]).toBe(`/admin/users?q=${encodeURIComponent('ив')}&is_active=false`);
    admin.getAdminOverview();
    expect(lastCall()).toEqual(['/admin/overview']);
  });

  it('действия — POST', () => {
    admin.createSellerInvite({ expiresInDays: 7 });
    expect(lastCall()).toEqual(['/admin/seller-invites', { method: 'POST', body: { expires_in_days: 7, note: null } }]);
    admin.revokeSellerInvite('i1');
    expect(lastCall()).toEqual(['/admin/seller-invites/i1/revoke', { method: 'POST' }]);
    admin.banUser('u1');
    expect(lastCall()).toEqual(['/admin/users/u1/ban', { method: 'POST' }]);
    admin.unbanUser('u1');
    expect(lastCall()).toEqual(['/admin/users/u1/unban', { method: 'POST' }]);
  });
});

describe('api/catalog и config — публичные', () => {
  it('категории, бренды, конфиг без авторизации', () => {
    catalog.listCategories('root');
    expect(lastCall()).toEqual(['/categories?parent_id=root', { auth: false }]);
    catalog.getCategory('c1');
    expect(lastCall()).toEqual(['/categories/c1', { auth: false }]);
    catalog.listBrands({ q: 'ni', limit: 5 });
    expect(lastCall()).toEqual(['/brands?q=ni&limit=5', { auth: false }]);
    config.getAppConfig();
    expect(lastCall()).toEqual(['/config', { auth: false }]);
  });
});

describe('api/chat', () => {
  it('диалоги и сообщения', () => {
    chat.listConversations({ limit: 50 });
    expect(lastCall()).toEqual(['/conversations?limit=50']);
    chat.openConversation('p1');
    expect(lastCall()).toEqual(['/conversations', { method: 'POST', body: { product_id: 'p1' } }]);
    chat.getConversation('c1');
    expect(lastCall()).toEqual(['/conversations/c1']);
    chat.listMessages('c1', { cursor: 'x', limit: 100 });
    expect(lastCall()).toEqual(['/conversations/c1/messages?cursor=x&limit=100']);
    chat.sendMessage('c1', 'привет');
    expect(lastCall()).toEqual(['/conversations/c1/messages', { method: 'POST', body: { body: 'привет' } }]);
    chat.markConversationRead('c1');
    expect(lastCall()).toEqual(['/conversations/c1/read', { method: 'POST' }]);
  });
});

describe('api/favorites, me, shops', () => {
  it('избранное', () => {
    favorites.listFavorites();
    expect(lastCall()).toEqual(['/me/favorites']);
    favorites.addFavorite('p1');
    expect(lastCall()).toEqual(['/me/favorites/p1', { method: 'PUT' }]);
    favorites.removeFavorite('p1');
    expect(lastCall()).toEqual(['/me/favorites/p1', { method: 'DELETE' }]);
  });

  it('профиль и магазин', () => {
    me.getMe();
    expect(lastCall()).toEqual(['/me']);
    me.updateMe({ display_name: 'X' });
    expect(lastCall()).toEqual(['/me', { method: 'PATCH', body: { display_name: 'X' } }]);
    shops.getMyShop();
    expect(lastCall()).toEqual(['/me/shop']);
    shops.updateMyShop({ shop_name: 'S' });
    expect(lastCall()).toEqual(['/me/shop', { method: 'PATCH', body: { shop_name: 'S' } }]);
  });
});

describe('api/products', () => {
  it('фильтры переводятся в snake_case', () => {
    products.listProducts({ q: 'a', categoryId: 'c', shopId: 's', priceMin: 10, sizeSystem: 'eu', status: 'active', cursor: 'n', limit: 20 });
    expect(lastCall()[0]).toBe('/products?q=a&category_id=c&shop_id=s&size_system=eu&price_min=10&status=active&cursor=n&limit=20');
    products.listProducts();
    expect(lastCall()[0]).toBe('/products');
  });

  it('товар, создание, статус, фасеты', () => {
    products.getProduct('p1');
    expect(lastCall()).toEqual(['/products/p1']);
    products.createProduct({ title: 't' });
    expect(lastCall()).toEqual(['/products', { method: 'POST', body: { title: 't' } }]);
    products.setProductStatus('p1', 'archived');
    expect(lastCall()).toEqual(['/products/p1/status', { method: 'POST', body: { status: 'archived' } }]);
    products.getProductFacets({ brandId: 'b1' });
    expect(lastCall()).toEqual(['/products/facets?brand_id=b1', { auth: false }]);
  });
});

describe('api/media.uploadImage', () => {
  beforeEach(() => {
    request.mockResolvedValue({ upload_url: '/upload/abc', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, file_url: '/media/files/abc.jpg' });
  });

  it('presign -> PUT байтов -> file_url', async () => {
    const blob = { size: 10 };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ blob: async () => blob })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const url = await media.uploadImage({ uri: 'file:///a.jpg', contentType: 'image/jpeg', filename: 'a.jpg' });
    expect(url).toBe('/media/files/abc.jpg');
    expect(request).toHaveBeenCalledWith('/media/uploads', { method: 'POST', body: { content_type: 'image/jpeg', filename: 'a.jpg' } });
    const [putUrl, init] = fetch.mock.calls[1];
    expect(putUrl).toMatch(/\/upload\/abc$/);
    expect(init).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
  });

  it('хранилище отклонило файл -> UPLOAD_FAILED', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ blob: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 422 });
    await expect(media.uploadImage({ uri: 'x', contentType: 'image/jpeg' }))
      .rejects.toMatchObject({ code: 'UPLOAD_FAILED', status: 422 });
  });

  it('обрыв сети -> NETWORK_ERROR', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ blob: async () => ({}) })
      .mockRejectedValueOnce(new TypeError('failed'));
    await expect(media.uploadImage({ uri: 'x', contentType: 'image/jpeg' }))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});
