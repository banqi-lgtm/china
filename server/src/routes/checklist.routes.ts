import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { recordAuditLog } from '../services/audit.service';

const router = Router();

// GET /api/checklists/template
router.get('/template', authenticate, async (req: Request, res: Response) => {
  try {
    const categories = await db.all<any>('SELECT * FROM checklist_categories ORDER BY order_index ASC');
    const questions = await db.all<any>('SELECT * FROM checklist_questions ORDER BY order_index ASC');

    const structured = categories.map((cat) => ({
      ...cat,
      questions: questions.filter((q) => q.category_id === cat.id)
    }));

    return res.json({ template: structured });
  } catch (err: any) {
    console.error('Checklist template error:', err);
    return res.status(500).json({ error: 'Error al cargar plantilla de checklist.' });
  }
});

// POST /api/checklists/categories (Super Admin)
router.post('/categories', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, order_index = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio.' });

    const id = uuidv4();
    await db.run('INSERT INTO checklist_categories (id, name, order_index) VALUES (?, ?, ?)', [id, name, order_index]);

    await recordAuditLog(req, {
      action: 'CHECKLIST_CATEGORY_CREATED',
      affectedTable: 'checklist_categories',
      recordId: id,
      newValue: { name }
    });

    return res.status(201).json({ id, name, order_index });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al crear categoría.' });
  }
});

// POST /api/checklists/questions (Super Admin)
router.post('/questions', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { category_id, question_text, requires_evidence_on_fail = 1, order_index = 0 } = req.body;
    if (!category_id || !question_text) {
      return res.status(400).json({ error: 'Categoría y texto de la pregunta son obligatorios.' });
    }

    const id = uuidv4();
    await db.run(
      `INSERT INTO checklist_questions (id, category_id, question_text, requires_evidence_on_fail, order_index)
       VALUES (?, ?, ?, ?, ?)`,
      [id, category_id, question_text, requires_evidence_on_fail ? 1 : 0, order_index]
    );

    await recordAuditLog(req, {
      action: 'CHECKLIST_QUESTION_CREATED',
      affectedTable: 'checklist_questions',
      recordId: id,
      newValue: { question_text, category_id }
    });

    return res.status(201).json({ id, category_id, question_text });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al crear pregunta de checklist.' });
  }
});

// DELETE /api/checklists/questions/:id (Super Admin)
router.delete('/questions/:id', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM checklist_questions WHERE id = ?', [id]);
    await recordAuditLog(req, {
      action: 'CHECKLIST_QUESTION_DELETED',
      affectedTable: 'checklist_questions',
      recordId: id
    });
    return res.json({ success: true, message: 'Pregunta eliminada.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al eliminar pregunta.' });
  }
});

export default router;
