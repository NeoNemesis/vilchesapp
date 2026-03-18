/**
 * Fortnox Settings Routes
 * OAuth2 connection, employee sync, salary logs
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import * as fortnoxApi from '../services/fortnoxApiClient';

const router = Router();

/**
 * GET /callback - OAuth2 callback (exchanges code for tokens)
 * MUST be before auth middleware - Fortnox redirects here without JWT
 */
router.get('/callback', async (req: Request, res: Response) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://app.vilchesapp.com').replace(/\/$/, '');

  try {
    const { code, error: authError } = req.query;

    if (authError) {
      return res.redirect(`${frontendUrl}/admin/settings?fortnox=error&message=` + encodeURIComponent(String(authError)));
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${frontendUrl}/admin/settings?fortnox=error&message=Ingen+auktoriseringskod`);
    }

    const settings = await prisma.fortnoxSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings?.clientId || !settings?.clientSecret) {
      return res.redirect(`${frontendUrl}/admin/settings?fortnox=error&message=Saknar+credentials`);
    }

    const redirectUri = `${frontendUrl}/api/settings/fortnox/callback`;

    await fortnoxApi.exchangeCodeForTokens(code, settings.clientId, settings.clientSecret, redirectUri);

    // Enable Fortnox feature flag
    await prisma.appSettings.update({
      where: { id: 'default' },
      data: { enableFortnox: true },
    });

    return res.redirect(`${frontendUrl}/admin/settings?fortnox=success`);
  } catch (error: any) {
    console.error('Fortnox OAuth callback failed:', error);
    return res.redirect(`${frontendUrl}/admin/settings?fortnox=error&message=` + encodeURIComponent(error.message || 'Unknown error'));
  }
});

// All remaining routes require admin
router.use(authenticateToken, requireAdmin);

/**
 * GET / - Get Fortnox connection status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.fortnoxSettings.findUnique({
      where: { id: 'default' },
    });

    const appSettings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
      select: { enableFortnox: true },
    });

    return res.json({
      enabled: appSettings?.enableFortnox || false,
      isConnected: settings?.isConnected || false,
      companyName: settings?.companyName || null,
      hasCredentials: !!(settings?.clientId && settings?.clientSecret),
    });
  } catch (error) {
    console.error('Failed to fetch Fortnox settings:', error);
    return res.status(500).json({ error: 'Kunde inte hamta Fortnox-installningar' });
  }
});

/**
 * PUT /credentials - Save client ID and secret
 */
router.put('/credentials', async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Client ID och Client Secret kravs' });
    }

    await prisma.fortnoxSettings.upsert({
      where: { id: 'default' },
      update: { clientId, clientSecret },
      create: { id: 'default', clientId, clientSecret },
    });

    return res.json({ success: true, message: 'Fortnox-uppgifter sparade' });
  } catch (error) {
    console.error('Failed to save Fortnox credentials:', error);
    return res.status(500).json({ error: 'Kunde inte spara' });
  }
});

/**
 * GET /auth-url - Get OAuth2 authorization URL
 */
router.get('/auth-url', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.fortnoxSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings?.clientId || !settings?.clientSecret) {
      return res.status(400).json({ error: 'Konfigurera Client ID och Secret forst' });
    }

    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${frontendUrl.replace(/\/$/, '')}/api/settings/fortnox/callback`;
    const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64');

    const url = fortnoxApi.getAuthorizationUrl(settings.clientId, redirectUri, state);

    return res.json({ url });
  } catch (error) {
    console.error('Failed to generate auth URL:', error);
    return res.status(500).json({ error: 'Kunde inte generera auktoriserings-URL' });
  }
});

/**
 * POST /disconnect - Disconnect from Fortnox
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    await prisma.fortnoxSettings.update({
      where: { id: 'default' },
      data: {
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        isConnected: false,
        companyName: null,
      },
    });

    return res.json({ success: true, message: 'Fortnox frakopplad' });
  } catch (error) {
    console.error('Failed to disconnect Fortnox:', error);
    return res.status(500).json({ error: 'Kunde inte koppla fran' });
  }
});

/**
 * POST /test - Test Fortnox connection
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const result = await fortnoxApi.testConnection();

    if (result.ok) {
      return res.json({
        success: true,
        message: `Anslutning OK! Foretag: ${result.companyName}`,
        companyName: result.companyName,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Anslutning misslyckades',
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Anslutningstest misslyckades' });
  }
});

/**
 * POST /sync-employees - Sync employees to Fortnox
 */
router.post('/sync-employees', async (req: Request, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      where: {
        role: { in: ['EMPLOYEE', 'CONTRACTOR'] },
        isActive: true,
        fortnoxEmployeeId: null,
      },
      select: {
        id: true,
        name: true,
        personalNumber: true,
      },
    });

    let synced = 0;
    const errors: string[] = [];

    for (const emp of employees) {
      try {
        const nameParts = emp.name.split(' ');
        const fortnoxId = emp.id.substring(0, 8).toUpperCase();

        await fortnoxApi.createEmployee({
          employeeId: fortnoxId,
          firstName: nameParts[0] || emp.name,
          lastName: nameParts.slice(1).join(' ') || '-',
          personalNumber: emp.personalNumber || undefined,
        });

        await prisma.user.update({
          where: { id: emp.id },
          data: {
            fortnoxEmployeeId: fortnoxId,
            fortnoxSyncedAt: new Date(),
          },
        });

        synced++;
      } catch (error: any) {
        errors.push(`${emp.name}: ${error.message}`);
      }
    }

    return res.json({
      success: true,
      message: `${synced} anstallda synkade till Fortnox`,
      synced,
      total: employees.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Synkning misslyckades' });
  }
});

/**
 * GET /salary-logs - Get salary processing history
 */
router.get('/salary-logs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const logs = await prisma.fortnoxSalaryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        timeReport: { select: { weekNumber: true, year: true } },
      },
    });

    return res.json(logs);
  } catch (error) {
    console.error('Failed to fetch salary logs:', error);
    return res.status(500).json({ error: 'Kunde inte hamta loneloggar' });
  }
});

export default router;
