import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// Utöka Request interface för att inkludera user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

// Middleware för att verifiera JWT token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Först försök hämta från Authorization header
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];

    // Om ingen token i header, försök hämta från cookies
    if (!token) {
      token = req.cookies?.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Åtkomst nekad - ingen token'
      });
    }

    // Verifiera token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Kontrollera att användaren fortfarande finns och är aktiv
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Åtkomst nekad - användare inte giltig'
      });
    }

    // Lägg till användarinfo i request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      // Använd 401 för alla token-fel för konsistent hantering
      return res.status(401).json({
        success: false,
        message: 'Ogiltig eller utgången token'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Serverfel vid autentisering'
    });
  }
};

// Middleware för att kontrollera roller
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autentisering krävs'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Otillräckliga behörigheter'
      });
    }

    next();
  };
};

// Middleware för admin-endast endpoints
export const requireAdmin = requireRole(['ADMIN']);

// Middleware för att kontrollera att användaren äger resursen eller är admin
export const requireOwnershipOrAdmin = (getUserIdFromParams: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autentisering krävs'
      });
    }

    const resourceUserId = getUserIdFromParams(req);
    
    if (req.user.role === 'ADMIN' || req.user.userId === resourceUserId) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Du har inte behörighet att komma åt denna resurs'
      });
    }
  };
};

