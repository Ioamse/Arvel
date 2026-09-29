import { request, buildQuery } from './client';

// Диалоги на бэкенде всегда привязаны к товару: покупатель открывает переписку
// со страницы товара, продавец отвечает в ветках по своим товарам.

export function listConversations({ cursor, limit } = {}) {
  return request(`/conversations${buildQuery({ cursor, limit })}`);
}

// Идемпотентно: если переписка по этому товару уже открыта, вернётся она же.
// Только для покупателя — продавцу бэкенд ответит 403.
export function openConversation(productId) {
  return request('/conversations', { method: 'POST', body: { product_id: productId } });
}

export function getConversation(conversationId) {
  return request(`/conversations/${conversationId}`);
}

// Сообщения приходят страницами, самое свежее — последним.
export function listMessages(conversationId, { cursor, limit } = {}) {
  return request(`/conversations/${conversationId}/messages${buildQuery({ cursor, limit })}`);
}

export function sendMessage(conversationId, body) {
  return request(`/conversations/${conversationId}/messages`, { method: 'POST', body: { body } });
}

export function markConversationRead(conversationId) {
  return request(`/conversations/${conversationId}/read`, { method: 'POST' });
}
