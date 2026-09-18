"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
// GET /api/companies
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        let query = 'SELECT * FROM companies WHERE 1=1';
        const params = [];
        if (user.role === 'CLIENT') {
            query += ' AND id = ?';
            params.push(user.company_id);
        }
        query += ' ORDER BY name ASC';
        const companies = await database_1.db.all(query, params);
        return res.json({ companies });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al listar empresas.' });
    }
});
// POST /api/companies (Super Admin)
router.post('/', auth_1.authenticate, (0, rbac_1.requireRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { name, tax_id, address, contact_email, contact_phone } = req.body;
        if (!name)
            return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });
        const id = (0, uuid_1.v4)();
        await database_1.db.run(`INSERT INTO companies (id, name, tax_id, address, contact_email, contact_phone, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`, [id, name, tax_id || null, address || null, contact_email || null, contact_phone || null]);
        await (0, audit_service_1.recordAuditLog)(req, {
            action: 'COMPANY_CREATED',
            affectedTable: 'companies',
            recordId: id,
            newValue: { name, tax_id }
        });
        const created = await database_1.db.get('SELECT * FROM companies WHERE id = ?', [id]);
        return res.status(201).json({ company: created });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al crear empresa.' });
    }
});
// PUT /api/companies/:id (Super Admin)
router.put('/:id', auth_1.authenticate, (0, rbac_1.requireRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, tax_id, address, contact_email, contact_phone, active } = req.body;
        await database_1.db.run(`UPDATE companies 
       SET name = COALESCE(?, name),
           tax_id = COALESCE(?, tax_id),
           address = COALESCE(?, address),
           contact_email = COALESCE(?, contact_email),
           contact_phone = COALESCE(?, contact_phone),
           active = COALESCE(?, active)
       WHERE id = ?`, [name, tax_id, address, contact_email, contact_phone, active !== undefined ? (active ? 1 : 0) : null, id]);
        const updated = await database_1.db.get('SELECT * FROM companies WHERE id = ?', [id]);
        return res.json({ company: updated });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al actualizar empresa.' });
    }
});
exports.default = router;
