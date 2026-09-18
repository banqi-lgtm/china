"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
// GET /api/users
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { role } = req.query;
        let query = `
      SELECT u.id, u.name, u.email, u.role, u.company_id, u.phone, u.active, u.created_at,
             c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE 1=1
    `;
        const params = [];
        if (user.role === 'CLIENT') {
            query += ' AND u.company_id = ?';
            params.push(user.company_id);
        }
        if (role) {
            query += ' AND u.role = ?';
            params.push(role);
        }
        query += ' ORDER BY u.name ASC';
        const users = await database_1.db.all(query, params);
        return res.json({ users });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al listar usuarios.' });
    }
});
// POST /api/users (Super Admin)
router.post('/', auth_1.authenticate, (0, rbac_1.requireRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { name, email, password, role, company_id, phone } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos.' });
        }
        const existing = await database_1.db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (existing) {
            return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico.' });
        }
        const id = (0, uuid_1.v4)();
        const hash = await bcryptjs_1.default.hash(password, 10);
        await database_1.db.run(`INSERT INTO users (id, company_id, name, email, password_hash, role, phone, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`, [id, company_id || null, name, email.toLowerCase().trim(), hash, role, phone || null]);
        await (0, audit_service_1.recordAuditLog)(req, {
            action: 'USER_CREATED',
            affectedTable: 'users',
            recordId: id,
            newValue: { email, role, company_id }
        });
        const created = await database_1.db.get('SELECT id, name, email, role, company_id, phone, active, created_at FROM users WHERE id = ?', [id]);
        return res.status(201).json({ user: created });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al crear usuario.' });
    }
});
exports.default = router;
