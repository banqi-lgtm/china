"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = (0, express_1.Router)();
// GET /api/audit-logs (Super Admin & Consultant)
router.get('/', auth_1.authenticate, (0, rbac_1.requireRoles)('SUPER_ADMIN', 'CONSULTANT'), async (req, res) => {
    try {
        const { limit = 100, search } = req.query;
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];
        if (search) {
            query += ' AND (action LIKE ? OR user_email LIKE ? OR affected_table LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s);
        }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(Number(limit));
        const logs = await database_1.db.all(query, params);
        return res.json({ logs });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar logs de auditoría.' });
    }
});
exports.default = router;
