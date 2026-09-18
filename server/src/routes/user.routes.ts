import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { recordAuditLog } from '../services/audit.service';

const router = Router();

// GET /api/users
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { role } = req.query;

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.company_id, u.phone, u.active, u.created_at,
             c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'CLIENT') {
      query += ' AND u.company_id = ?';
      params.push(user.company_id);
    }

    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }

    query += ' ORDER BY u.name ASC';
    const users = await db.all(query, params);
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al listar usuarios.' });
  }
});

// POST /api/users (Super Admin)
router.post('/', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, company_id, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos.' });
    }

    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico.' });
    }

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);

    await db.run(
      `INSERT INTO users (id, company_id, name, email, password_hash, role, phone, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [id, company_id || null, name, email.toLowerCase().trim(), hash, role, phone || null]
    );

    await recordAuditLog(req, {
      action: 'USER_CREATED',
      affectedTable: 'users',
      recordId: id,
      newValue: { email, role, company_id }
    });

    const created = await db.get(
      'SELECT id, name, email, role, company_id, phone, active, created_at FROM users WHERE id = ?',
      [id]
    );
    return res.status(201).json({ user: created });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al crear usuario.' });
  }
});

export default router;
