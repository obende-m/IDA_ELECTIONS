import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import electionRoutes from './modules/elections/election.routes';
import candidateRoutes from './modules/candidates/candidate.routes';
import positionRoutes from './modules/positions/position.routes';
import voterRoutes from './modules/voters/voter.routes';
import votingRoutes from './modules/voting/voting.routes';
import resultsRoutes from './modules/results/results.routes';
import reportRoutes from './modules/reports/report.routes';
import auditRoutes from './modules/audit/audit.routes';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet());

// CORS setup matching Vercel/Vite client host
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));

// Never let a browser/proxy cache API responses: ballots, results and exports are per-request data.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(cookieParser());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

// Readiness: also proves the database connection works (use for external uptime monitoring, not Render's health check).
app.get('/api/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'READY', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'DATABASE_UNAVAILABLE', timestamp: new Date().toISOString() });
  }
});

// Register Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

// Error Handling Middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[Server]: Security protocol listening on port ${port}`);
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

export default app;
