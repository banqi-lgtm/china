import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database';
import { authenticate } from '../middleware/auth';
import { checkInspectionCompanyAccess } from '../middleware/rbac';
import { generateInspectionPDF } from '../services/pdfGenerator.service';
import { recordAuditLog } from '../services/audit.service';

const router = Router();

// POST /api/reports/generate/:inspectionId
router.post('/generate/:inspectionId', authenticate, async (req: Request, res: Response) => {
  try {
    const { inspectionId } = req.params;
    const user = req.user!;

    const hasAccess = await checkInspectionCompanyAccess(user, inspectionId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'No tienes permiso para generar informes de esta inspección.' });
    }

    const result = await generateInspectionPDF(inspectionId, user.id);

    await recordAuditLog(req, {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      action: 'REPORT_GENERATED',
      affectedTable: 'reports',
      recordId: inspectionId,
      newValue: { reportCode: result.reportCode, path: result.pdfRelativePath }
    });

    return res.json({
      success: true,
      reportCode: result.reportCode,
      downloadUrl: result.pdfRelativePath
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ error: 'Error al generar el informe PDF.' });
  }
});

// GET /api/reports
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let query = `
      SELECT r.*, 
             i.code as inspection_code, i.status as inspection_status, i.overall_result,
             c.name as company_name,
             u_gen.name as generated_by_name
      FROM reports r
      JOIN inspections i ON r.inspection_id = i.id
      JOIN companies c ON i.company_id = c.id
      LEFT JOIN users u_gen ON r.generated_by = u_gen.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'CLIENT') {
      query += ' AND i.company_id = ?';
      params.push(user.company_id);
    }

    query += ' ORDER BY r.generated_at DESC';

    const reports = await db.all(query, params);
    return res.json({ reports });
  } catch (err: any) {
    console.error('Fetch reports error:', err);
    return res.status(500).json({ error: 'Error al listar informes.' });
  }
});

// GET /api/reports/:id/download
router.get('/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await db.get<any>('SELECT * FROM reports WHERE id = ?', [id]);
    if (!report) {
      return res.status(404).json({ error: 'Informe no encontrado.' });
    }

    const fullPath = path.resolve(__dirname, '../../', report.pdf_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'El archivo PDF no existe físicamente en el servidor.' });
    }

    await recordAuditLog(req, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      role: req.user?.role,
      action: 'REPORT_DOWNLOADED',
      affectedTable: 'reports',
      recordId: id,
      newValue: { reportCode: report.report_code }
    });

    return res.download(fullPath, `${report.report_code}.pdf`);
  } catch (err: any) {
    console.error('Download report error:', err);
    return res.status(500).json({ error: 'Error al descargar informe.' });
  }
});

export default router;
