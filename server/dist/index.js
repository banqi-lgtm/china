"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const database_1 = require("./db/database");
const seed_1 = require("./db/seed");
const createFullExample_1 = require("./db/createFullExample");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const inspection_routes_1 = __importDefault(require("./routes/inspection.routes"));
const evidence_routes_1 = __importDefault(require("./routes/evidence.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const checklist_routes_1 = __importDefault(require("./routes/checklist.routes"));
const company_routes_1 = __importDefault(require("./routes/company.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Static uploads serving (photos, videos, documents, signatures, reports)
app.use('/uploads', express_1.default.static(config_1.UPLOAD_DIR));
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/inspections', inspection_routes_1.default);
app.use('/api/evidences', evidence_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/checklists', checklist_routes_1.default);
app.use('/api/companies', company_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/audit-logs', audit_routes_1.default);
app.use('/api/stats', stats_routes_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'InspectionPro SaaS API', timestamp: new Date().toISOString() });
});
// Serve frontend build if present
const rootDist = path_1.default.resolve(__dirname, '../../dist');
const clientDist = path_1.default.resolve(__dirname, '../../client/dist');
const distPath = fs_1.default.existsSync(rootDist) ? rootDist : (fs_1.default.existsSync(clientDist) ? clientDist : null);
if (distPath) {
    app.use(express_1.default.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path_1.default.join(distPath, 'index.html'));
    });
}
async function startServer() {
    try {
        await (0, database_1.initDatabase)();
        await (0, seed_1.seedDatabase)();
        await (0, createFullExample_1.createFullShowcaseExample)();
        app.listen(config_1.PORT, () => {
            console.log(`=======================================================`);
            console.log(`🚀 InspectionPro Enterprise SaaS running at http://localhost:${config_1.PORT}`);
            console.log(`📡 API Endpoints available at http://localhost:${config_1.PORT}/api`);
            console.log(`📁 Uploads served from http://localhost:${config_1.PORT}/uploads`);
            console.log(`=======================================================`);
        });
    }
    catch (error) {
        console.error('Fatal error starting server:', error);
        process.exit(1);
    }
}
startServer();
