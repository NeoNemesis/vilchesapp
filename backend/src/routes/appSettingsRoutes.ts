/**
 * VilchesApp — App Settings Routes
 *
 * Public endpoint: GET /api/app-settings (returns branding + feature flags)
 * Admin endpoint:  PUT /api/app-settings (update settings)
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/app-settings
 * Public — returns non-sensitive settings for the frontend
 * (company name, features, branding — no SMTP passwords)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      return res.json({
        setupCompleted: false,
        companyName: 'VilchesApp',
        poweredBy: 'VilchesApp',
      });
    }

    // Return only public/non-sensitive fields
    return res.json({
      setupCompleted: settings.setupCompleted,
      companyName: settings.companyName,
      orgNumber: settings.orgNumber,
      logo: settings.logo,
      industry: settings.industry,
      primaryColor: settings.primaryColor,
      accentColor: settings.accentColor,
      currency: settings.currency,
      vatRate: settings.vatRate,
      poweredBy: 'VilchesApp',

      // Feature flags
      features: {
        quotes: settings.enableQuotes,
        timeReports: settings.enableTimeReports,
        rotDeduction: settings.enableRotDeduction,
        rutDeduction: settings.enableRutDeduction,
        mapView: settings.enableMapView,
        sms: settings.enableSms,
        emailMonitor: settings.enableEmailMonitor,
        telegram: settings.enableTelegram,
        analytics: settings.enableAnalytics,
        automations: settings.enableAutomations,
      },

      // Custom categories for this installation
      customCategories: settings.customCategories,
      customPricing: settings.customPricing,
    });
  } catch (error) {
    console.error('Failed to fetch app settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/app-settings
 * Admin only — update settings
 */
router.put('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      orgNumber,
      logo,
      industry,
      primaryColor,
      accentColor,
      currency,
      vatRate,
      customPricing,
      customCategories,

      // Features
      enableQuotes,
      enableTimeReports,
      enableRotDeduction,
      enableRutDeduction,
      enableMapView,
      enableSms,
      enableEmailMonitor,
      enableTelegram,
      enableAnalytics,
      enableAutomations,

      // SMTP
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      smtpFromName,
      smtpFromEmail,
    } = req.body;

    const updated = await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: {
        ...(companyName !== undefined && { companyName }),
        ...(orgNumber !== undefined && { orgNumber }),
        ...(logo !== undefined && { logo }),
        ...(industry !== undefined && { industry }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(accentColor !== undefined && { accentColor }),
        ...(currency !== undefined && { currency }),
        ...(vatRate !== undefined && { vatRate }),
        ...(customPricing !== undefined && { customPricing }),
        ...(customCategories !== undefined && { customCategories }),
        ...(enableQuotes !== undefined && { enableQuotes }),
        ...(enableTimeReports !== undefined && { enableTimeReports }),
        ...(enableRotDeduction !== undefined && { enableRotDeduction }),
        ...(enableRutDeduction !== undefined && { enableRutDeduction }),
        ...(enableMapView !== undefined && { enableMapView }),
        ...(enableSms !== undefined && { enableSms }),
        ...(enableEmailMonitor !== undefined && { enableEmailMonitor }),
        ...(enableTelegram !== undefined && { enableTelegram }),
        ...(enableAnalytics !== undefined && { enableAnalytics }),
        ...(enableAutomations !== undefined && { enableAutomations }),
        ...(smtpHost !== undefined && { smtpHost }),
        ...(smtpPort !== undefined && { smtpPort }),
        ...(smtpSecure !== undefined && { smtpSecure }),
        ...(smtpUser !== undefined && { smtpUser }),
        ...(smtpPass !== undefined && { smtpPass }),
        ...(smtpFromName !== undefined && { smtpFromName }),
        ...(smtpFromEmail !== undefined && { smtpFromEmail }),
      },
      create: {
        id: 'default',
        companyName: companyName || 'My Company',
        setupCompleted: true,
        setupAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: 'Settings updated',
      settings: {
        companyName: updated.companyName,
        industry: updated.industry,
      },
    });
  } catch (error) {
    console.error('Failed to update app settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
