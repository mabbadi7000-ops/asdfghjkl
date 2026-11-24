import { UserProfile, CompanySettings, DeletedRecord } from '../types';

const API_BASE = '/api';
const AUTH_USER_KEY = 'fleetops_current_user';
const AUTH_TOKEN_KEY = 'fleetops_session_token';
const PROTECTED_STORAGE_KEYS = new Set([AUTH_USER_KEY, AUTH_TOKEN_KEY, 'fleetops_user_id']);
const COLLECTION_CACHE_TTL_MS = 30_000;
const COLLECTION_CACHE_ALIASES: Record<string, string> = {
  fuel: 'fuel_records',
  maintenance: 'maintenance_records',
  payroll: 'payroll_records',
  letters: 'official_letters',
  platforms: 'platform_contracts',
  contracts: 'platform_contracts',
  invoices: 'platform_invoices',
  driver_leaves: 'leaves',
  shifts: 'vehicle_shifts',
  settlements: 'cash_settlements',
};

interface CollectionCacheEntry {
  value?: unknown[];
  expiresAt: number;
  inFlight?: Promise<unknown[]>;
}

const collectionCache = new Map<string, CollectionCacheEntry>();
const collectionCacheVersions = new Map<string, number>();
let collectionCacheEpoch = 0;
let activeAuthSession: { id: string; role: string; token: string } | null = null;

function canonicalCollectionName(collectionName: string): string {
  const normalized = collectionName.trim().toLowerCase();
  return COLLECTION_CACHE_ALIASES[normalized] || normalized;
}

function clearCollectionCache(): void {
  collectionCacheEpoch += 1;
  collectionCache.clear();
  collectionCacheVersions.clear();
}

// Collections whose data is derived from or synced with other collections.
const RELATED_COLLECTIONS: Record<string, string[]> = {
  leaves: ['attendance', 'drivers', 'vehicle_shifts'],
  vehicle_shifts: ['attendance', 'vehicles', 'drivers'],
  vehicles: ['documents', 'drivers'],
  drivers: ['documents', 'vehicles', 'rented_accounts'],
  fuel_records: ['fuel_chips', 'vehicles'],
  fuel_chips: ['fuel_records'],
  platform_contracts: ['delivery_platforms', 'documents'],
  delivery_platforms: ['platform_contracts'],
  cash_settlements: ['drivers'],
  driver_payrolls: ['driver_advances'],
  driver_advances: ['driver_payrolls'],
  freelancer_rentals: ['rented_accounts', 'freelancer_payments'],
  freelancer_payments: ['freelancer_rentals', 'supervisor_account_packages'],
  supervisor_account_packages: ['rented_accounts', 'freelancer_payments'],
};

function deleteCollectionCacheEntries(canonicalName: string): void {
  collectionCacheVersions.set(canonicalName, (collectionCacheVersions.get(canonicalName) || 0) + 1);
  for (const key of collectionCache.keys()) {
    if (key === canonicalName || key.startsWith(`${canonicalName}?`)) {
      collectionCache.delete(key);
    }
  }
}

function invalidateCollectionCache(collectionName: string): void {
  const canonicalName = canonicalCollectionName(collectionName);
  deleteCollectionCacheEntries(canonicalName);
  (RELATED_COLLECTIONS[canonicalName] || []).forEach(deleteCollectionCacheEntries);
}

/** Clears cached data for one collection (and its related ones), or everything when omitted. */
export function invalidateCache(collectionName?: string): void {
  if (collectionName) invalidateCollectionCache(collectionName);
  else clearCollectionCache();
}

function collectionCacheKey(collectionName: string, queryParams?: Record<string, string>): string {
  const canonicalName = canonicalCollectionName(collectionName);
  if (!queryParams) return canonicalName;
  const params = new URLSearchParams();
  Object.entries(queryParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => params.set(key, value));
  const query = params.toString();
  return query ? `${canonicalName}?${query}` : canonicalName;
}

export function setActiveAuthSession(user: UserProfile, token: string): void {
  clearCollectionCache();
  activeAuthSession = { id: user.id, role: user.role, token };
}

export function clearActiveAuthSession(): void {
  clearCollectionCache();
  activeAuthSession = null;
}

export function safeLocalStorageGetItem(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
    return;
  } catch {
    // Storage may be full or disabled. Evict only non-auth cache entries and retry once.
  }

  try {
    const removableKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const candidate = localStorage.key(index);
      if (
        candidate &&
        candidate !== key &&
        !PROTECTED_STORAGE_KEYS.has(candidate) &&
        /cache|collection|snapshot/i.test(candidate)
      ) removableKeys.push(candidate);
    }
    removableKeys.forEach((candidate) => localStorage.removeItem(candidate));
    localStorage.setItem(key, value);
  } catch {
    // Keep the application running even if browser storage is unavailable.
  }
}

