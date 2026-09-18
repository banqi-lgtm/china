import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
export const JWT_SECRET = process.env.JWT_SECRET || 'inspection-saas-enterprise-secret-key-2026';
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
export const DB_PATH = path.resolve(__dirname, '../database.sqlite');
