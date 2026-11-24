import {
  authenticateRequest,
  hashPassword,
  verifyPassword,
  signSessionToken,
  AuthEnvironment
} from '../_shared/auth';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-FleetOps-User-Id',
};

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

const TABLE_ALIASES: Record<string, string> = {
  users: 'users',
  drivers: 'drivers',
  driver_leaves: 'leaves',
  driver_advances: 'driver_advances',
  driver_payrolls: 'driver_payrolls',
  vehicles: 'vehicles',
  fuel: 'fuel_records',
  fuel_records: 'fuel_records',
  fuel_chips: 'fuel_chips',
  maintenance: 'maintenance_records',
  maintenance_records: 'maintenance_records',
  accidents: 'accidents',
  violations: 'violations',
  cash_settlements: 'cash_settlements',
  settlements: 'cash_settlements',
  expenses: 'expenses',
  freelancers: 'freelancers',
  payroll: 'payroll_records',
  payroll_records: 'payroll_records',
  leaves: 'leaves',
  attendance: 'attendance',
  vehicle_shifts: 'vehicle_shifts',
  shifts: 'vehicle_shifts',
  mileage_logs: 'mileage_logs',
  rented_accounts: 'rented_accounts',
  freelancer_rentals: 'freelancer_rentals',
  supervisor_account_packages: 'supervisor_account_packages',
  freelancer_payments: 'freelancer_payments',
  tasks: 'tasks',
  reports: 'reports',
  branches: 'branches',
  recycle_bin: 'recycle_bin',
  notifications: 'notifications',
  official_letters: 'official_letters',
  letters: 'official_letters',
  documents: 'documents',
  system_settings: 'system_settings',
  system_backups: 'system_backups',
  audit_logs: 'audit_logs',
  platform_contracts: 'platform_contracts',
  platforms: 'platform_contracts',
  contracts: 'platform_contracts',
  delivery_platforms: 'delivery_platforms',
  platform_revenues: 'platform_revenues',
  platform_invoices: 'platform_invoices',
  invoices: 'platform_invoices',
};

function resolveTableName(rawTable: string): string | null {
  const clean = rawTable.toLowerCase().trim();
  return TABLE_ALIASES[clean] || null;
}

function getSubPath(request: Request): string {
  return new URL(request.url).pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
}

function apiErrorResponse(subPath: string, err: unknown): Response {
  const error = err instanceof Error ? err.message : String(err);
  console.error(`API Error on ${subPath}:`, err);
  return jsonResponse({ error: 'فشل تنفيذ العملية على الخادم', details: error }, 500);
}

