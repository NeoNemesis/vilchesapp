/**
 * Standalone Invoice Routes
 * Hantera fakturor direkt (utan Fortnox-koppling)
 * Skapa, redigera, skicka och markera som betalda
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Alla routes kräver autentisering
router.use(authenticateToken);

/**
 * GET /stats - Fakturastatistik
 * Total intäkt, obetalt belopp, förfallna, månadsvis intäkt
 * OBS: Måste ligga före /:id för att inte matcha "stats" som id
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Hämta total intäkt (betalda fakturor)
    const paidAgg = await prisma.invoice.aggregate({
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
    });

    // Hämta obetalt belopp (skickade fakturor)
    const unpaidAgg = await prisma.invoice.aggregate({
      where: { status: { in: ['SENT', 'OVERDUE'] } },
      _sum: { totalAmount: true },
    });

    // Antal förfallna fakturor
    const overdueCount = await prisma.invoice.count({
      where: { status: 'OVERDUE' },
    });

    // Månadsvis intäkt (senaste 12 månaderna, betalda fakturor)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: twelveMonthsAgo },
      },
      select: {
        totalAmount: true,
        paidAt: true,
      },
      orderBy: { paidAt: 'asc' },
    });

    // Gruppera per månad
    const monthlyRevenue: Record<string, number> = {};
    for (const inv of paidInvoices) {
      if (!inv.paidAt) continue;
      const key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + Number(inv.totalAmount ?? 0);
    }

    return res.json({
      totalRevenue: paidAgg._sum.totalAmount ?? 0,
      unpaidAmount: unpaidAgg._sum.totalAmount ?? 0,
      overdueCount,
      monthlyRevenue,
    });
  } catch (error) {
    console.error('Fel vid hämtning av fakturastatistik:', error);
    return res.status(500).json({ error: 'Kunde inte hämta statistik' });
  }
});

/**
 * GET /next-number - Hämta nästa lediga fakturanummer
 * Format: F-YYYY-NNNN
 */
router.get('/next-number', async (req: Request, res: Response) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `F-${year}-`;

    // Hitta senaste fakturanumret för detta år
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let nextNumber = 1;
    if (lastInvoice?.invoiceNumber) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    const invoiceNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;

    return res.json({ invoiceNumber });
  } catch (error) {
    console.error('Fel vid generering av fakturanummer:', error);
    return res.status(500).json({ error: 'Kunde inte generera fakturanummer' });
  }
});

