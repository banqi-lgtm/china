"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../db/database");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
        }
        const user = await database_1.db.get(`SELECT u.*, c.name as company_name 
       FROM users u 
       LEFT JOIN companies c ON u.company_id = c.id 
       WHERE u.email = ?`, [email.toLowerCase().trim()]);
        if (!user || !user.active) {
            return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo.' });
        }
        // Check bcrypt password or demo fallback
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch && password !== 'admin123' && password !== 'mateo123' && password !== 'operario123' && password !== 'cliente123') {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            company_id: user.company_id,
            company_name: user.company_name
        };
        const token = jsonwebtoken_1.default.sign(payload, config_1.JWT_SECRET, { expiresIn: '7d' });
        await (0, audit_service_1.recordAuditLog)(req, {
            userId: user.id,
            userEmail: user.email,
            role: user.role,
            action: 'USER_LOGIN',
            affectedTable: 'users',
            recordId: user.id
        });
        return res.json({
            token,
            user: payload
        });
    }
    catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Error en el servidor al iniciar sesión.' });
    }
});
// GET /api/auth/me
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await database_1.db.get(`SELECT u.id, u.name, u.email, u.role, u.company_id, u.phone, c.name as company_name 
       FROM users u 
       LEFT JOIN companies c ON u.company_id = c.id 
       WHERE u.id = ?`, [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        return res.json({ user });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al obtener perfil de usuario.' });
    }
});
// POST /api/auth/switch-role (Convenience for testing / instant demonstration of all 4 roles)
router.post('/switch-role', async (req, res) => {
    try {
        const { targetRole } = req.body;
        let targetEmail = 'admin@inspectionpro.com';
        if (targetRole === 'CONSULTANT')
            targetEmail = 'mateo@inspectionpro.com';
        if (targetRole === 'OPERATOR')
            targetEmail = 'operario@inspectionpro.com';
        if (targetRole === 'CLIENT')
            targetEmail = 'cliente@demologistics.com';
        const user = await database_1.db.get(`SELECT u.*, c.name as company_name 
       FROM users u 
       LEFT JOIN companies c ON u.company_id = c.id 
       WHERE u.email = ?`, [targetEmail]);
        if (!user) {
            return res.status(404).json({ error: 'Usuario demo no encontrado.' });
        }
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            company_id: user.company_id,
            company_name: user.company_name
        };
        const token = jsonwebtoken_1.default.sign(payload, config_1.JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            token,
            user: payload
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error cambiando de rol demo.' });
    }
});
exports.default = router;
