/**
 * VilchesApp — Setup Wizard Routes
 *
 * These routes handle first-time setup when the application is installed.
 * The setup wizard creates the initial admin account and configures
 * the application settings based on the chosen industry.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { getTemplate, getAllTemplates } from './templates';

const router = Router();

/**
 * GET /api/setup/status
 * Check if setup has been completed
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      // No settings exist — check if there's any admin user
      const adminExists = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      return res.json({
        needsSetup: !adminExists,
        setupCompleted: false,
      });
    }

    return res.json({
      needsSetup: !settings.setupCompleted,
      setupCompleted: settings.setupCompleted,
    });
  } catch (error) {
    console.error('Setup status check failed:', error);
    return res.status(500).json({ error: 'Failed to check setup status' });
  }
});

/**
 * GET /api/setup/templates
 * Return available industry templates
 */
router.get('/templates', (req: Request, res: Response) => {
  return res.json({
    templates: getAllTemplates(),
  });
});

/**
 * POST /api/setup/initialize
 * Complete the initial setup wizard
 */
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    // Check if setup already completed
    const existingSettings = await prisma.appSettings.findUnique({
      where: { id: 'default' },
    });

    if (existingSettings?.setupCompleted) {
      return res.status(400).json({
        error: 'Setup has already been completed. Use the admin panel to change settings.',
      });
    }

    // Also check if an admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      return res.status(400).json({
        error: 'An admin account already exists. Login to manage settings.',
      });
    }

    const {
      // Company info
      companyName,
      orgNumber,
      industry = 'general',

      // Admin account
      adminName,
      adminEmail,
      adminPassword,
      adminPhone,

      // Feature selections
      features = {},
    } = req.body;

    // Validation
    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        error: 'Missing required fields: companyName, adminName, adminEmail, adminPassword',
      });
    }

    if (adminPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
      });
    }

    // Get industry template
    const template = getTemplate(industry);

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create AppSettings
      const settings = await tx.appSettings.create({
        data: {
          id: 'default',
          companyName,
          orgNumber: orgNumber || null,
          industry,
          setupCompleted: true,
          setupAt: new Date(),

          // Features from template + user overrides
          enableQuotes: features.enableQuotes ?? template.features.enableQuotes,
          enableTimeReports: features.enableTimeReports ?? template.features.enableTimeReports,
          enableRotDeduction: features.enableRotDeduction ?? template.features.enableRotDeduction,
          enableRutDeduction: features.enableRutDeduction ?? template.features.enableRutDeduction,
          enableMapView: features.enableMapView ?? template.features.enableMapView,
          enableSms: features.enableSms ?? false,
          enableEmailMonitor: features.enableEmailMonitor ?? false,
          enableTelegram: features.enableTelegram ?? false,
          enableAnalytics: features.enableAnalytics ?? false,
          enableAutomations: features.enableAutomations ?? false,

          // Pricing from template
          customPricing: template.pricing,
          customCategories: template.categories,
        },
      });

      // 2. Create admin user
      const admin = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          phone: adminPhone || null,
          company: companyName,
          role: 'ADMIN',
          isActive: true,
        },
      });

      return { settings, admin };
    });

    console.log(`✅ Setup completed for "${companyName}" by ${result.admin.email}`);

    return res.status(201).json({
      success: true,
      message: 'Setup completed successfully',
      company: result.settings.companyName,
      adminEmail: result.admin.email,
    });
  } catch (error: any) {
    console.error('Setup initialization failed:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Email address is already in use',
      });
    }

    return res.status(500).json({
      error: 'Setup failed. Please try again.',
    });
  }
});

export default router;
