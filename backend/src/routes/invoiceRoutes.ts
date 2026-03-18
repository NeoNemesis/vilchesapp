/**
 * Invoice Routes
 * Create and send Fortnox invoices, manage billing info collection
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  createInvoiceFromQuote,
  sendFortnoxInvoice,
  requestBillingInfo,
  saveBillingInfo,
} from '../services/fortnoxInvoiceService';

const router = Router();

// === PUBLIC ROUTES (no auth - customer billing form) ===

/**
 * GET /billing-info/:token - Get billing form data
 */
router.get('/billing-info/:token', async (req: Request, res: Response) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { billingInfoToken: req.params.token },
      select: {
        clientName: true,
        clientEmail: true,
        quoteNumber: true,
        projectType: true,
        applyRotDeduction: true,
        estimatedTotalCost: true,
        totalAfterRot: true,
        billingInfoTokenExpiresAt: true,
        billingInfoCollected: true,
      },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Ogiltig eller utgången länk' });
    }

    if (quote.billingInfoCollected) {
      return res.status(400).json({ error: 'Uppgifterna har redan skickats in. Tack!' });
    }

    if (quote.billingInfoTokenExpiresAt && quote.billingInfoTokenExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Länken har gått ut. Kontakta oss för en ny länk.' });
    }

    return res.json({
      clientName: quote.clientName,
      quoteNumber: quote.quoteNumber,
      projectType: quote.projectType,
      totalCost: quote.totalAfterRot || quote.estimatedTotalCost,
      isRot: quote.applyRotDeduction === true,
    });
  } catch (error) {
    console.error('Error loading billing info form:', error);
    return res.status(500).json({ error: 'Något gick fel' });
  }
});

/**
 * POST /billing-info/:token - Submit billing info from customer
 */
router.post('/billing-info/:token', async (req: Request, res: Response) => {
  try {
    const { clientType, personalNumber, orgNumber, address, propertyAddress, housingType, brfName, brfOrgNumber } = req.body;

    if (!clientType || (clientType !== 'PRIVATE' && clientType !== 'COMPANY')) {
      return res.status(400).json({ error: 'Ange om du är privatperson eller företag' });
    }

    if (clientType === 'PRIVATE' && !personalNumber) {
      return res.status(400).json({ error: 'Personnummer krävs' });
    }

    if (clientType === 'COMPANY' && !orgNumber) {
      return res.status(400).json({ error: 'Organisationsnummer krävs' });
    }

    await saveBillingInfo(req.params.token, {
      clientType,
      personalNumber,
      orgNumber,
      address,
      propertyAddress,
      housingType,
      brfName,
      brfOrgNumber,
    });

    return res.json({ success: true, message: 'Tack! Dina uppgifter har sparats.' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Kunde inte spara uppgifter' });
  }
});

// === ADMIN ROUTES ===

router.use(authenticateToken, requireAdmin);

/**
 * POST /from-quote/:quoteId - Create Fortnox invoice from quote
 */
router.post('/from-quote/:quoteId', async (req: Request, res: Response) => {
  try {
    const result = await createInvoiceFromQuote(req.params.quoteId);
    return res.json({
      success: true,
      message: `Faktura ${result.invoiceNumber} skapad i Fortnox`,
      invoiceNumber: result.invoiceNumber,
      logId: result.logId,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Kunde inte skapa faktura' });
  }
});

/**
 * POST /:logId/send - Send invoice via Fortnox
 */
router.post('/:logId/send', async (req: Request, res: Response) => {
  try {
    await sendFortnoxInvoice(req.params.logId);
    return res.json({ success: true, message: 'Faktura skickad' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Kunde inte skicka faktura' });
  }
});

/**
 * POST /request-billing-info/:quoteId - Send billing info request to customer
 */
router.post('/request-billing-info/:quoteId', async (req: Request, res: Response) => {
  try {
    await requestBillingInfo(req.params.quoteId);
    return res.json({ success: true, message: 'Förfrågan skickad till kunden' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Kunde inte skicka förfrågan' });
  }
});

/**
 * GET /logs - Get invoice logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const logs = await prisma.fortnoxInvoiceLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: 'Kunde inte hämta fakturaloggar' });
  }
});

export default router;
