"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAuditLog = recordAuditLog;
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
async function recordAuditLog(req, entry) {
    try {
        const id = (0, uuid_1.v4)();
        const user = req?.user;
        const userId = entry.userId || user?.id || null;
        const userEmail = entry.userEmail || user?.email || null;
        const role = entry.role || user?.role || null;
        const ipAddress = entry.ipAddress || (req ? req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress : null);
        const oldValueStr = entry.oldValue ? (typeof entry.oldValue === 'string' ? entry.oldValue : JSON.stringify(entry.oldValue)) : null;
        const newValueStr = entry.newValue ? (typeof entry.newValue === 'string' ? entry.newValue : JSON.stringify(entry.newValue)) : null;
        await database_1.db.run(`INSERT INTO audit_logs (id, user_id, user_email, role, action, ip_address, affected_table, record_id, old_value, new_value, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, [
            id,
            userId,
            userEmail,
            role,
            entry.action,
            ipAddress ? String(ipAddress) : null,
            entry.affectedTable || null,
            entry.recordId || null,
            oldValueStr,
            newValueStr
        ]);
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
    }
}
