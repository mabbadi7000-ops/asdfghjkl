interface Env {
  BUCKET: R2Bucket;
  DB: D1Database;
  AUTH_SECRET?: string;
  [key: string]: unknown;
}

import { authenticateAssetRequest, authenticateRequest, isPublicAssetKey } from '../_shared/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'xlsx', 'xls', 'csv']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel', 'text/csv',
]);

function sanitizeFileName(fileName: string): string {
  const basename = fileName.replace(/\\/g, '/').split('/').pop() || 'upload';
  return basename.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload';
}

function identifyFile(bytes: Uint8Array, fileName: string): { type: string; extension: string } | null {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-') {
    return { type: 'application/pdf', extension: 'pdf' };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { type: 'image/png', extension: 'png' };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { type: 'image/jpeg', extension: 'jpg' };
  }
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP'
  ) {
    return { type: 'image/webp', extension: 'webp' };
  }
  if (fileName.toLowerCase().endsWith('.xlsx') && bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' };
  }
  if (
    fileName.toLowerCase().endsWith('.xls') && bytes.length >= 4 &&
    bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
  ) {
    return { type: 'application/vnd.ms-excel', extension: 'xls' };
  }
  if (fileName.toLowerCase().endsWith('.csv') && bytes.length > 0 && !bytes.includes(0)) {
    return { type: 'text/csv; charset=utf-8', extension: 'csv' };
  }
  return null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let uploader;
  try {
    uploader = await authenticateRequest(request, env);
    if (!uploader) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }
  } catch {
    return Response.json({ error: 'Authentication service is not configured.' }, { status: 503 });
  }

  if (!env.BUCKET) {
    return Response.json({ error: 'R2 storage is not configured.' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_FILE_SIZE + 64 * 1024) {
    return Response.json({ error: 'File exceeds the 10 MB limit.' }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Expected a multipart form upload.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing uploaded file.' }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: 'The uploaded file is empty.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: 'File exceeds the 10 MB limit.' }, { status: 413 });
  }

  const originalName = sanitizeFileName(file.name);
  const fileExtension = originalName.split('.').pop()?.toLowerCase() || '';
  const declaredMime = file.type.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(fileExtension) || !ALLOWED_MIME_TYPES.has(declaredMime)) {
    return Response.json({ error: 'Unsupported file type.' }, { status: 415 });
  }

  const folder = formData.get('folder');
  if (folder !== null && (typeof folder !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(folder))) {
    return Response.json({ error: 'Invalid upload folder.' }, { status: 400 });
  }
  if (folder === 'branding' || folder === 'public') {
    if (uploader.role !== 'admin') {
      return Response.json({ error: 'Forbidden.' }, { status: 403 });
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const identified = identifyFile(bytes, file.name);
  if (!identified) {
    return Response.json({ error: 'Only valid PDF, PNG, JPG, WEBP, XLS, XLSX, and CSV files are supported.' }, { status: 415 });
  }
  const expectedExtension = fileExtension === 'jpeg' ? 'jpg' : fileExtension;
  const identifiedMime = identified.type.split(';')[0].toLowerCase();
  if (identified.extension !== expectedExtension || identifiedMime !== declaredMime) {
    return Response.json({ error: 'File extension, MIME type, and file content do not match.' }, { status: 415 });
  }

  const fileKey = `${Date.now()}-${crypto.randomUUID()}.${identified.extension}`;
  const key = folder ? `${folder}/${fileKey}` : fileKey;
  const safeName = originalName;
  await env.BUCKET.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: identified.type,
      contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    },
    customMetadata: { originalName: safeName },
  });

  return Response.json({
    success: true,
    key,
    fileUrl: `/api/upload?key=${encodeURIComponent(key)}`,
    fileName: safeName,
    fileSize: file.size,
  });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.BUCKET) {
    return new Response('R2 storage is not configured.', { status: 503 });
  }

  const key = new URL(request.url).searchParams.get('key');
  if (!key || !/^(?:[a-zA-Z0-9_-]{1,40}\/)?\d+-[a-f0-9-]{36}\.(pdf|png|jpg|webp|xls|xlsx|csv)$/i.test(key)) {
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
  headers.set('Cache-Control', isPublicAssetKey(key) ? 'public, max-age=86400, immutable' : 'private, max-age=3600');
  headers.set('ETag', object.httpEtag);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'");
  return new Response(object.body, { headers });
};
