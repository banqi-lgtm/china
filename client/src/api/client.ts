import {
  MOCK_USERS,
  MOCK_COMPANIES,
  MOCK_CHECKLIST_TEMPLATE,
  MOCK_INSPECTIONS,
  MOCK_INSPECTION_DETAIL,
  MOCK_STATS,
  MOCK_REPORTS,
  MOCK_AUDIT_LOGS,
} from './mockData';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function handleMockRequest<T = any>(endpoint: string, options: RequestInit = {}): T {
  const method = (options.method || 'GET').toUpperCase();
  let body: any = {};
  if (options.body && typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body);
    } catch (e) {
      body = {};
    }
  }

  // 1. Auth: Login
  if (endpoint.startsWith('/auth/login')) {
    const email = body.email || 'mateo@inspectionpro.com';
    const user = MOCK_USERS[email] || MOCK_USERS['mateo@inspectionpro.com'];
    localStorage.setItem('currentUser', JSON.stringify(user));
    return {
      token: `mock-jwt-${user.role}-${Date.now()}`,
      user,
    } as T;
  }

  // 2. Auth: Me
  if (endpoint.startsWith('/auth/me')) {
    const stored = localStorage.getItem('currentUser');
    const user = stored ? JSON.parse(stored) : MOCK_USERS['mateo@inspectionpro.com'];
    return { user } as T;
  }

  // 3. Auth: Switch Role
  if (endpoint.startsWith('/auth/switch-role')) {
    const targetRole = body.targetRole || 'CONSULTANT';
    const user = Object.values(MOCK_USERS).find((u: any) => u.role === targetRole) || MOCK_USERS['mateo@inspectionpro.com'];
    localStorage.setItem('currentUser', JSON.stringify(user));
    return {
      token: `mock-jwt-${user.role}-${Date.now()}`,
      user,
    } as T;
  }

  // 4. Inspections: Detail
  if (endpoint.match(/\/inspections\/[a-zA-Z0-9_-]+$/) && method === 'GET') {
    return MOCK_INSPECTION_DETAIL as T;
  }

  // 5. Inspections: List
  if (endpoint.startsWith('/inspections') && method === 'GET') {
    return { inspections: MOCK_INSPECTIONS } as T;
  }

  // 6. Inspections: Status Change
  if (endpoint.includes('/status') && method === 'POST') {
    return { success: true } as T;
  }

  // 7. Checklists Template
  if (endpoint.startsWith('/checklists/template')) {
    return { template: MOCK_CHECKLIST_TEMPLATE } as T;
  }

  // 8. Stats / Dashboard
  if (endpoint.startsWith('/stats/dashboard')) {
    return { stats: MOCK_STATS } as T;
  }

  // 9. Reports Center
  if (endpoint.startsWith('/reports') && method === 'GET') {
    return { reports: MOCK_REPORTS } as T;
  }

  // 10. Generate Report
  if (endpoint.startsWith('/reports/generate')) {
    return {
      success: true,
      reportCode: 'INS-2026-000888',
      downloadUrl: '/uploads/reports/REPORT_INS-2026-000888_1789753679935.pdf',
    } as T;
  }

  // 11. Companies
  if (endpoint.startsWith('/companies') && method === 'GET') {
    return { companies: MOCK_COMPANIES } as T;
  }

  // 12. Users
  if (endpoint.startsWith('/users') && method === 'GET') {
    return { users: Object.values(MOCK_USERS) } as T;
  }

  // 13. Audit Logs
  if (endpoint.startsWith('/audit-logs')) {
    return { logs: MOCK_AUDIT_LOGS } as T;
  }

  return { success: true } as T;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let useFallback = false;
  let responseData: any = null;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    // If backend returns 404, 502, or HTML (EdgeOne static SPA rewrite fallback)
    if (!response.ok || contentType.includes('text/html')) {
      useFallback = true;
    } else {
      responseData = await response.json();
    }
  } catch (netErr) {
    // Network error (offline or backend not running on current host)
    useFallback = true;
  }

  if (useFallback) {
    return handleMockRequest<T>(endpoint, options);
  }

  return responseData as T;
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