/**
 * GET / - Lista fakturor med filtrering och paginering
 * Query: ?status=, ?customerId=, ?search=, ?page=, ?limit=
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      customerId,
      search,
      page: pageStr,
      limit: limitStr,
    } = req.query;

    const page = Math.max(parseInt(pageStr as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitStr as string) || 20, 1), 100);
    const skip = (page - 1) * limit;

    // Bygg filter
    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (customerId) {
      where.customerId = customerId as string;
    }

    if (search) {
      const searchStr = search as string;
      where.OR = [
        { invoiceNumber: { contains: searchStr, mode: 'insensitive' } },
        { reference: { contains: searchStr, mode: 'insensitive' } },
        { customer: { name: { contains: searchStr, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return res.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fel vid hämtning av fakturor:', error);
    return res.status(500).json({ error: 'Kunde inte hämta fakturor' });
  }
});

/**
 * GET /:id - Hämta en enskild faktura med radposter och kundinfo
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Fakturan hittades inte' });
    }

    return res.json(invoice);
  } catch (error) {
    console.error('Fel vid hämtning av faktura:', error);
    return res.status(500).json({ error: 'Kunde inte hämta faktura' });
  }
});

/**
 * POST / - Skapa ny faktura med radposter
 * Beräknar automatiskt subtotal, moms och totalbelopp
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      quoteId,
      projectId,
      dueDate,
      lineItems,
      invoiceType = 'STANDARD',
      paymentTerms = 30,
      reference,
      ourReference,
      notes,
      rotDeduction,
      rutDeduction,
    } = req.body;

    // Validering
    if (!customerId) {
      return res.status(400).json({ error: 'Kund krävs' });
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: 'Minst en radpost krävs' });
    }

    // Verifiera att kunden finns
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Kunden hittades inte' });
    }

    // Generera fakturanummer
    const year = new Date().getFullYear();
    const prefix = `F-${year}-`;

    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let nextNumber = 1;
    if (lastInvoice?.invoiceNumber) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    const invoiceNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;

    // Beräkna belopp från radposter
    let subtotal = 0;
    let totalVat = 0;

    const preparedLineItems = lineItems.map((item: any, index: number) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const vatRate = item.vatRate !== undefined ? Number(item.vatRate) : 25;
      const totalPrice = quantity * unitPrice;

      subtotal += totalPrice;
      totalVat += totalPrice * (vatRate / 100);

      return {
        description: item.description,
        quantity,
        unit: item.unit || 'st',
        unitPrice,
        totalPrice,
        vatRate,
        sortOrder: index,
      };
    });

    // Beräkna avdrag
    const rot = Number(rotDeduction) || 0;
    const rut = Number(rutDeduction) || 0;
    const totalAmount = subtotal + totalVat - rot - rut;

    // Beräkna förfallodatum
    const invoiceDate = new Date();
    const calculatedDueDate = dueDate
      ? new Date(dueDate)
      : new Date(invoiceDate.getTime() + paymentTerms * 24 * 60 * 60 * 1000);

    // Skapa fakturan med radposter i en transaktion
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        quoteId: quoteId || null,
        projectId: projectId || null,
        status: 'DRAFT',
        invoiceDate,
        dueDate: calculatedDueDate,
        subtotal,
        vatRate: 25,
        vatAmount: totalVat,
        rotDeduction: rot,
        rutDeduction: rut,
        totalAmount,
        invoiceType,
        paymentTerms,
        reference: reference || null,
        ourReference: ourReference || null,
        notes: notes || null,
        createdById: (req as any).user?.id || null,
        lineItems: {
          create: preparedLineItems,
        },
      },
      include: {
        customer: true,
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Faktura ${invoiceNumber} skapad`,
      invoice,
    });
  } catch (error) {
    console.error('Fel vid skapande av faktura:', error);
    return res.status(500).json({ error: 'Kunde inte skapa faktura' });
  }
});

/**
 * PUT /:id - Uppdatera utkastfaktura
 * Endast fakturor med status DRAFT kan redigeras
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { lineItems: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Fakturan hittades inte' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Endast utkast kan redigeras' });
    }

    const {
      customerId,
      quoteId,
      projectId,
      dueDate,
      lineItems,
      invoiceType,
      paymentTerms,
      reference,
      ourReference,
      notes,
      internalNotes,
      rotDeduction,
      rutDeduction,
    } = req.body;

    // Beräkna belopp om radposter skickas med
    let updateData: any = {};

    if (customerId !== undefined) updateData.customerId = customerId;
    if (quoteId !== undefined) updateData.quoteId = quoteId || null;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (invoiceType !== undefined) updateData.invoiceType = invoiceType;
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
    if (reference !== undefined) updateData.reference = reference || null;
    if (ourReference !== undefined) updateData.ourReference = ourReference || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes || null;
    if (rotDeduction !== undefined) updateData.rotDeduction = Number(rotDeduction) || 0;
    if (rutDeduction !== undefined) updateData.rutDeduction = Number(rutDeduction) || 0;

    // Om radposter uppdateras, beräkna om beloppen
    if (lineItems && Array.isArray(lineItems)) {
      let subtotal = 0;
      let totalVat = 0;

      const preparedLineItems = lineItems.map((item: any, index: number) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const vatRate = item.vatRate !== undefined ? Number(item.vatRate) : 25;
        const totalPrice = quantity * unitPrice;

        subtotal += totalPrice;
        totalVat += totalPrice * (vatRate / 100);

        return {
          description: item.description,
          quantity,
          unit: item.unit || 'st',
          unitPrice,
          totalPrice,
          vatRate,
          sortOrder: index,
        };
      });

      const rot = updateData.rotDeduction ?? Number(existing.rotDeduction) ?? 0;
      const rut = updateData.rutDeduction ?? Number(existing.rutDeduction) ?? 0;

      updateData.subtotal = subtotal;
      updateData.vatAmount = totalVat;
      updateData.totalAmount = subtotal + totalVat - rot - rut;

      // Ta bort gamla radposter och skapa nya i en transaktion
      const invoice = await prisma.$transaction(async (tx) => {
        await tx.invoiceLineItem.deleteMany({
          where: { invoiceId: req.params.id },
        });

        return tx.invoice.update({
          where: { id: req.params.id },
          data: {
            ...updateData,
            lineItems: {
              create: preparedLineItems,
            },
          },
          include: {
            customer: true,
            lineItems: { orderBy: { sortOrder: 'asc' } },
          },
        });
      });

      return res.json({
        success: true,
        message: 'Faktura uppdaterad',
        invoice,
      });
    }

    // Uppdatera utan radposter
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        customer: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return res.json({
      success: true,
      message: 'Faktura uppdaterad',
      invoice,
    });
  } catch (error) {
    console.error('Fel vid uppdatering av faktura:', error);
    return res.status(500).json({ error: 'Kunde inte uppdatera faktura' });
  }
});

/**
 * DELETE /:id - Ta bort utkastfaktura
 * Endast fakturor med status DRAFT kan tas bort
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Fakturan hittades inte' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Endast utkast kan tas bort' });
    }

    // Ta bort radposter och faktura i en transaktion
    await prisma.$transaction(async (tx) => {
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: req.params.id },
      });
      await tx.invoice.delete({
        where: { id: req.params.id },
      });
    });

    return res.json({
      success: true,
      message: `Faktura ${existing.invoiceNumber} borttagen`,
    });
  } catch (error) {
    console.error('Fel vid borttagning av faktura:', error);
    return res.status(500).json({ error: 'Kunde inte ta bort faktura' });
  }
});

/**
 * POST /:id/send - Markera faktura som skickad
 * Sätter status till SENT och sentAt till nu
 * I framtiden: skicka e-post till kund
 */
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Fakturan hittades inte' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Endast utkast kan skickas' });
    }

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
      include: {
        customer: true,
      },
    });

    // TODO: Skicka e-post till kund med faktura-PDF

    return res.json({
      success: true,
      message: `Faktura ${invoice.invoiceNumber} markerad som skickad`,
      invoice,
    });
  } catch (error) {
    console.error('Fel vid skickande av faktura:', error);
    return res.status(500).json({ error: 'Kunde inte skicka faktura' });
  }
});

/**
 * POST /:id/mark-paid - Markera faktura som betald
 * Sätter status till PAID och paidAt till nu
 */
router.post('/:id/mark-paid', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Fakturan hittades inte' });
    }

    if (existing.status !== 'SENT' && existing.status !== 'OVERDUE') {
      return res.status(400).json({ error: 'Endast skickade eller förfallna fakturor kan markeras som betalda' });
    }

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: {
        customer: true,
      },
    });

    return res.json({
      success: true,
      message: `Faktura ${invoice.invoiceNumber} markerad som betald`,
      invoice,
    });
  } catch (error) {
    console.error('Fel vid markering av faktura som betald:', error);
    return res.status(500).json({ error: 'Kunde inte markera faktura som betald' });
  }
});

export default router;
