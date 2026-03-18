import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import {
  generalLimiter,
  securityHeaders,
  sanitizeRequest
} from './middleware/security';
import { prisma } from './lib/prisma';

// Ladda environment variabler
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy för korrekt IP-hantering
app.set('trust proxy', 1);

// Säkerhetsmiddleware
app.use(securityHeaders);
app.use(sanitizeRequest);
app.use(cookieParser());

// CORS — configurable via CORS_ORIGINS env var
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-api-key'],
  exposedHeaders: ['X-Total-Count']
}));

// Rate limiting
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statiska filer (för uppladdade bilder) — kräver autentisering
app.use('/uploads', (req, res, next) => {
  // Allow if valid auth cookie or Authorization header exists
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}, express.static(path.join(__dirname, '../uploads')));

// Grundläggande health check route
app.get('/health', async (req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  // DB-check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'OK';
  } catch {
    checks.database = 'FAIL';
    healthy = false;
  }

  // Minne
  const mem = process.memoryUsage();
  checks.memoryMB = Math.round(mem.rss / 1024 / 1024).toString();

  // Uptime
  checks.uptimeHours = (process.uptime() / 3600).toFixed(1);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Importera routes
import setupRoutes from './setup/setupRoutes';
import appSettingsRoutes from './routes/appSettingsRoutes';
import authRoutes from './routes/authRoutes';
import contractorRoutes from './routes/contractorRoutes';
import projectRoutes from './routes/projectRoutes';
import geocodingRoutes from './routes/geocodingRoutes';
import webhookRoutes from './routes/webhookRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import quotesRoutes from './routes/quotesRoutes';
import automationsRoutes from './routes/automationsRoutes';
import archiveRoutes from './routes/archive';
import activityLogRoutes from './routes/activityLogRoutes';
import employeeRoutes from './routes/employeeRoutes';
import timeReportRoutes from './routes/timeReportRoutes';
import accountantSettingsRoutes from './routes/accountantSettingsRoutes';
import fortnoxSettingsRoutes from './routes/fortnoxSettingsRoutes';
import calendarRoutes from './routes/calendarRoutes';
import salaryRoutes from './routes/salaryRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import customerRoutes from './routes/customerRoutes';
import standaloneInvoiceRoutes from './routes/standaloneInvoiceRoutes';

// Setup routes (no auth required — used during first-time setup)
app.use('/api/setup', setupRoutes);

// App settings (public endpoint for branding/feature flags)
app.use('/api/app-settings', appSettingsRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/automations', automationsRoutes);
app.use('/api', archiveRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/time-reports', timeReportRoutes);
app.use('/api/settings/accountant', accountantSettingsRoutes);
app.use('/api/settings/fortnox', fortnoxSettingsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/standalone-invoices', standaloneInvoiceRoutes);

app.get('/api', (req, res) => {
  res.json({
    message: 'VilchesApp API — Project Management System',
    version: '1.0.0',
    poweredBy: 'VilchesApp (https://github.com/NeoNemesis/vilchesapp)',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: {
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        me: '/api/auth/me'
      },
      contractors: {
        list: '/api/contractors',
        create: '/api/contractors',
        update: '/api/contractors/:id',
        delete: '/api/contractors/:id',
        stats: '/api/contractors/stats'
      },
      projects: {
        list: '/api/projects',
        create: '/api/projects',
        update: '/api/projects/:id',
        delete: '/api/projects/:id',
        assign: '/api/projects/:id/assign',
        stats: '/api/projects/stats'
      },
      quotes: {
        estimate: '/api/quotes/estimate',
        list: '/api/quotes',
        create: '/api/quotes',
        update: '/api/quotes/:id',
        delete: '/api/quotes/:id',
        send: '/api/quotes/:id/send',
        pdf: '/api/quotes/:id/pdf',
        createProject: '/api/quotes/:id/create-project',
        similar: '/api/quotes/similar',
        materials: '/api/quotes/materials',
        templates: '/api/quotes/templates'
      },
      analytics: {
        summary: '/api/analytics/summary?days=7',
        full: '/api/analytics/full?days=30',
        trafficSources: '/api/analytics/traffic-sources?days=30',
        geographic: '/api/analytics/geographic?days=30',
        trends: '/api/analytics/trends?days=30'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint hittades inte',
    message: `${req.method} ${req.originalUrl} finns inte på denna server`
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', error);
  
  res.status(error.status || 500).json({
    error: 'Serverfel',
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Något gick fel på servern',
    timestamp: new Date().toISOString()
  });
});

// Starta servern
app.listen(PORT, () => {
  console.log(`🚀 VilchesApp API running on port ${PORT}`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Powered by VilchesApp — https://github.com/NeoNemesis/vilchesapp`);
});

export default app;