async function ensureRuntimeTables(db: D1Database, table: string): Promise<void> {
  if (table === 'notifications') {
    await db.prepare(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipientId TEXT,
      targetRole TEXT,
      title TEXT,
      message TEXT,
      type TEXT,
      priority TEXT DEFAULT 'normal',
      isRead INTEGER DEFAULT 0,
      link TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`).run();
    const existing = await getTableColumns(db, 'notifications');
    const required: Record<string, string> = {
      recipientId: 'TEXT',
      targetRole: 'TEXT',
      title: 'TEXT',
      message: 'TEXT',
      type: 'TEXT',
      priority: "TEXT DEFAULT 'normal'",
      isRead: 'INTEGER DEFAULT 0',
      link: 'TEXT',
      createdAt: 'TEXT',
      updatedAt: 'TEXT',
    };
    for (const [column, type] of Object.entries(required)) {
      if (!existing.has(column)) {
        await db.prepare(`ALTER TABLE notifications ADD COLUMN "${column}" ${type}`).run();
      }
    }
    return;
  }
  if (table === 'documents') {
    const documentColumns = await getTableColumns(db, 'documents');
    if (documentColumns.size > 0 && !documentColumns.has('category')) {
      await db.prepare('ALTER TABLE documents ADD COLUMN "category" TEXT').run();
    }
    return;
  }
  if (table === 'delivery_platforms') {
    await db.prepare(`CREATE TABLE IF NOT EXISTS delivery_platforms (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT,
      updatedAt TEXT
    )`).run();
    return;
  }
  if (table !== 'platform_contracts') return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS platform_contracts (
    id TEXT PRIMARY KEY,
    platformId TEXT,
    platformName TEXT,
    contractNumber TEXT,
    name TEXT,
    contactPerson TEXT,
    contactPhone TEXT,
    contactEmail TEXT,
    contractType TEXT,
    startDate TEXT,
    endDate TEXT,
    status TEXT DEFAULT 'active',
    activeDriversCount INTEGER DEFAULT 0,
    activeVehiclesCount INTEGER DEFAULT 0,
    commissionRate REAL DEFAULT 0,
    targetOrders INTEGER DEFAULT 0,
    terms TEXT,
    contractFileUrl TEXT,
    notes TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`).run();
  const existing = await getTableColumns(db, 'platform_contracts');
  const required: Record<string, string> = {
    platformId: 'TEXT', platformName: 'TEXT', contractNumber: 'TEXT', name: 'TEXT',
    contactPerson: 'TEXT', contactPhone: 'TEXT', contactEmail: 'TEXT', contractType: 'TEXT',
    startDate: 'TEXT', endDate: 'TEXT', status: "TEXT DEFAULT 'active'",
    activeDriversCount: 'INTEGER DEFAULT 0', activeVehiclesCount: 'INTEGER DEFAULT 0',
    commissionRate: 'REAL DEFAULT 0', targetOrders: 'INTEGER DEFAULT 0', terms: 'TEXT',
    contractFileUrl: 'TEXT', notes: 'TEXT', createdAt: 'TEXT', updatedAt: 'TEXT',
  };
  for (const [column, type] of Object.entries(required)) {
    if (!existing.has(column)) {
      await db.prepare(`ALTER TABLE platform_contracts ADD COLUMN "${column}" ${type}`).run();
    }
  }
}

async function ensureOfficialLettersTable(db: D1Database): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS official_letters (
    id TEXT PRIMARY KEY,
    letterNumber TEXT,
    referenceNumber TEXT,
    title TEXT,
    subject TEXT,
    recipient TEXT,
    recipientTitle TEXT,
    content TEXT,
    contentHtml TEXT,
    date TEXT,
    issueDate TEXT,
    status TEXT DEFAULT 'draft',
    templateId TEXT,
    letterMode TEXT,
    category TEXT,
    driverId TEXT,
    driverName TEXT,
    platformId TEXT,
    platformName TEXT,
    hasStamp INTEGER,
    hasSignature INTEGER,
    signerName TEXT,
    signerTitle TEXT,
    senderName TEXT,
    senderRole TEXT,
    attachments TEXT,
    metadata TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`).run();

  const requiredColumns: Record<string, string> = {
    letterNumber: 'TEXT',
    referenceNumber: 'TEXT',
    title: 'TEXT',
    subject: 'TEXT',
    recipient: 'TEXT',
    recipientTitle: 'TEXT',
    content: 'TEXT',
    contentHtml: 'TEXT',
    date: 'TEXT',
    issueDate: 'TEXT',
    status: "TEXT DEFAULT 'draft'",
    templateId: 'TEXT',
    letterMode: 'TEXT',
    category: 'TEXT',
    driverId: 'TEXT',
    driverName: 'TEXT',
    platformId: 'TEXT',
    platformName: 'TEXT',
    hasStamp: 'INTEGER',
    hasSignature: 'INTEGER',
    signerName: 'TEXT',
    signerTitle: 'TEXT',
    senderName: 'TEXT',
    senderRole: 'TEXT',
    attachments: 'TEXT',
    metadata: 'TEXT',
    createdAt: 'TEXT',
    updatedAt: 'TEXT',
  };
  const existingColumns = await getTableColumns(db, 'official_letters');
  if (!existingColumns.has('id')) throw new Error('جدول official_letters لا يحتوي على عمود id');
  for (const [column, type] of Object.entries(requiredColumns)) {
    if (!existingColumns.has(column)) {
      await db.prepare(`ALTER TABLE official_letters ADD COLUMN "${column}" ${type}`).run();
    }
  }

  // أعمدة مزامنة الخطابات مع جدول الأرشيف
  const documentColumns = await getTableColumns(db, 'documents');
  if (documentColumns.size > 0) {
    const archiveColumns: Record<string, string> = {
      documentType: 'TEXT',
      referenceNumber: 'TEXT',
      entityId: 'TEXT',
      entityType: 'TEXT',
      category: 'TEXT',
      status: 'TEXT',
      metadata: 'TEXT',
      notes: 'TEXT',
      issueDate: 'TEXT',
    };
    for (const [column, type] of Object.entries(archiveColumns)) {
      if (!documentColumns.has(column)) {
        await db.prepare(`ALTER TABLE documents ADD COLUMN "${column}" ${type}`).run();
      }
    }
  }
}

async function getTableColumns(db: D1Database, table: string): Promise<Set<string>> {
  const result = await db.prepare(`PRAGMA table_info("${table}")`).all<{ name: string }>();
  return new Set((result.results || []).map((column) => column.name));
}

function serializeDatabaseValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'bigint') return value.toString();
  if (value && typeof value === 'object' && !(value instanceof ArrayBuffer) && !ArrayBuffer.isView(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function filterDatabaseData(data: Record<string, unknown>, columns: Set<string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key, value]) => columns.has(key) && value !== undefined)
      .map(([key, value]) => [key, serializeDatabaseValue(value)])
  );
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new Error('بيانات الطلب غير صالحة');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('يجب أن تكون بيانات الطلب كائناً صالحاً');
  }
  return body as Record<string, unknown>;
}

// معالجة تسجيل الدخول الآمن والمتطابق 100% مع مخطط قاعدة البيانات
async function handleLoginRequest(context: any): Promise<Response> {
  try {
    const db = context.env?.DB as D1Database | undefined;
    if (!db) {
      return jsonResponse({ error: 'قاعدة البيانات غير متصلة' }, 503);
    }

    let body: any = {};
    try {
      const rawText = await context.request.text();
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      return jsonResponse({ error: 'بيانات الطلب غير صالحة' }, 400);
    }

    const rawIdentifier = String(
      body.username ?? body.identifier ?? body.iqamaNumber ?? body.phone ?? ''
    ).trim();
    const rawPassword = String(body.password ?? '').trim();

    if (!rawIdentifier || !rawPassword) {
      return jsonResponse({ error: 'يرجى إدخال رقم الإقامة وكلمة المرور' }, 400);
    }

    // تحويل الأرقام العربية (٠-٩) إلى أرقام لاتينية (0-9)
    const identifier = rawIdentifier.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

    // البحث في الأعمدة الفعلية للجدول: iqamaNumber, email, phone, id
    const user = await db.prepare(
      `SELECT * FROM users 
       WHERE iqamaNumber = ? 
          OR email = ? 
          OR phone = ? 
          OR id = ? 
       LIMIT 1`
    ).bind(identifier, identifier, identifier, identifier).first<any>();

    if (!user) {
      return jsonResponse({ error: 'رقم الإقامة أو الحساب غير مسجل بالنظام' }, 401);
    }

    if (user.status && user.status !== 'active') {
      return jsonResponse({ error: 'الحساب غير نشط، يرجى مراجعة الإدارة' }, 403);
    }

    const storedPassword = String(user.password || '');
    const isVerified = await verifyPassword(rawPassword, storedPassword);

    if (!isVerified.valid) {
      return jsonResponse({ error: 'كلمة المرور غير صحيحة' }, 401);
    }

    // ترقية كلمة المرور آلياً إذا كانت بنص عادي
    if (isVerified.needsUpgrade && user.id) {
      try {
        const upgraded = await hashPassword(rawPassword);
        await db.prepare('UPDATE users SET password = ? WHERE id = ?').bind(upgraded, user.id).run();
      } catch {
        // عدم تعطيل تسجيل الدخول إذا فشل التحديث الخلفي
      }
    }

    // إنشاء توكن الجلسة الآمن
    const token = await signSessionToken(context.env, {
      userId: String(user.id),
      username: String(user.iqamaNumber || user.fullName || 'admin'),
      role: String(user.role || 'admin'),
    });

    return jsonResponse({
      user: {
        id: user.id,
        iqamaNumber: user.iqamaNumber,
        username: user.iqamaNumber,
        fullName: user.fullName,
        name: user.fullName,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle,
        phone: user.phone,
        status: user.status,
      },
      token,
    }, 200);

  } catch (err: any) {
    console.error('Login Handler Failure:', err);
    return jsonResponse({
      error: 'فشل أثناء معالجة تسجيل الدخول',
      details: err?.message || String(err),
    }, 400);
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context: any): Promise<Response> {
  const subPath = getSubPath(context.request);
  try {
    // 1. التحقق من المستخدم الحالي
    if (subPath === 'auth/me' || subPath === 'auth/verify') {
      const authUser = await authenticateRequest(context.request, context.env);
      if (!authUser) return jsonResponse({ error: 'غير مصرح' }, 401);
      return jsonResponse({ user: authUser });
    }

    // 2. إعدادات الهوية العامة والشعار (متاحة دون تسجيل دخول)
    if (subPath === 'system_settings' || subPath.startsWith('system_settings/')) {
      const db = context.env.DB;
      const row = await db.prepare('SELECT * FROM system_settings LIMIT 1').first();
      return jsonResponse(row || {});
    }

    // 3. التحقق من الصلاحية لبقية الجداول
    const authUser = await authenticateRequest(context.request, context.env);
    if (!authUser) {
      return jsonResponse({ error: 'غير مصرح بالدخول' }, 401);
    }

    const segments = subPath.split('/');
    const tableAlias = segments[0];
    const recordId = segments[1];
    const realTable = resolveTableName(tableAlias);

    if (!realTable) {
      return jsonResponse({ error: `الجدول ${tableAlias} غير موجود` }, 404);
    }

    const db = context.env.DB;
    if (realTable === 'official_letters') await ensureOfficialLettersTable(db);
    await ensureRuntimeTables(db, realTable);
    if (recordId) {
      const item = await db.prepare(`SELECT * FROM ${realTable} WHERE id = ?`).bind(recordId).first();
      if (!item) return jsonResponse({ error: 'العنصر غير موجود' }, 404);
      return jsonResponse(item);
    }

    const all = await db.prepare(`SELECT * FROM ${realTable}`).all();
    return jsonResponse(all.results || []);
  } catch (err) {
    return apiErrorResponse(subPath, err);
  }
}

export async function onRequestPost(context: any): Promise<Response> {
  const subPath = getSubPath(context.request);
  try {
    if (subPath === 'auth/login' || subPath === 'login') {
      return await handleLoginRequest(context);
    }

    const authUser = await authenticateRequest(context.request, context.env);
    if (!authUser) return jsonResponse({ error: 'غير مصرح' }, 401);

    const segments = subPath.split('/');
    const realTable = resolveTableName(segments[0]);
    if (!realTable) return jsonResponse({ error: 'جدول غير صالح' }, 400);

    const db = context.env?.DB as D1Database | undefined;
    if (!db) throw new Error('قاعدة البيانات غير متصلة');
    if (realTable === 'official_letters') await ensureOfficialLettersTable(db);
    await ensureRuntimeTables(db, realTable);

    const body = await readJsonBody(context.request);
    const now =  new Date().toISOString();
    const rawId = body.id;
    const id = typeof rawId === 'string' && rawId.trim()
      ? rawId.trim()
      : rawId !== undefined && rawId !== null
      ? String(rawId)
      : `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const data = {
      ...body,
      id,
      createdAt: typeof body.createdAt === 'string' ? body.createdAt : now,
      updatedAt: now,
    };
    const columns = await getTableColumns(db, realTable);
    if (columns.size === 0) throw new Error(`جدول ${realTable} غير موجود أو بلا أعمدة`);
    const safeData = filterDatabaseData(data, columns);
    const keys = Object.keys(safeData);
    if (keys.length === 0) return jsonResponse({ error: 'لا توجد حقول صالحة للحفظ' }, 400);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map((key) => safeData[key]);

    await db.prepare(
      `INSERT INTO ${realTable} (${keys.map((key) => `"${key}"`).join(', ')}) VALUES (${placeholders})`
    ).bind(...values).run();

    return jsonResponse({ success: true, id, data: safeData }, 201);
  } catch (err) {
    return apiErrorResponse(subPath, err);
  }
}

