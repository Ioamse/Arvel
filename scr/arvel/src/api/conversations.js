import { request, buildQuery } from './client';

export function listConversations({ cursor, limit } = {}) {
  return request(`/conversations${buildQuery({ cursor, limit })}`);
}

export function createConversation(productId) {
  return request('/conversations', {
    method: 'POST',
    body: { product_id: productId },
  });
}

export function getConversation(conversationId) {
  return request(`/conversations/${conversationId}`);
}

export function listMessages(conversationId, { cursor, limit } = {}) {
  return request(`/conversations/${conversationId}/messages${buildQuery({ cursor, limit })}`);
}

export function sendMessage(conversationId, body) {
  return request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { body },
  });
}

export function markConversationRead(conversationId) {
  return request(`/conversations/${conversationId}/read`, { method: 'POST' });
}
