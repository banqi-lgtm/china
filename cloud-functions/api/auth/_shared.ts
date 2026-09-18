import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// In-memory persistent fallback store if KV namespace is pending binding in console
const memoryStore = new Map<string, string>();

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'SUPER_ADMIN' | 'CONSULTANT' | 'OPERATOR' | 'CLIENT';
  company_id: string | null;
  company_name: string;
  phone?: string;
  active: number;
  created_at: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CONSULTANT' | 'OPERATOR' | 'CLIENT';
  company_id: string | null;
  company_name: string;
  phone?: string;
  active: number;
  created_at: string;
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function getKV(env: any) {
  if (env && env.USERS_KV && typeof env.USERS_KV.get === 'function') {
    return env.USERS_KV;
  }
  if (typeof (globalThis as any).USERS_KV !== 'undefined' && typeof (globalThis as any).USERS_KV.get === 'function') {
    return (globalThis as any).USERS_KV;
  }
  return {
    async get(key: string, type?: string) {
      const val = memoryStore.get(key) || null;
      if (val && type === 'json') {
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }
      return val;
    },
    async put(key: string, value: string) {
      memoryStore.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async delete(key: string) {
      memoryStore.delete(key);
    },
  };
}

export function getJwtSecret(env: any): string {
  const secret = env?.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured. Please set JWT_SECRET in EdgeOne console settings.');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: SafeUser, secret: string): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      name: user.name,
    },
    secret,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string, secret: string): any {
  return jwt.verify(token, secret);
}

export function toSafeUser(user: StoredUser): SafeUser {
  const { password_hash, ...safe } = user;
  return safe;
}

export function jsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// Seed default demo accounts into KV on first run
export async function ensureDefaultUsers(kv: any): Promise<void> {
  const seededKey = 'meta:seeded';
  const isSeeded = await kv.get(seededKey);
  if (isSeeded) return;

  const defaultAccounts = [
    {
      id: 'usr-admin-1',
      name: 'Super Admin',
      email: 'admin@inspectionpro.com',
      password: 'admin123',
      role: 'SUPER_ADMIN' as const,
      company_id: null,
      company_name: 'Plataforma Central',
      phone: '+1 (800) 555-0199',
    },
    {
      id: 'usr-mateo-2',
      name: 'Mateo (Lead Quality Consultant)',
      email: 'mateo@inspectionpro.com',
      password: 'mateo123',
      role: 'CONSULTANT' as const,
      company_id: null,
      company_name: 'Consultoría Especializada',
      phone: '+1 (800) 555-0122',
    },
    {
      id: 'usr-operario-3',
      name: 'Carlos Pérez (Operario de Calidad)',
      email: 'operario@inspectionpro.com',
      password: 'operario123',
      role: 'OPERATOR' as const,
      company_id: 'comp-demo-1',
      company_name: 'Empresa Demo / TransLogix Global',
      phone: '+57 310 456 7890',
    },
    {
      id: 'usr-cliente-4',
      name: 'Gerente TransLogix (Cliente Demo)',
      email: 'cliente@demologistics.com',
      password: 'cliente123',
      role: 'CLIENT' as const,
      company_id: 'comp-demo-1',
      company_name: 'Empresa Demo / TransLogix Global',
      phone: '+57 320 111 2233',
    },
  ];

  for (const acc of defaultAccounts) {
    const key = `user:${acc.email.toLowerCase().trim()}`;
    const existing = await kv.get(key);
    if (!existing) {
      const hash = await hashPassword(acc.password);
      const user: StoredUser = {
        id: acc.id,
        name: acc.name,
        email: acc.email.toLowerCase().trim(),
        password_hash: hash,
        role: acc.role,
        company_id: acc.company_id,
        company_name: acc.company_name,
        phone: acc.phone,
        active: 1,
        created_at: new Date().toISOString(),
      };
      await kv.put(key, JSON.stringify(user));
    }
  }

  await kv.put(seededKey, '1');
}
