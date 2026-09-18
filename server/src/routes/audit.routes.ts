import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';

const router = Router();

// GET /api/audit-logs (Super Admin & Consultant)
router.get('/', authenticate, requireRoles('SUPER_ADMIN', 'CONSULTANT'), async (req: Request, res: Response) => {
  try {
    const { limit = 100, search } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (action LIKE ? OR user_email LIKE ? OR affected_table LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));

    const logs = await db.all(query, params);
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al consultar logs de auditoría.' });
  }
});

export default router;
