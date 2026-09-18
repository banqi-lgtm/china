import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';

export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'INFO',
  link: string = ''
) {
  try {
    const id = uuidv4();
    await db.run(
      `INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
      [id, userId, title, message, type, link]
    );
  } catch (err) {
    console.error('Failed to insert notification:', err);
  }
}