export async function onRequestPut(context: any): Promise<Response> {
  const subPath = getSubPath(context.request);
  try {
    const authUser = await authenticateRequest(context.request, context.env);
    if (!authUser) return jsonResponse({ error: 'غير مصرح' }, 401);

    const segments = subPath.split('/');
    const realTable = resolveTableName(segments[0]);
    const recordId = segments[1];
    if (!realTable) return jsonResponse({ error: 'جدول غير صالح' }, 400);

    const db = context.env?.DB as D1Database | undefined;
    if (!db) throw new Error('قاعدة البيانات غير متصلة');
    if (realTable === 'official_letters') await ensureOfficialLettersTable(db);
    await ensureRuntimeTables(db, realTable);

    const body = await readJsonBody(context.request);
    const rawTargetId = recordId || body.id;
    if (rawTargetId === undefined || rawTargetId === null || String(rawTargetId).trim() === '') {
      return jsonResponse({ error: 'معرف السجل مفقود' }, 400);
    }
    const targetId = String(rawTargetId);
    const columns = await getTableColumns(db, realTable);
    if (columns.size === 0) throw new Error(`جدول ${realTable} غير موجود أو بلا أعمدة`);
    const safeData = filterDatabaseData({ ...body, updatedAt: new Date().toISOString() }, columns);
    delete safeData.id;
    const keys = Object.keys(safeData);
    if (keys.length === 0) return jsonResponse({ error: 'لا توجد حقول صالحة للتحديث' }, 400);

    const sets = keys.map((key) => `"${key}" = ?`).join(', ');
    const values = [...keys.map((key) => safeData[key]), targetId];
    await db.prepare(`UPDATE ${realTable} SET ${sets} WHERE id = ?`).bind(...values).run();

    return jsonResponse({ success: true, id: targetId });
  } catch (err) {
    return apiErrorResponse(subPath, err);
  }
}

export async function onRequestDelete(context: any): Promise<Response> {
  const subPath = getSubPath(context.request);
  try {
    const authUser = await authenticateRequest(context.request, context.env);
    if (!authUser) return jsonResponse({ error: 'غير مصرح' }, 401);

    const segments = subPath.split('/');
    const realTable = resolveTableName(segments[0]);
    const recordId = segments[1];
    if (!realTable || !recordId) return jsonResponse({ error: 'طلب غير صالح' }, 400);

    const db = context.env?.DB as D1Database | undefined;
    if (!db) throw new Error('قاعدة البيانات غير متصلة');
    if (realTable === 'official_letters') await ensureOfficialLettersTable(db);
    await ensureRuntimeTables(db, realTable);
    await db.prepare(`DELETE FROM ${realTable} WHERE id = ?`).bind(recordId).run();

    return jsonResponse({ success: true });
  } catch (err) {
    return apiErrorResponse(subPath, err);
  }
}
