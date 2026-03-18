import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { prisma } from '../lib/prisma';

// Enhanced rate limiting
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 500, // Max 500 requests per IP per 15 min (SPA gör många API-anrop)
  message: {
    success: false,
    message: 'För många förfrågningar från denna IP. Försök igen senare.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 15, // Max 15 inloggningsförsök per IP per 15 min (flera användare kan dela IP)
  message: {
    success: false,
    message: 'För många inloggningsförsök. Försök igen om 15 minuter.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Räkna bara misslyckade försök
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minut
  max: 10, // Max 10 requests per minut för känsliga endpoints
  message: {
    success: false,
    message: 'För många förfrågningar till känslig endpoint.'
  }
});

// Enhanced helmet configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.BASE_URL || "http://localhost:3001"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable för utveckling
  hsts: {
    maxAge: 31536000, // 1 år
    includeSubDomains: true,
    preload: true
  },
  // Förstärk säkerhetsheaders enligt rapporten
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  noSniff: true, // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Referrer-Policy
  xssFilter: true, // X-XSS-Protection: 1; mode=block
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // För API-åtkomst
});

// IP whitelist för admin-funktioner
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];

export function adminIPWhitelist(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    return next(); // Skip i utvecklingsmiljö
  }

  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  
  if (ADMIN_ALLOWED_IPS.length > 0 && !ADMIN_ALLOWED_IPS.includes(clientIP)) {
    return res.status(403).json({
      success: false,
      message: 'Åtkomst nekad från denna IP-adress'
    });
  }
  
  next();
}

// Brute force protection
interface LoginAttempt {
  ip: string;
  email: string;
  attempts: number;
  lastAttempt: Date;
  blocked: boolean;
  blockExpires?: Date;
}

const loginAttempts = new Map<string, LoginAttempt>();

export function bruteForceProtection(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const email = req.body.email?.toLowerCase() || '';
  const key = `${ip}:${email}`;
  
  const now = new Date();
  const attempt = loginAttempts.get(key);
  
  if (attempt) {
    // Kontrollera om fortfarande blockerad
    if (attempt.blocked && attempt.blockExpires && now < attempt.blockExpires) {
      const minutesLeft = Math.ceil((attempt.blockExpires.getTime() - now.getTime()) / (1000 * 60));
      return res.status(429).json({
        success: false,
        message: `Konto tillfälligt blockerat. Försök igen om ${minutesLeft} minuter.`
      });
    }
    
    // Reset om blockering har gått ut
    if (attempt.blocked && attempt.blockExpires && now >= attempt.blockExpires) {
      attempt.blocked = false;
      attempt.attempts = 0;
      attempt.blockExpires = undefined;
    }
    
    // För många försök inom kort tid
    if (attempt.attempts >= 10 && (now.getTime() - attempt.lastAttempt.getTime()) < 15 * 60 * 1000) {
      attempt.blocked = true;
      attempt.blockExpires = new Date(now.getTime() + 15 * 60 * 1000); // 15 min block

      return res.status(429).json({
        success: false,
        message: 'För många misslyckade inloggningsförsök. Försök igen om 15 minuter.'
      });
    }
  }
  
  next();
}

export function recordFailedLogin(req: Request) {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const email = req.body.email?.toLowerCase() || '';
  const key = `${ip}:${email}`;
  
  const attempt = loginAttempts.get(key) || {
    ip,
    email,
    attempts: 0,
    lastAttempt: new Date(),
    blocked: false
  };
  
  attempt.attempts++;
  attempt.lastAttempt = new Date();
  
  loginAttempts.set(key, attempt);
}

export function recordSuccessfulLogin(req: Request) {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const email = req.body.email?.toLowerCase() || '';
  const key = `${ip}:${email}`;
  
  // Rensa misslyckade försök vid lyckad inloggning
  loginAttempts.delete(key);
}