export function safeLocalStorageRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    // Ignore disabled or unavailable browser storage.
  }
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const storedUser = safeLocalStorageGetItem(AUTH_USER_KEY);
  const user = storedUser ? safeJsonParse<{ id?: string; role?: string; sessionToken?: string } | null>(storedUser, null) : null;
  const userId = activeAuthSession?.id || (typeof user?.id === 'string' ? user.id : '');
  const role = activeAuthSession?.role || (typeof user?.role === 'string' ? user.role : '');
  const token = activeAuthSession?.token || safeLocalStorageGetItem(AUTH_TOKEN_KEY) || user?.sessionToken || '';
  const headers: Record<string, string> = {};
  if (userId) headers['X-FleetOps-User-Id'] = userId;
  if (role) headers['X-FleetOps-User-Role'] = role;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function getSessionToken(): string {
  return activeAuthSession?.token || safeLocalStorageGetItem(AUTH_TOKEN_KEY) || '';
}

export function appendSessionToken(fileUrl: string): string {
  const token = getSessionToken();
  if (!token || typeof window === 'undefined') return fileUrl;

  try {
    const url = new URL(fileUrl, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return fileUrl;
    url.searchParams.set('token', token);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fileUrl;
  }
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  Object.entries(getAuthHeaders()).forEach(([name, value]) => headers.set(name, value));
  const method = (init.method || 'GET').toUpperCase();
  const collectionName = path.split(/[?#]/, 1)[0].match(/^\/?api\/([^/]+)/i)?.[1];
  if (collectionName && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    invalidateCollectionCache(collectionName);
  }
  return fetch(path, { ...init, headers }).then((response) => {
    if (response.ok && collectionName && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      invalidateCollectionCache(collectionName);
    }
    if (response.status === 401 && !path.endsWith('/auth/login')) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('fleetops_auth_expired'));
    }
    return response;
  });
}

async function parseApiResponse<T>(response: Response, operationMessage: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = /application\/(?:[\w.-]+\+)?json/i.test(contentType);

  if (!response.ok) {
    let errorMessage = `${operationMessage} (HTTP ${response.status})`;
    if (isJson) {
      const result = await response.json().catch(() => null) as { error?: string; details?: string } | null;
      errorMessage = result?.details || result?.error || errorMessage;
    } else {
      const responseText = await response.text().catch(() => '');
      console.error('Non-JSON server response:', responseText.slice(0, 1000));
    }
    throw new Error(errorMessage);
  }

  if (!isJson) {
    const responseText = await response.text().catch(() => '');
    console.error('Non-JSON server response:', responseText.slice(0, 1000));
    throw new Error(`${operationMessage}: استجابة غير صالحة من الخادم (HTTP ${response.status})`);
  }

  try {
    return await response.json() as T;
  } catch {
    throw new Error(`${operationMessage}: تعذر تحليل استجابة الخادم`);
  }
}

export async function loginWithCredentials(username: string, password: string): Promise<{
  user: UserProfile;
  token: string;
  sessionToken: string;
  forcePasswordChange: boolean;
}> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  let result: { error?: string; details?: string; user?: UserProfile; token?: string; sessionToken?: string; forcePasswordChange?: boolean };
  try {
    result = await response.json();
  } catch {
    throw new Error(`تعذر قراءة استجابة تسجيل الدخول (HTTP ${response.status})`);
  }
  const token = result.token || result.sessionToken;
  if (!response.ok || !result.user || !token) {
    throw new Error(result.error || result.details || `فشل تسجيل الدخول (HTTP ${response.status})`);
  }
  return { user: result.user, token, sessionToken: token, forcePasswordChange: Boolean(result.forcePasswordChange) };
}

