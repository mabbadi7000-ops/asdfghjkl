interface Env {
  BUCKET: R2Bucket;
  DB: D1Database;
  AUTH_SECRET?: string;
  [key: string]: unknown;
}

import { authenticateAssetRequest, isPublicAssetKey } from '../../_shared/auth';

export const onRequestGet: PagesFunction<Env> = async ({ params, request, env }) => {
  if (!env.BUCKET) {
    return new Response('R2 storage is not configured.', { status: 503 });
  }

  const keyParam = params.key;
  const key = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;
  if (!key || key.includes('..') || key.includes('\\') || !/^(?:[a-zA-Z0-9_-]{1,40}\/)?\d+-[a-f0-9-]{36}\.(pdf|png|jpg|jpeg|webp|xlsx|xls|csv)$/i.test(key)) {
    return new Response('File not found.', { status: 404 });
  }
  if (!isPublicAssetKey(key)) {
    try {
      if (!(await authenticateAssetRequest(request, env))) return new Response('Authentication required.', { status: 401 });
    } catch {
      return new Response('Authentication service is not configured.', { status: 503 });
    }
  }

  const object = await env.BUCKET.get(key);
  if (!object) {
    return new Response('File not found.', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Content-Disposition', 'inline');
  headers.set('ETag', object.httpEtag);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'");
  headers.set('Cache-Control', isPublicAssetKey(key) ? 'public, max-age=86400, immutable' : 'private, max-age=3600');
  return new Response(object.body, { headers });
};
