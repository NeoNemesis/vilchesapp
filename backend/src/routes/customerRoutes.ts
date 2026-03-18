import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// ============================================================================
// KUNDREGISTER - Customer Registry Endpoints
// ============================================================================

/**
 * GET /api/customers
 * Hämta alla kunder med sök- och filtreringsmöjligheter
 * Query params: ?search=&active=true/false
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search, active } = req.query;

    // Bygg where-villkor baserat på query params
    const where: any = {};

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { customerNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            quotes: true,
            projects: true,
            invoices: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      message: 'Kunde inte hämta kunder',
      error: process.env.NODE_ENV === 'production' ? 'Ett internt fel uppstod' : (error as Error).message,
    });
  }
});

/**
 * GET /api/customers/:id
 * Hämta en enskild kund med alla relaterade offerter, projekt och fakturor
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        quotes: {
          orderBy: { createdAt: 'desc' },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Kund hittades inte' });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      message: 'Kunde inte hämta kund',
      error: process.env.NODE_ENV === 'production' ? 'Ett internt fel uppstod' : (error as Error).message,
    });
  }
});

/**
 * POST /api/customers
 * Skapa ny kund med automatiskt genererat kundnummer (K-YYYY-NNNN)
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      clientType,
      personalNumber,
      orgNumber,
      contactPerson,
      propertyAddress,
      housingType,
      brfName,
      brfOrgNumber,
      fortnoxCustomerId,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Namn är obligatoriskt' });
    }

    // Generera kundnummer i formatet K-YYYY-NNNN
    const year = new Date().getFullYear();
    const prefix = `K-${year}-`;

    // Hitta senaste kundnumret för innevarande år
    const latestCustomer = await prisma.customer.findFirst({
      where: {
        customerNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        customerNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (latestCustomer && latestCustomer.customerNumber) {
      const lastNumber = parseInt(latestCustomer.customerNumber.split('-')[2], 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const customerNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

    const customer = await prisma.customer.create({
      data: {
        customerNumber,
        name,
        email,
        phone,
        address,
        clientType,
        personalNumber,
        orgNumber,
        contactPerson,
        propertyAddress,
        housingType,
        brfName,
        brfOrgNumber,
        fortnoxCustomerId,
        notes,
        isActive: true,
      },
    });

    console.log(`Ny kund skapad: ${customer.customerNumber} - ${customer.name}`);

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      message: 'Kunde inte skapa kund',
      error: process.env.NODE_ENV === 'production' ? 'Ett internt fel uppstod' : (error as Error).message,
    });
  }
});

/**
 * PUT /api/customers/:id
 * Uppdatera en befintlig kund
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      address,
      clientType,
      personalNumber,
      orgNumber,
      contactPerson,
      propertyAddress,
      housingType,
      brfName,
      brfOrgNumber,
      fortnoxCustomerId,
      notes,
      isActive,
    } = req.body;

    // Kontrollera om kunden finns
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: 'Kund hittades inte' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        clientType,
        personalNumber,
        orgNumber,
        contactPerson,
        propertyAddress,
        housingType,
        brfName,
        brfOrgNumber,
        fortnoxCustomerId,
        notes,
        isActive,
      },
    });

    res.json({
      success: true,
      data: updatedCustomer,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      message: 'Kunde inte uppdatera kund',
      error: process.env.NODE_ENV === 'production' ? 'Ett internt fel uppstod' : (error as Error).message,
    });
  }
});

/**
 * DELETE /api/customers/:id
 * Mjuk borttagning - sätter isActive till false
 * Returnerar fel om kunden har aktiva fakturor
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Kontrollera om kunden finns
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: 'Kund hittades inte' });
    }

    // Kontrollera om kunden har aktiva (obetalda) fakturor
    const activeInvoices = await prisma.invoice.count({
      where: {
        customerId: id,
        status: {
          in: ['DRAFT', 'SENT', 'OVERDUE'],
        },
      },
    });

    if (activeInvoices > 0) {
      return res.status(400).json({
        message: `Kan inte ta bort kund med ${activeInvoices} aktiva fakturor. Slutför eller makulera fakturorna först.`,
      });
    }

    // Mjuk borttagning - sätt isActive till false
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Kund har inaktiverats',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      message: 'Kunde inte ta bort kund',
      error: process.env.NODE_ENV === 'production' ? 'Ett internt fel uppstod' : (error as Error).message,
    });
  }
});

/**
 * GET /api/customers/:id/history
 * Hämta kombinerad tidslinje av alla offerter, projekt och fakturor för en kund
 */
router.get('/:id/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Kontrollera om kunden finns
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Kund hittades inte' });
    }

    // Hämta alla relaterade poster parallellt
    const [quotes, projects, invoices] = await Promise.all([
      prisma.quote.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Kombinera till en tidslinje sorterad efter datum
    const timeline = [
      ...quotes.map((q) => ({
        type: 'quote' as const,
        id: q.id,
        date: q.createdAt,
        status: q.status,
        data: q,
      })),
      ...projects.map((p) => ({
        type: 'project' as const,
        id: p.id,
        date: p.createdAt,
        status: p.status,
        data: p,
      })),
      ...invoices.map((i) => ({
        type: 'invoice' as const,
        id: i.id,
        date: i.createdAt,
        status: i.status,
        data: i,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      data: {
        customer,
        timeline,
        summary: {
          totalQuotes: quotes.length,
          totalProjects: projects.length,
          totalInvoices: invoices.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching customer history:', error);
    res.status(500).json({
      message: 'Kunde inte hämta kundhistorik',
      error: process.env.NODE_ENV === 'production' ? 'Ett internt fel uppstod' : (error as Error).message,
    });
  }
});

export default router;
