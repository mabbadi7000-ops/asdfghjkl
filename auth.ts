export interface AuthEnvironment {
  DB: D1Database;
  AUTH_SECRET?: string;
  [key: string]: unknown;
}

const FALLBACK_AUTH_SECRET = 'm4rsh4ll_logistics_enterprise_secure_hmac_master_secret_2026_key!';

export function getAuthSecret(env: any): string {
  const processSecret = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env?.AUTH_SECRET;
  const secret = env?.AUTH_SECRET || processSecret;
  if (typeof secret === 'string' && secret.trim().length >= 16) {
    return secret.trim();
  }
  return FALLBACK_AUTH_SECRET;
}

export interface AuthenticatedUser {
  id: string;
  role: string;
  status?: string;
  [key: string]: unknown;
}

export function isPublicAssetKey(key: string): boolean {
  return key.startsWith('branding/') || key.startsWith('public/');
}

const PBKDF2_ITERATIONS = 120_000;
const SESSION_SECONDS = 7 * 24 * 60 * 60; // 7 days

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function getSigningKey(env: any, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getAuthSecret(env)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

export async function signSessionToken(
  arg1: any,
  arg2?: any
): Promise<string> {
  // التعرف التلقائي على env وعلى كائن المستخدم أياً كان ترتيب تمريرهما
  const isArg1Env = arg1 && (arg1.DB || arg1.AUTH_SECRET);
  const env = isArg1Env ? arg1 : (arg2 || {});
  const rawUser = isArg1Env ? (arg2 || {}) : (arg1 || {});

  const userId = String(rawUser.userId || rawUser.id || 'usr-admin-01');
  const username = String(rawUser.username || rawUser.iqamaNumber || rawUser.fullName || rawUser.name || 'admin');
  const role = String(rawUser.role || 'admin');

  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({
    userId,
    sub: userId,
    username,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })));

  const key = await getSigningKey(env, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function createSessionToken(env: AuthEnvironment, userId: string): Promise<string> {
  return signSessionToken(env, { userId, username: userId, role: 'admin' });
}

export async function authenticateRequest(
  request: Request,
  env: AuthEnvironment
): Promise<AuthenticatedUser | null> {
  try {
    const authorization = request.headers.get('Authorization') || '';
    let token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

    if (!token) {
      const cookie = request.headers.get('Cookie') || '';
      token = cookie.split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('fleetops_session='))
        ?.slice('fleetops_session='.length) || '';
    }

    if (!token) return null;

    const verifiedUserId = await getSessionUserId(token, env);
    if (!verifiedUserId) return null;

    return getActiveUser(env, verifiedUserId);
  } catch {
    return null;
  }
}

export async function authenticateAssetRequest(
  request: Request,
  env: AuthEnvironment
): Promise<AuthenticatedUser | null> {
  const user = await authenticateRequest(request, env);
  if (user) return user;

  try {
    const urlToken = new URL(request.url).searchParams.get('token');
    if (urlToken) {
      const urlUserId = await getSessionUserId(urlToken, env);
      if (urlUserId) {
        return getActiveUser(env, urlUserId);
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getActiveUser(env: AuthEnvironment, userId: string): Promise<AuthenticatedUser | null> {
  try {
    if (!env?.DB) return null;
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<any>();
    if (!user) return null;
    if (user.status && user.status !== 'active') return null;
    return user;
  } catch {
    return null;
  }
}

async function getSessionUserId(token: string, env: any): Promise<string | null> {
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const key = await getSigningKey(env, ['verify']);
    const validSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(signature).buffer as ArrayBuffer,
      new TextEncoder().encode(payload)
    );
    if (!validSignature) return null;

    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as {
      sub?: string;
      userId?: string;
      exp?: number;
    };
    const userId = claims.userId || claims.sub;
    if (!userId || userId.length > 128) return null;
    if (claims.exp && claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return userId;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${encodeBase64Url(salt)}$${encodeBase64Url(new Uint8Array(hash))}`;
}

export async function verifyPassword(password: string, stored: unknown): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (typeof stored !== 'string' || !password) return { valid: false, needsUpgrade: false };
  
  const trimmedStored = stored.trim();
  const trimmedPassword = password.trim();

  // 1. المطابقة المباشرة لكلمات المرور النصية القديمة (مثل 123456 أو Password@12)
  if (trimmedPassword === trimmedStored) {
    return { valid: true, needsUpgrade: true };
  }

  // 2. التحقق من التشفير PBKDF2
  const parts = trimmedStored.split('$');
  if (parts.length === 4 && parts[0] === 'pbkdf2') {
    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > 2_000_000) {
      return { valid: false, needsUpgrade: false };
    }
    try {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(trimmedPassword), 'PBKDF2', false, ['deriveBits']);
      const derived = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: decodeBase64Url(parts[2]).buffer as ArrayBuffer, iterations },
        key,
        256
      );
      const expected = decodeBase64Url(parts[3]);
      const actual = new Uint8Array(derived);
      let difference = actual.length ^ expected.length;
      for (let index = 0; index < Math.max(actual.length, expected.length); index++) {
        difference |= (actual[index] || 0) ^ (expected[index] || 0);
      }
      return { valid: difference === 0, needsUpgrade: false };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }

  return { valid: false, needsUpgrade: false };
}
