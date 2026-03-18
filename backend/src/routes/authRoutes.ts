import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  validateRequest,
  loginSchema,
  updateProfileSchema,
  updateEmailSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../middleware/validation';
import {
  authLimiter,
  bruteForceProtection,
  recordFailedLogin,
  recordSuccessfulLogin,
  logSecurityEvent
} from '../middleware/security';
import { authenticateToken } from '../middleware/auth';
import EmailNotificationService from '../services/emailNotificationService';
import { prisma } from '../lib/prisma';

const router = Router();

// Login endpoint with enhanced security
router.post('/login', 
  authLimiter,
  bruteForceProtection,
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Hitta användaren
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        await logSecurityEvent('LOGIN_FAILED', req, { email, reason: 'User not found' });
        recordFailedLogin(req);
        return res.status(401).json({
          success: false,
          message: 'Felaktig email eller lösenord'
        });
      }

      // Kontrollera lösenord
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        await logSecurityEvent('LOGIN_FAILED', req, { email, reason: 'Invalid password' });
        recordFailedLogin(req);
        return res.status(401).json({
          success: false,
          message: 'Felaktig email eller lösenord'
        });
      }

      // Kontrollera att användaren är aktiv
      if (!user.isActive) {
        await logSecurityEvent('LOGIN_FAILED', req, { email, reason: 'Account inactive' });
        return res.status(401).json({
          success: false,
          message: 'Kontot är inaktiverat'
        });
      }

      // Skapa säker JWT token med mycket kortare livslängd
      const accessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET!,
        { 
          expiresIn: '15m', // Mycket kortare livslängd för säkerhet
          issuer: 'vilches-app',
          audience: 'vilches-users'
        }
      );

      // Skapa refresh token with separate secret
      const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET! + '_refresh');
      const refreshToken = jwt.sign(
        {
          userId: user.id,
          type: 'refresh'
        },
        refreshTokenSecret,
        {
          expiresIn: '7d',
          issuer: 'vilches-app',
          audience: 'vilches-users'
        }
      );

      // Uppdatera senaste inloggning
      await prisma.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() }
      });

      // Logga lyckad inloggning
      await logSecurityEvent('LOGIN_SUCCESS', req, { email, userId: user.id });
      recordSuccessfulLogin(req);

      // Returnera användardata (utan lösenord)
      const { password: _, ...userWithoutPassword } = user;

      // Sätt säkra cookies för tokens
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
        ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
      };

      res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minuter
      });

      res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dagar
      });

      res.json({
        success: true,
        message: 'Inloggning lyckades',
        user: userWithoutPassword
      });

    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logSecurityEvent('LOGIN_FAILED', req, { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Serverfel vid inloggning'
      });
    }
  }
);

// Refresh token endpoint - förnyar access token med refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Ingen refresh token'
      });
    }

    // Verifiera refresh token with separate secret
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET! + '_refresh');
    const decoded = jwt.verify(refreshToken, refreshTokenSecret) as any;
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Ogiltig token typ'
      });
    }

    // Hämta användare
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        name: true, 
        isActive: true,
        company: true,
        phone: true,
        createdAt: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Användare inte giltig'
      });
    }

    // Skapa ny access token
    const newAccessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET!,
      { 
        expiresIn: '15m', // Samma korta livslängd
        issuer: 'vilches-app',
        audience: 'vilches-users'
      }
    );

    // Sätt ny cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    };

    res.cookie('accessToken', newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000 // 15 minuter
    });

    await logSecurityEvent('TOKEN_REFRESHED', req, { userId: user.id });

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Ogiltig refresh token'
    });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true,
        phone: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Användare hittades inte'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfel'
    });
  }
});

// Logout endpoint (clears cookies)
router.post('/logout', authenticateToken, (req, res) => {
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);
  
  res.json({
    success: true,
    message: 'Utloggning lyckades'
  });
});

// Update profile information (name, phone, company)
router.put('/profile', 
  authenticateToken,
  validateRequest(updateProfileSchema),
  async (req, res) => {
    try {
      const { name, phone, company } = req.body;
      const userId = req.user!.userId;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(company !== undefined && { company: company || null }),
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          company: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      await logSecurityEvent('PROFILE_UPDATED', req, { 
        userId, 
        updatedFields: Object.keys(req.body) 
      });

      res.json({
        success: true,
        message: 'Profil uppdaterad',
        user: updatedUser
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfel vid uppdatering av profil'
      });
    }
  }
);

