import {
  getKV,
  getJwtSecret,
  verifyToken,
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

  if (request.method !== 'GET') {
    return errorResponse('Método no permitido', 405);
  }

  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autorización no proporcionado o inválido.', 401);
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const secret = getJwtSecret(env);

    let decoded: any;
    try {
      decoded = verifyToken(token, secret);
    } catch (e) {
      return errorResponse('Token de sesión expirado o inválido.', 401);
    }

    const kv = getKV(env);
    const userKey = `user:${decoded.email.toLowerCase().trim()}`;
    const userJson = await kv.get(userKey);

    if (!userJson) {
      return errorResponse('Usuario no encontrado en la base de datos.', 404);
    }

    const user: StoredUser = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
    return jsonResponse({
      user: toSafeUser(user),
    });
  } catch (err: any) {
    console.error('EdgeOne Auth Me Error:', err);
    return errorResponse(err.message || 'Error verificando sesión de usuario.', 500);
  }
}

export const onRequestGet = onRequest;
export default onRequest;
