import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { recordAuditLog } from '../services/audit.service';

const router = Router();

// GET /api/companies
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let query = 'SELECT * FROM companies WHERE 1=1';
    const params: any[] = [];

    if (user.role === 'CLIENT') {
      query += ' AND id = ?';
      params.push(user.company_id);
    }

    query += ' ORDER BY name ASC';
    const companies = await db.all(query, params);
    return res.json({ companies });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al listar empresas.' });
  }
});

// POST /api/companies (Super Admin)
router.post('/', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, tax_id, address, contact_email, contact_phone } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });

    const id = uuidv4();
    await db.run(
      `INSERT INTO companies (id, name, tax_id, address, contact_email, contact_phone, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [id, name, tax_id || null, address || null, contact_email || null, contact_phone || null]
    );

    await recordAuditLog(req, {
      action: 'COMPANY_CREATED',
      affectedTable: 'companies',
      recordId: id,
      newValue: { name, tax_id }
    });

    const created = await db.get('SELECT * FROM companies WHERE id = ?', [id]);
    return res.status(201).json({ company: created });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al crear empresa.' });
  }
});

// PUT /api/companies/:id (Super Admin)
router.put('/:id', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, tax_id, address, contact_email, contact_phone, active } = req.body;

    await db.run(
      `UPDATE companies 
       SET name = COALESCE(?, name),
           tax_id = COALESCE(?, tax_id),
           address = COALESCE(?, address),
           contact_email = COALESCE(?, contact_email),
           contact_phone = COALESCE(?, contact_phone),
           active = COALESCE(?, active)
       WHERE id = ?`,
      [name, tax_id, address, contact_email, contact_phone, active !== undefined ? (active ? 1 : 0) : null, id]
    );

    const updated = await db.get('SELECT * FROM companies WHERE id = ?', [id]);
    return res.json({ company: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al actualizar empresa.' });
  }
});

export default router;
