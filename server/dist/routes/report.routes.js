"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const pdfGenerator_service_1 = require("../services/pdfGenerator.service");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
// POST /api/reports/generate/:inspectionId
router.post('/generate/:inspectionId', auth_1.authenticate, async (req, res) => {
    try {
        const { inspectionId } = req.params;
        const user = req.user;
        const hasAccess = await (0, rbac_1.checkInspectionCompanyAccess)(user, inspectionId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permiso para generar informes de esta inspección.' });
        }
        const result = await (0, pdfGenerator_service_1.generateInspectionPDF)(inspectionId, user.id);
        await (0, audit_service_1.recordAuditLog)(req, {
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
    }
    catch (err) {
        console.error('PDF generation error:', err);
        return res.status(500).json({ error: 'Error al generar el informe PDF.' });
    }
});
// GET /api/reports
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
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
        const params = [];
        if (user.role === 'CLIENT') {
            query += ' AND i.company_id = ?';
            params.push(user.company_id);
        }
        query += ' ORDER BY r.generated_at DESC';
        const reports = await database_1.db.all(query, params);
        return res.json({ reports });
    }
    catch (err) {
        console.error('Fetch reports error:', err);
        return res.status(500).json({ error: 'Error al listar informes.' });
    }
});
// GET /api/reports/:id/download
router.get('/:id/download', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const report = await database_1.db.get('SELECT * FROM reports WHERE id = ?', [id]);
        if (!report) {
            return res.status(404).json({ error: 'Informe no encontrado.' });
        }
        const fullPath = path_1.default.resolve(__dirname, '../../', report.pdf_path);
        if (!fs_1.default.existsSync(fullPath)) {
            return res.status(404).json({ error: 'El archivo PDF no existe físicamente en el servidor.' });
        }
        await (0, audit_service_1.recordAuditLog)(req, {
            userId: req.user?.id,
            userEmail: req.user?.email,
            role: req.user?.role,
            action: 'REPORT_DOWNLOADED',
            affectedTable: 'reports',
            recordId: id,
            newValue: { reportCode: report.report_code }
        });
        return res.download(fullPath, `${report.report_code}.pdf`);
    }
    catch (err) {
        console.error('Download report error:', err);
        return res.status(500).json({ error: 'Error al descargar informe.' });
    }
});
exports.default = router;
