import { request, buildQuery } from './client';

export function listNotifications({ unread, cursor, limit } = {}) {
  return request(`/me/notifications${buildQuery({ unread, cursor, limit })}`);
}

export function getUnreadCount() {
  return request('/me/notifications/unread-count');
}

export function markNotificationRead(notificationId) {
  return request(`/me/notifications/${notificationId}/read`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return request('/me/notifications/read-all', { method: 'POST' });
}
