import {
  getKV,
  getJwtSecret,
  ensureDefaultUsers,
  signToken,
  toSafeUser,
  jsonResponse,
  errorResponse,
  handleOptions,
  StoredUser,
} from './_shared';

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  if (request.method !== 'POST') {
    return errorResponse('Método no permitido', 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { targetRole } = body;

    const kv = getKV(env);
    await ensureDefaultUsers(kv);

    // Map role to standard demo account
    const roleEmailMap: Record<string, string> = {
      SUPER_ADMIN: 'admin@inspectionpro.com',
      CONSULTANT: 'mateo@inspectionpro.com',
      OPERATOR: 'operario@inspectionpro.com',
      CLIENT: 'cliente@demologistics.com',
    };

    const targetEmail = roleEmailMap[targetRole] || 'mateo@inspectionpro.com';
    const userJson = await kv.get(`user:${targetEmail}`);

    if (!userJson) {
      return errorResponse(`No se encontró cuenta demo para el rol ${targetRole}.`, 404);
    }

    const user: StoredUser = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
    const secret = getJwtSecret(env);
    const safeUser = toSafeUser(user);
    const token = signToken(safeUser, secret);

    return jsonResponse({
      token,
      user: safeUser,
    });
  } catch (err: any) {
    console.error('EdgeOne Switch Role Error:', err);
    return errorResponse(err.message || 'Error al cambiar rol demo.', 500);
  }
}

export const onRequestPost = onRequest;
export default onRequest;
