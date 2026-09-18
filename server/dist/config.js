"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_PATH = exports.UPLOAD_DIR = exports.JWT_SECRET = exports.PORT = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
exports.JWT_SECRET = process.env.JWT_SECRET || 'inspection-saas-enterprise-secret-key-2026';
exports.UPLOAD_DIR = path_1.default.resolve(__dirname, '../../uploads');
exports.DB_PATH = path_1.default.resolve(__dirname, '../database.sqlite');
