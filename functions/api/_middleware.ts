const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-FleetOps-User-Id, X-FleetOps-User-Role',
  'Access-Control-Max-Age': '86400',
};

function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([name, value]) => headers.set(name, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isPublicRequest(request: Request): boolean {
  const url = new URL(request.url);
  const path = url.pathname;
  return (request.method === 'POST' && path === '/api/auth/login') ||
    (request.method === 'GET' && /^\/api\/system_settings(?:\/|$)/.test(path)) ||
    (request.method === 'GET' && /^\/api\/files\/(?:branding|public)\//.test(path));
}

export const onRequest: PagesFunction = async ({ request, next }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.url.includes('/api/auth/login')) {
    return addCorsHeaders(await next());
  }

  const publicRequest = isPublicRequest(request);
  const response = await next();
  const corsResponse = addCorsHeaders(response);
  const headers = new Headers(corsResponse.headers);
  if (publicRequest && request.method === 'GET' && /^\/api\/system_settings(?:\/|$)/.test(new URL(request.url).pathname)) {
    headers.set('Cache-Control', 'no-store');
  }
  return new Response(corsResponse.body, { status: corsResponse.status, statusText: corsResponse.statusText, headers });
};