// Request sanitization
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  // Rensa potentiellt farliga headers
  delete req.headers['x-forwarded-host'];
  delete req.headers['x-original-url'];
  delete req.headers['x-rewrite-url'];
  
  // Begränsa request body size
  const contentLengthHeader = req.get('content-length');
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader);
    if (contentLength > 10 * 1024 * 1024) { // 10MB
      return res.status(413).json({
        success: false,
        message: 'Request body för stor'
      });
    }
  }
  
  next();
}

// Security logging
export async function logSecurityEvent(
  type: 'LOGIN_FAILED' | 'LOGIN_SUCCESS' | 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY' | 'PROFILE_UPDATED' | 'EMAIL_CHANGE_FAILED' | 'EMAIL_CHANGED' | 'EMAIL_UPDATE_FAILED' | 'EMAIL_UPDATED' | 'PASSWORD_CHANGE_FAILED' | 'PASSWORD_CHANGED' | 'PASSWORD_UPDATE_FAILED' | 'PASSWORD_UPDATED' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_FAILED' | 'PASSWORD_RESET_SUCCESS' | 'WELCOME_EMAIL_SENT' | 'TOKEN_REFRESHED',
  req: Request,
  details?: any
) {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  console.log(`[SECURITY] ${type}`, {
    timestamp: new Date().toISOString(),
    ip,
    userAgent,
    path: req.path,
    method: req.method,
    details
  });
  
  // TOKEN_REFRESHED loggas bara till konsol, inte till DB (spamar)
  if (type === 'TOKEN_REFRESHED') return;

  // Skapa notifikation i databasen för aktivitetsfeed
  try {
    const messages: Record<string, string> = {
      'LOGIN_SUCCESS': `Användare ${details?.email || 'okänd'} loggade in`,
      'LOGIN_FAILED': `Misslyckad inloggning för ${details?.email || 'okänd användare'}${details?.reason ? ` (${details.reason})` : ''}`,
      'UNAUTHORIZED_ACCESS': 'Obehörig åtkomst försökt',
      'PROFILE_UPDATED': `Profil uppdaterad${details?.changedFields ? `: ${details.changedFields}` : ''}`,
      'PASSWORD_CHANGED': 'Lösenord ändrat',
      'PASSWORD_CHANGE_FAILED': 'Misslyckad lösenordsändring',
      'EMAIL_CHANGED': `Email ändrad${details?.oldEmail ? ` från ${details.oldEmail} till ${details.newEmail}` : ''}`,
      'EMAIL_CHANGE_FAILED': 'Misslyckad emailändring',
      'PASSWORD_RESET_REQUESTED': `Lösenordsåterställning begärd för ${details?.email || 'okänd'}`,
      'PASSWORD_RESET_FAILED': 'Misslyckad lösenordsåterställning',
      'PASSWORD_RESET_SUCCESS': 'Lösenord återställt',
      'WELCOME_EMAIL_SENT': `Välkomstmail skickat till ${details?.targetEmail || 'okänd'}`,
      'TOKEN_REFRESHED': 'Access token förnyad',
      'SUSPICIOUS_ACTIVITY': `Misstänkt aktivitet: ${details?.reason || 'okänd'}`,
    };

    // Inkludera IP och User-Agent i meddelandet för spårbarhet
    const metaInfo = `[IP: ${ip}] [UA: ${userAgent.substring(0, 100)}]`;

    await prisma.notification.create({
      data: {
        type: type as any,
        subject: `${type}`,
        message: `${messages[type] || type} ${metaInfo}`,
        userId: details?.userId || null
      }
    });
    
  } catch (error) {
    console.error('Failed to create security notification:', error);
  }
  
  // I produktion: skicka till logging service (Sentry, LogRocket, etc.)
}

// Clean up old login attempts (kör varje timme)
setInterval(() => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  for (const [key, attempt] of loginAttempts.entries()) {
    if (attempt.lastAttempt < oneHourAgo && !attempt.blocked) {
      loginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);
