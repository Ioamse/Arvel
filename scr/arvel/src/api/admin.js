import { request, buildQuery } from './client';

export function listSellerInvites({ status, limit, offset } = {}) {
  return request(`/admin/seller-invites${buildQuery({ status, limit, offset })}`);
}

export function createSellerInvite({ expiresInDays, note } = {}) {
  return request('/admin/seller-invites', {
    method: 'POST',
    body: { expires_in_days: expiresInDays, note: note ?? null },
  });
}

export function revokeSellerInvite(inviteId) {
  return request(`/admin/seller-invites/${inviteId}/revoke`, { method: 'POST' });
}

export function listAdminUsers({ q, role, isActive, limit, offset } = {}) {
  return request(`/admin/users${buildQuery({ q, role, is_active: isActive, limit, offset })}`);
}

export function banUser(userId) {
  return request(`/admin/users/${userId}/ban`, { method: 'POST' });
}

export function unbanUser(userId) {
  return request(`/admin/users/${userId}/unban`, { method: 'POST' });
}

export function getAdminOverview() {
  return request('/admin/overview');
}
