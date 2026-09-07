import { request } from './client';

export function registerPhone(phone, displayName) {
  return request('/auth/register', {
    method: 'POST',
    auth: false,
    body: { phone, display_name: displayName ?? null },
  });
}

export function verifyCode(phone, code) {
  return request('/auth/verify', {
    method: 'POST',
    auth: false,
    body: { phone, code },
  });
}

export function sellerAcceptInvite(inviteToken, phone) {
  return request('/auth/seller/accept-invite', {
    method: 'POST',
    auth: false,
    body: { invite_token: inviteToken, phone },
  });
}

export function sellerComplete({ inviteToken, phone, code, shopName, description, displayName }) {
  return request('/auth/seller/complete', {
    method: 'POST',
    auth: false,
    body: {
      invite_token: inviteToken,
      phone,
      code,
      shop_name: shopName,
      description: description ?? null,
      display_name: displayName ?? null,
    },
  });
}

export function refreshTokens(refreshToken) {
  return request('/auth/refresh', {
    method: 'POST',
    auth: false,
    body: { refresh_token: refreshToken },
  });
}

export function logout(refreshToken) {
  return request('/auth/logout', {
    method: 'POST',
    auth: false,
    body: { refresh_token: refreshToken },
  });
}

export function adminLogin(username, password) {
  return request('/auth/admin/login', {
    method: 'POST',
    auth: false,
    body: { username, password },
  });
}