// Update email address
router.put('/email',
  authenticateToken,
  validateRequest(updateEmailSchema),
  async (req, res) => {
    try {
      const { newEmail, currentPassword } = req.body;
      const userId = req.user!.userId;

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Användare hittades inte'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        await logSecurityEvent('EMAIL_CHANGE_FAILED', req, { 
          userId, 
          reason: 'Invalid password' 
        });
        return res.status(401).json({
          success: false,
          message: 'Felaktigt lösenord'
        });
      }

      // Check if new email is already in use
      const existingUser = await prisma.user.findUnique({
        where: { email: newEmail }
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          success: false,
          message: 'Email-adressen används redan'
        });
      }

      // Update email
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { 
          email: newEmail,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          company: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      await logSecurityEvent('EMAIL_CHANGED', req, { 
        userId,
        oldEmail: user.email,
        newEmail 
      });

      res.json({
        success: true,
        message: 'Email-adress uppdaterad',
        user: updatedUser
      });

    } catch (error) {
      console.error('Update email error:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfel vid uppdatering av email'
      });
    }
  }
);

// Update password
router.put('/password',
  authenticateToken,
  validateRequest(updatePasswordSchema),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.userId;

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Användare hittades inte'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        await logSecurityEvent('PASSWORD_CHANGE_FAILED', req, { 
          userId, 
          reason: 'Invalid current password' 
        });
        return res.status(401).json({
          success: false,
          message: 'Felaktigt nuvarande lösenord'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      });

      await logSecurityEvent('PASSWORD_CHANGED', req, { userId });

      res.json({
        success: true,
        message: 'Lösenord uppdaterat'
      });

    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfel vid uppdatering av lösenord'
      });
    }
  }
);

// Forgot password - skicka återställningsmail
router.post('/forgot-password',
  authLimiter,
  validateRequest(forgotPasswordSchema),
  async (req, res) => {
    try {
      const { email } = req.body;

      // Hitta användaren
      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Returnera samma svar oavsett om användaren finns (säkerhet)
      if (!user) {
        return res.json({
          success: true,
          message: 'Om email-adressen finns i vårt system har ett återställningsmail skickats'
        });
      }

      // Skicka återställningsmail
      const emailSent = await EmailNotificationService.sendPasswordResetEmail(
        user.email, 
        user.name
      );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: 'Kunde inte skicka återställningsmail'
        });
      }

      await logSecurityEvent('PASSWORD_RESET_REQUESTED', req, { 
        email, 
        userId: user.id 
      });

      res.json({
        success: true,
        message: 'Återställningsmail har skickats till din e-postadress'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfel vid begäran av lösenordsåterställning'
      });
    }
  }
);

// Reset password - sätt nytt lösenord med token
router.post('/reset-password',
  authLimiter,
  validateRequest(resetPasswordSchema),
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      // Hitta användaren med giltig token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date() // Token måste vara giltig (inte utgången)
          }
        }
      });

      if (!user) {
        await logSecurityEvent('PASSWORD_RESET_FAILED', req, { 
          token, 
          reason: 'Invalid or expired token' 
        });
        return res.status(400).json({
          success: false,
          message: 'Ogiltig eller utgången återställningslänk'
        });
      }

      // Hasha det nya lösenordet
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Uppdatera lösenord och rensa reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date()
        }
      });

      // Skicka bekräftelsemail
      await EmailNotificationService.sendPasswordChangedConfirmation(
        user.email,
        user.name
      );

      await logSecurityEvent('PASSWORD_RESET_SUCCESS', req, { 
        userId: user.id,
        email: user.email 
      });

      res.json({
        success: true,
        message: 'Lösenord har återställts framgångsrikt'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfel vid återställning av lösenord'
      });
    }
  }
);

// Send welcome email - för admin att skicka välkomstmail
router.post('/send-welcome-email',
  authenticateToken,
  async (req, res) => {
    try {
      const { userEmail } = req.body;

      // Kontrollera att endast admin kan skicka välkomstmail
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Endast administratörer kan skicka välkomstmail'
        });
      }

      // Hitta användaren
      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Användare hittades inte'
        });
      }

      // Skicka välkomstmail
      const emailSent = await EmailNotificationService.sendWelcomeEmail(
        user.email,
        user.name
      );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: 'Kunde inte skicka välkomstmail'
        });
      }

      await logSecurityEvent('WELCOME_EMAIL_SENT', req, { 
        targetEmail: user.email,
        targetUserId: user.id,
        sentBy: req.user!.userId
      });

      res.json({
        success: true,
        message: `Välkomstmail skickat till ${user.email}`
      });

    } catch (error) {
      console.error('Send welcome email error:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfel vid skickande av välkomstmail'
      });
    }
  }
);

export default router;
