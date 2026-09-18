"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/stats/dashboard
router.get('/dashboard', auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        let filter = '';
        const params = [];
        if (user.role === 'CLIENT') {
            filter = 'WHERE company_id = ?';
            params.push(user.company_id);
        }
        else if (user.role === 'OPERATOR') {
            filter = 'WHERE operator_id = ?';
            params.push(user.id);
        }
        // Totals & Status Breakdown
        const counts = await database_1.db.get(`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDIENTE_REVISION' THEN 1 ELSE 0 END) as pending_review,
        SUM(CASE WHEN status = 'EN_PROCESO' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'EN_CORRECCION' THEN 1 ELSE 0 END) as in_correction,
        SUM(CASE WHEN status = 'APROBADA' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'RECHAZADA' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'FINALIZADA' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'ASIGNADA' THEN 1 ELSE 0 END) as assigned
       FROM inspections ${filter}`, params);
        // Inspections by Company (for Admin & Consultant)
        let byCompany = [];
        if (user.role === 'SUPER_ADMIN' || user.role === 'CONSULTANT') {
            byCompany = await database_1.db.all(`SELECT c.name, COUNT(i.id) as count 
         FROM companies c 
         JOIN inspections i ON i.company_id = c.id 
         GROUP BY c.id, c.name 
         ORDER BY count DESC LIMIT 5`);
        }
        // Recent Activity Feed
        const recentActivity = await database_1.db.all(`SELECT h.comment, h.created_at, u.name as user_name, u.role as user_role, i.code as inspection_code
       FROM inspection_status_history h
       JOIN inspections i ON h.inspection_id = i.id
       LEFT JOIN users u ON h.changed_by = u.id
       ${user.role === 'CLIENT' ? 'WHERE i.company_id = ?' : ''}
       ORDER BY h.created_at DESC LIMIT 8`, user.role === 'CLIENT' ? [user.company_id] : []);
        return res.json({
            counts: {
                total: counts?.total || 0,
                pending_review: counts?.pending_review || 0,
                in_progress: counts?.in_progress || 0,
                in_correction: counts?.in_correction || 0,
                approved: counts?.approved || 0,
                rejected: counts?.rejected || 0,
                completed: counts?.completed || 0,
                assigned: counts?.assigned || 0
            },
            byCompany,
            recentActivity
        });
    }
    catch (err) {
        console.error('Stats error:', err);
        return res.status(500).json({ error: 'Error al calcular estadísticas.' });
    }
});
exports.default = router;
