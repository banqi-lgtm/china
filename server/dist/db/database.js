"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.sqlite = void 0;
exports.initDatabase = initDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
// Ensure uploads and database directories exist
if (!fs_1.default.existsSync(config_1.UPLOAD_DIR)) {
    fs_1.default.mkdirSync(config_1.UPLOAD_DIR, { recursive: true });
}
const dbDir = path_1.default.dirname(config_1.DB_PATH);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
exports.sqlite = new sqlite3_1.default.Database(config_1.DB_PATH, (err) => {
    if (err) {
        console.error('Failed to open SQLite database:', err.message);
    }
    else {
        console.log('Connected to SQLite database at:', config_1.DB_PATH);
    }
});
// Enable foreign keys
exports.sqlite.run('PRAGMA foreign_keys = ON');
exports.db = {
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            exports.sqlite.run(sql, params, function (err) {
                if (err)
                    return reject(err);
                resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    },
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            exports.sqlite.get(sql, params, (err, row) => {
                if (err)
                    return reject(err);
                resolve(row);
            });
        });
    },
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            exports.sqlite.all(sql, params, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    },
    exec(sql) {
        return new Promise((resolve, reject) => {
            exports.sqlite.exec(sql, (err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
};
async function initDatabase() {
    const schemaPath = path_1.default.resolve(__dirname, 'schema.sql');
    if (fs_1.default.existsSync(schemaPath)) {
        const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
        await exports.db.exec(schemaSql);
        console.log('Database tables verified and initialized.');
    }
}
