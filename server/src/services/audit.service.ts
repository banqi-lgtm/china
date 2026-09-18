import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { Request } from 'express';

export interface AuditEntry {
  userId?: string;
  userEmail?: string;
  role?: string;
  action: string;
  ipAddress?: string;
  affectedTable?: string;
  recordId?: string;
  oldValue?: any;
  newValue?: any;
}

export async function recordAuditLog(req: Request | null, entry: AuditEntry): Promise<void> {
  try {
    const id = uuidv4();
    const user = (req as any)?.user;
    const userId = entry.userId || user?.id || null;
    const userEmail = entry.userEmail || user?.email || null;
    const role = entry.role || user?.role || null;
    const ipAddress = entry.ipAddress || (req ? req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress : null);

    const oldValueStr = entry.oldValue ? (typeof entry.oldValue === 'string' ? entry.oldValue : JSON.stringify(entry.oldValue)) : null;
    const newValueStr = entry.newValue ? (typeof entry.newValue === 'string' ? entry.newValue : JSON.stringify(entry.newValue)) : null;

    await db.run(
      `INSERT INTO audit_logs (id, user_id, user_email, role, action, ip_address, affected_table, record_id, old_value, new_value, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
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
      ]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
