"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
async function sendNotification(userId, title, message, type = 'INFO', link = '') {
    try {
        const id = (0, uuid_1.v4)();
        await database_1.db.run(`INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`, [id, userId, title, message, type, link]);
    }
    catch (err) {
        console.error('Failed to insert notification:', err);
    }
}
