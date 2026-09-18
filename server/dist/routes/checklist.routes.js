"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
// GET /api/checklists/template
router.get('/template', auth_1.authenticate, async (req, res) => {
    try {
        const categories = await database_1.db.all('SELECT * FROM checklist_categories ORDER BY order_index ASC');
        const questions = await database_1.db.all('SELECT * FROM checklist_questions ORDER BY order_index ASC');
        const structured = categories.map((cat) => ({
            ...cat,
            questions: questions.filter((q) => q.category_id === cat.id)
        }));
        return res.json({ template: structured });
    }
    catch (err) {
        console.error('Checklist template error:', err);
        return res.status(500).json({ error: 'Error al cargar plantilla de checklist.' });
    }
});
// POST /api/checklists/categories (Super Admin)
router.post('/categories', auth_1.authenticate, (0, rbac_1.requireRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { name, order_index = 0 } = req.body;
        if (!name)
            return res.status(400).json({ error: 'El nombre es obligatorio.' });
        const id = (0, uuid_1.v4)();
        await database_1.db.run('INSERT INTO checklist_categories (id, name, order_index) VALUES (?, ?, ?)', [id, name, order_index]);
        await (0, audit_service_1.recordAuditLog)(req, {
            action: 'CHECKLIST_CATEGORY_CREATED',
            affectedTable: 'checklist_categories',
            recordId: id,
            newValue: { name }
        });
        return res.status(201).json({ id, name, order_index });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al crear categoría.' });
    }
});
// POST /api/checklists/questions (Super Admin)
router.post('/questions', auth_1.authenticate, (0, rbac_1.requireRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { category_id, question_text, requires_evidence_on_fail = 1, order_index = 0 } = req.body;
        if (!category_id || !question_text) {
            return res.status(400).json({ error: 'Categoría y texto de la pregunta son obligatorios.' });
        }
        const id = (0, uuid_1.v4)();
        await database_1.db.run(`INSERT INTO checklist_questions (id, category_id, question_text, requires_evidence_on_fail, order_index)
       VALUES (?, ?, ?, ?, ?)`, [id, category_id, question_text, requires_evidence_on_fail ? 1 : 0, order_index]);
        await (0, audit_service_1.recordAuditLog)(req, {
            action: 'CHECKLIST_QUESTION_CREATED',
            affectedTable: 'checklist_questions',
            recordId: id,
            newValue: { question_text, category_id }
        });
        return res.status(201).json({ id, category_id, question_text });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al crear pregunta de checklist.' });
    }
});
// DELETE /api/checklists/questions/:id (Super Admin)
router.delete('/questions/:id', auth_1.authenticate, (0, rbac_1.requireRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.db.run('DELETE FROM checklist_questions WHERE id = ?', [id]);
        await (0, audit_service_1.recordAuditLog)(req, {
            action: 'CHECKLIST_QUESTION_DELETED',
            affectedTable: 'checklist_questions',
            recordId: id
        });
        return res.json({ success: true, message: 'Pregunta eliminada.' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al eliminar pregunta.' });
    }
});
exports.default = router;