export async function verifyPasswordWithApi(password: string): Promise<boolean> {
  const response = await apiFetch(`${API_BASE}/auth/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) return false;
  const result = await response.json() as { valid?: boolean };
  return result.valid === true;
}

export async function changePasswordWithApi(newPassword: string): Promise<boolean> {
  const response = await apiFetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });
  return response.ok;
}

function deserializeValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trimStart();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;

  try {
    return safeJsonParse(value, value);
  } catch {
    return value;
  }
}

function deserializeRecord<T>(record: unknown): T {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return record as T;
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, key === 'payload' ? value : deserializeValue(value)])
  ) as T;
}

// جلب مجموعة كاملة مع دعم الفلاتر
export async function fetchCollection<T>(
  collectionName: string,
  queryParams?: Record<string, string>,
  options: { forceRefresh?: boolean } = {}
): Promise<T[]> {
  const key = collectionCacheKey(collectionName, queryParams);
  const now = Date.now();
  for (const [entryKey, entry] of collectionCache) {
    if (!entry.inFlight && entry.expiresAt <= now) collectionCache.delete(entryKey);
  }

  const cached = collectionCache.get(key);
  if (!options.forceRefresh && cached?.value && cached.expiresAt > now) {
    return cached.value as T[];
  }
  if (cached?.inFlight) return cached.inFlight as Promise<T[]>;

  let url = `${API_BASE}/${collectionName}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  let request: Promise<unknown[]>;
  request = (async () => {
    let requestEpoch = collectionCacheEpoch;
    let requestVersion = collectionCacheVersions.get(canonicalCollectionName(collectionName)) || 0;

    try {
      while (true) {
        const res = await apiFetch(url);
        const data = await parseApiResponse<unknown>(res, `تعذر جلب ${collectionName}`);
        const items = ((data || []) as unknown[]).map(deserializeRecord<T>);
        const canonicalName = canonicalCollectionName(collectionName);
        const currentVersion = collectionCacheVersions.get(canonicalName) || 0;

        if (requestEpoch !== collectionCacheEpoch || requestVersion !== currentVersion) {
          const newer = collectionCache.get(key);
          if (newer?.inFlight && newer.inFlight !== request) {
            return newer.inFlight;
          }
          if (newer?.value && newer.expiresAt > Date.now()) {
            return newer.value;
          }
          requestEpoch = collectionCacheEpoch;
          requestVersion = currentVersion;
          continue;
        }

        const newer = collectionCache.get(key);
        if (newer?.inFlight && newer.inFlight !== request) {
          return newer.inFlight;
        }
        collectionCache.set(key, { value: items, expiresAt: Date.now() + COLLECTION_CACHE_TTL_MS });
        return items;
      }
    } catch (err) {
      const newer = collectionCache.get(key);
      if (newer?.inFlight && newer.inFlight !== request) return newer.inFlight;
      if (newer?.value && newer.expiresAt > Date.now()) {
        if (newer.inFlight === request) {
          collectionCache.set(key, { value: newer.value, expiresAt: newer.expiresAt });
        }
        return newer.value;
      }
      console.error(`[fetchCollection] Error on ${collectionName}:`, err);
      return [];
    } finally {
      if (collectionCache.get(key)?.inFlight === request) collectionCache.delete(key);
    }
  })();

  collectionCache.set(key, {
    ...(cached?.value ? { value: cached.value } : {}),
    expiresAt: cached?.expiresAt || 0,
    inFlight: request,
  });
  return await request as T[];
}

// جلب مستند محدد عبر ID
export async function fetchDocument<T>(collectionName: string, id: string): Promise<T | null> {
  try {
    const res = await apiFetch(`${API_BASE}/${collectionName}/${encodeURIComponent(id)}`);
    if (!res.ok) {
      await parseApiResponse<unknown>(res, `تعذر جلب ${collectionName}/${id}`);
      return null;
    }
    return deserializeRecord<T>(await parseApiResponse<unknown>(res, `تعذر جلب ${collectionName}/${id}`));
  } catch (err) {
    console.error(`[fetchDocument] Error on ${collectionName}/${id}:`, err);
    return null;
  }
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  return fetchDocument<T>(collectionName, id);
}

// إنشاء مستند جديد
export async function createDocument<T extends object>(collectionName: string, data: T): Promise<string> {
  const now = new Date().toISOString();
  const record = data as T & { createdAt?: unknown; updatedAt?: unknown };
  const res = await apiFetch(`${API_BASE}/${collectionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
    }),
  });
  const result = await parseApiResponse<{ success?: boolean; id?: string }>(res, 'تعذر حفظ السجل في قاعدة البيانات');
  if (typeof result.id !== 'string' || !result.id) throw new Error('استجابة الحفظ لا تحتوي على معرف السجل');

  await runOperationalLifecycle(collectionName, 'create', { ...data, id: result.id });
  return result.id;
}

// تعديل مستند موجود
export async function updateDocument<T extends object>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
  const table = collectionName.toLowerCase();
  const previous =
    [
      'drivers',
      'vehicles',
      'vehicle_shifts',
      'shifts',
      'maintenance',
      'maintenance_records',
      'accidents',
    ].includes(table)
      ? await fetchDocument<Record<string, unknown>>(collectionName, id)
      : null;
  const res = await apiFetch(`${API_BASE}/${collectionName}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString(),
    }),
  });
  await parseApiResponse<{ success?: boolean }>(res, 'تعذر تحديث السجل في قاعدة البيانات');

  await runOperationalLifecycle(collectionName, 'update', { ...data, id }, previous || undefined);
}

