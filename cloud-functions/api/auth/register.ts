import {
  getKV,
  getJwtSecret,
  ensureDefaultUsers,
  hashPassword,
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
    const { email, password, name, role = 'CLIENT', company_name, phone } = body;

    if (!email || !password || !name) {
      return errorResponse('El nombre, correo electrónico y contraseña son obligatorios.', 400);
    }

    if (password.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const kv = getKV(env);
    await ensureDefaultUsers(kv);

    const userKey = `user:${normalizedEmail}`;
    const existing = await kv.get(userKey);

    if (existing) {
      return errorResponse('El correo electrónico ya se encuentra registrado en la plataforma.', 409);
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const compId = `comp-${Date.now()}`;

    const newUser: StoredUser = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      role: role || 'CLIENT',
      company_id: compId,
      company_name: (company_name || 'Empresa Registrada').trim(),
      phone: phone || '',
      active: 1,
      created_at: new Date().toISOString(),
    };

    // Persist new user in EdgeOne KV Store
    await kv.put(userKey, JSON.stringify(newUser));

    const secret = getJwtSecret(env);
    const safeUser = toSafeUser(newUser);
    const token = signToken(safeUser, secret);

    return jsonResponse(
      {
        success: true,
        message: 'Cuenta de usuario creada y almacenada exitosamente en el servidor.',
        token,
        user: safeUser,
      },
      201
    );
  } catch (err: any) {
    console.error('EdgeOne Auth Register Error:', err);
    return errorResponse(err.message || 'Error interno del servidor durante el registro.', 500);
  }
}

export const onRequestPost = onRequest;
export default onRequest;
