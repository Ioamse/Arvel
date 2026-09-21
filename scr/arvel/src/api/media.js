import { request } from './client';

export function presignUpload({ contentType, filename } = {}) {
  return request('/media/uploads', {
    method: 'POST',
    body: { content_type: contentType, filename: filename ?? null },
  });
}