async function runOperationalLifecycle(
  collectionName: string,
  operation: 'create' | 'update',
  record: Record<string, unknown>,
  previous?: Record<string, unknown>
): Promise<void> {
  const table = collectionName.toLowerCase();
  if (
    ![
      'fuel',
      'fuel_records',
      'drivers',
      'vehicles',
      'maintenance',
      'maintenance_records',
      'accidents',
      'vehicle_shifts',
      'shifts',
    ].includes(table)
  ) {
    return;
  }

  try {
    const { handleOperationalLifecycle } = await import('./operationalSyncService');
    await handleOperationalLifecycle(table, operation, previous ? { ...previous, ...record } : record, previous);
  } catch (error) {
    const id = typeof record.id === 'string' ? record.id : 'unknown';
    throw new Error(
      `Record ${collectionName}/${id} was saved, but its operational synchronization failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// حذف مستند نهائياً
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/${collectionName}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await parseApiResponse<{ success?: boolean }>(res, 'تعذر حذف السجل من قاعدة البيانات');
}

// محاكاة Real-time Polling لتعمل كل الشاشات التفاعلية بدون تغيير في واجهة React
export function subscribeToCollection<T>(
  collectionName: string,
  callback: (items: T[]) => void,
  _constraints?: any[]
): () => void {
  let active = true;

  const pull = async (forceRefresh = false) => {
    if (!active) return;
    const items = await fetchCollection<T>(collectionName, undefined, { forceRefresh });
    if (active) callback(items);
  };

  pull();
  const intervalId = setInterval(() => { void pull(true); }, 9000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
}

export function subscribeToDocument<T>(
  collectionName: string,
  id: string,
  callback: (item: T | null) => void
): () => void {
  let active = true;

  const pull = async () => {
    if (!active) return;
    const item = await fetchDocument<T>(collectionName, id);
    if (active) callback(item);
  };

  pull();
  const intervalId = setInterval(pull, 9000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
}

// إعدادات الشركة
export async function getCompanySettings(): Promise<CompanySettings> {
  const defaultSettings: CompanySettings = {
    companyName: 'شركة مارشال لوجستك (MARSHAL LOGISTIC LLC)',
    commercialRegistration: '7054828277',
    taxNumber: '310298471200003',
    phone: '+966 11 456 7890',
    email: 'operations@marshal-logistic.sa',
    address: 'الرياض - المملكة العربية السعودية',
    defaultCurrency: 'SAR',
    fuelPricePerLiter91: 2.18,
    fuelPricePerLiter95: 2.33,
    fuelPriceDiesel: 1.15,
    alertExpiryDays: 30,
  };
  const cloudSettings = await fetchDocument<Partial<CompanySettings>>('system_settings', 'global_company_settings');
  return { ...defaultSettings, ...cloudSettings };
}

export async function updateCompanySettings(settings: Partial<CompanySettings>): Promise<void> {
  await createDocument('system_settings', { id: 'global_company_settings', ...settings });
}

// الحذف المؤقت لسلة المهملات
export async function softDeleteDocumentWithPassword(
  collectionName: string,
  id: string,
  itemTitle: string,
  _itemData: any,
  currentUser: UserProfile,
  deletionReason?: string,
  itemSummary?: string
): Promise<string> {
  const recordToDelete = await fetchDocument<Record<string, unknown>>(collectionName, id);
  if (!recordToDelete) {
    return '';
  }

  const deletedAt = new Date().toISOString();
  const trashId = `trash-${Date.now()}`;
  const trashPayload = {
    id: trashId,
    originalCollection: collectionName,
    originalId: id,
    itemTitle: itemTitle || `${collectionName} #${id}`,
    payload: JSON.stringify(recordToDelete),
    deletedByUserId: currentUser.id,
    deletedByUserName: currentUser.fullName,
    deletionReason: deletionReason || 'Authorized deletion',
    deletionMetadata: itemSummary || '',
    deletedAt,
  };

  await createDocument('recycle_bin', trashPayload);
  await deleteDocument(collectionName, id);
  return trashId;
}

// استعادة عنصر من سلة المهملات
export async function restoreDeletedRecord(deletedRecord: DeletedRecord, _currentUser: UserProfile): Promise<boolean> {
  try {
    const storedPayload = deletedRecord.payload ?? deletedRecord.itemData;
    const rawData = typeof storedPayload === 'string' ? safeJsonParse(storedPayload, null) : storedPayload;
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
      throw new Error(`Recycle-bin record ${deletedRecord.id} has an invalid payload.`);
    }

    await createDocument(deletedRecord.originalCollection, {
      ...(rawData as Record<string, unknown>),
      id: deletedRecord.originalId,
    });
    await deleteDocument('recycle_bin', deletedRecord.id);
    return true;
  } catch (err) {
    console.error('[restoreDeletedRecord] Error:', err);
    throw err;
  }
}

// الحذف النهائي من سلة المهملات
export async function permanentlyDeleteRecord(deletedRecordId: string): Promise<boolean> {
  await deleteDocument('recycle_bin', deletedRecordId);
  return true;
}
