import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PORT, UPLOAD_DIR } from './config';
import { initDatabase } from './db/database';
import { seedDatabase } from './db/seed';
import { createFullShowcaseExample } from './db/createFullExample';

import authRoutes from './routes/auth.routes';
import inspectionRoutes from './routes/inspection.routes';
import evidenceRoutes from './routes/evidence.routes';
import reportRoutes from './routes/report.routes';
import checklistRoutes from './routes/checklist.routes';
import companyRoutes from './routes/company.routes';
import userRoutes from './routes/user.routes';
import auditRoutes from './routes/audit.routes';
import statsRoutes from './routes/stats.routes';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving (photos, videos, documents, signatures, reports)
app.use('/uploads', express.static(UPLOAD_DIR));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/evidences', evidenceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'InspectionPro SaaS API', timestamp: new Date().toISOString() });
});

// Serve frontend build if present
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function startServer() {
  try {
    await initDatabase();
    await seedDatabase();
    await createFullShowcaseExample();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 InspectionPro Enterprise SaaS running at http://localhost:${PORT}`);
      console.log(`📡 API Endpoints available at http://localhost:${PORT}/api`);
      console.log(`📁 Uploads served from http://localhost:${PORT}/uploads`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

startServer();
