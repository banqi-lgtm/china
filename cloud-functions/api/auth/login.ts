import {
  getKV,
  getJwtSecret,
  ensureDefaultUsers,
  verifyPassword,
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
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('El correo electrónico y la contraseña son obligatorios.', 400);
    }

    const kv = getKV(env);
    await ensureDefaultUsers(kv);

    const userKey = `user:${email.toLowerCase().trim()}`;
    const userJson = await kv.get(userKey);

    if (!userJson) {
      return errorResponse('Credenciales inválidas o usuario no encontrado.', 401);
    }

    const user: StoredUser = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;

    if (!user.active) {
      return errorResponse('La cuenta de usuario está desactivada.', 403);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return errorResponse('Credenciales inválidas. Contraseña incorrecta.', 401);
    }

    const secret = getJwtSecret(env);
    const safeUser = toSafeUser(user);
    const token = signToken(safeUser, secret);

    return jsonResponse({
      success: true,
      token,
      user: safeUser,
    });
  } catch (err: any) {
    console.error('EdgeOne Auth Login Error:', err);
    return errorResponse(err.message || 'Error interno del servidor durante la autenticación.', 500);
  }
}

export const onRequestPost = onRequest;
export default onRequest;
