"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const config_1 = require("../config");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
// Configure dynamic multer storage
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const inspectionId = req.params.inspectionId || 'temp';
            const inspection = await database_1.db.get('SELECT company_id FROM inspections WHERE id = ?', [inspectionId]);
            const companyId = inspection?.company_id || 'general';
            const isVideo = file.mimetype.startsWith('video/');
            const subFolder = isVideo ? 'videos' : (file.mimetype.startsWith('image/') ? 'photos' : 'documents');
            const targetDir = path_1.default.join(config_1.UPLOAD_DIR, 'companies', companyId, 'inspections', inspectionId, subFolder);
            if (!fs_1.default.existsSync(targetDir)) {
                fs_1.default.mkdirSync(targetDir, { recursive: true });
            }
            cb(null, targetDir);
        }
        catch (err) {
            cb(err, config_1.UPLOAD_DIR);
        }
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const cleanName = `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}${ext}`;
        cb(null, cleanName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});
// POST /api/evidences/inspection/:inspectionId
router.post('/inspection/:inspectionId', auth_1.authenticate, upload.single('file'), async (req, res) => {
    try {
        const { inspectionId } = req.params;
        const user = req.user;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo de evidencia.' });
        }
        const { section = 'CONTENEDOR', description = '', is_primary = '0', rotation = '0' } = req.body;
        const mime = file.mimetype;
        let type = 'PHOTO';
        if (mime.startsWith('video/'))
            type = 'VIDEO';
        else if (!mime.startsWith('image/'))
            type = 'DOCUMENT';
        const id = (0, uuid_1.v4)();
        const relativePath = path_1.default.relative(path_1.default.resolve(__dirname, '../../'), file.path).replace(/\\/g, '/');
        // If marked primary, reset other primary flags in the same section
        if (is_primary === '1' || is_primary === 'true') {
            await database_1.db.run('UPDATE evidences SET is_primary = 0 WHERE inspection_id = ? AND section = ?', [inspectionId, section]);
        }
        await database_1.db.run(`INSERT INTO evidences (
        id, inspection_id, section, type, file_path, file_name, file_size, 
        mime_type, description, is_primary, rotation, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, [
            id,
            inspectionId,
            section,
            type,
            relativePath,
            file.originalname,
            file.size,
            mime,
            description,
            is_primary === '1' || is_primary === 'true' ? 1 : 0,
            parseInt(rotation, 10) || 0,
            user.id
        ]);
        await (0, audit_service_1.recordAuditLog)(req, {
            userId: user.id,
            userEmail: user.email,
            role: user.role,
            action: 'EVIDENCE_UPLOADED',
            affectedTable: 'evidences',
            recordId: id,
            newValue: { section, fileName: file.originalname, type }
        });
        const created = await database_1.db.get('SELECT * FROM evidences WHERE id = ?', [id]);
        return res.status(201).json({ success: true, evidence: created });
    }
    catch (err) {
        console.error('Evidence upload error:', err);
        return res.status(500).json({ error: 'Error al procesar y almacenar evidencia.' });
    }
});
// PUT /api/evidences/:id (Update metadata, rotation, primary flag)
router.put('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { description, rotation, is_primary, section } = req.body;
        const evidence = await database_1.db.get('SELECT * FROM evidences WHERE id = ?', [id]);
        if (!evidence) {
            return res.status(404).json({ error: 'Evidencia no encontrada.' });
        }
        if (is_primary) {
            await database_1.db.run('UPDATE evidences SET is_primary = 0 WHERE inspection_id = ? AND section = ?', [evidence.inspection_id, section || evidence.section]);
        }
        await database_1.db.run(`UPDATE evidences 
       SET description = COALESCE(?, description),
           rotation = COALESCE(?, rotation),
           is_primary = COALESCE(?, is_primary),
           section = COALESCE(?, section)
       WHERE id = ?`, [description, rotation !== undefined ? Number(rotation) : null, is_primary !== undefined ? (is_primary ? 1 : 0) : null, section, id]);
        const updated = await database_1.db.get('SELECT * FROM evidences WHERE id = ?', [id]);
        return res.json({ success: true, evidence: updated });
    }
    catch (err) {
        console.error('Evidence update error:', err);
        return res.status(500).json({ error: 'Error al actualizar evidencia.' });
    }
});
// DELETE /api/evidences/:id
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const evidence = await database_1.db.get('SELECT * FROM evidences WHERE id = ?', [id]);
        if (!evidence) {
            return res.status(404).json({ error: 'Evidencia no encontrada.' });
        }
        const inspection = await database_1.db.get('SELECT status FROM inspections WHERE id = ?', [evidence.inspection_id]);
        if (inspection && (inspection.status === 'FINALIZADA' || inspection.status === 'APROBADA') && user.role !== 'SUPER_ADMIN') {
            return res.status(400).json({ error: 'No se pueden eliminar evidencias de una inspección cerrada o aprobada.' });
        }
        // Attempt to unlink file
        try {
            const fullPath = path_1.default.resolve(__dirname, '../../', evidence.file_path);
            if (fs_1.default.existsSync(fullPath)) {
                fs_1.default.unlinkSync(fullPath);
            }
        }
        catch (e) {
            // Ignore file unlink if already moved
        }
        await database_1.db.run('DELETE FROM evidences WHERE id = ?', [id]);
        await (0, audit_service_1.recordAuditLog)(req, {
            userId: user.id,
            userEmail: user.email,
            role: user.role,
            action: 'EVIDENCE_DELETED',
            affectedTable: 'evidences',
            recordId: id,
            oldValue: { fileName: evidence.file_name, section: evidence.section }
        });
        return res.json({ success: true, message: 'Evidencia eliminada.' });
    }
    catch (err) {
        console.error('Evidence delete error:', err);
        return res.status(500).json({ error: 'Error al eliminar evidencia.' });
    }
});
exports.default = router;
