import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Ladda environment variabler
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Säkerhet middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:3000", "http://localhost:3001"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://192.168.50.202:3000'] // Din frontend URL
    : true, // Tillåt alla origins för utveckling
  credentials: true
}));

// Rate limiting - begränsa antal requests per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 100, // Max 100 requests per IP per 15 min
  message: 'För många förfrågningar från denna IP, försök igen senare.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statiska filer (för uppladdade bilder)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Grundläggande health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Vilches Entreprenad AB API är igång!',
    timestamp: new Date().toISOString()
  });
});

// Importera routes
import emailRoutes from './routes/emailRoutes';
import authRoutes from './routes/authRoutes';
import contractorRoutes from './routes/contractorRoutes';
import projectRoutes from './routes/projectRoutes';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/projects', projectRoutes);

app.get('/api', (req, res) => {
  res.json({
    message: 'Välkommen till Vilches Entreprenad AB API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: {
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        me: '/api/auth/me'
      },
      email: {
        approvedSenders: '/api/email/approved-senders',
        startMonitoring: '/api/email/start-monitoring',
        stopMonitoring: '/api/email/stop-monitoring',
        status: '/api/email/monitoring-status',
        testConnection: '/api/email/test-connection'
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
  console.log(`🚀 Vilches Entreprenad AB API körs på port ${PORT}`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
