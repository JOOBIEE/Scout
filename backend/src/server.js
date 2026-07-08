import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import searchRoutes from './routes/search.routes.js';
import outreachRoutes from './routes/outreach.routes.js';
import crmRoutes from './routes/crm.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import authRoutes from './routes/auth.routes.js';
import { requireAuth } from './middleware/auth.js';
import { warmupBrowser, closeBrowser } from './services/browserManager.service.js';

dotenv.config();

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/screenshots', express.static(path.join(process.cwd(), 'public', 'screenshots')));
app.use('/reports', express.static(path.join(process.cwd(), 'public', 'reports')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.use('/api/search', requireAuth, searchRoutes);
app.use('/api/outreach', requireAuth, outreachRoutes);
app.use('/api/crm', requireAuth, crmRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);

warmupBrowser().catch((err) => console.error('Browser warmup failed:', err));

async function shutdown() {
  console.log('Shutting down, closing browser...');
  await closeBrowser();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGUSR2', shutdown);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Scout backend running on http://localhost:${PORT}`);
});