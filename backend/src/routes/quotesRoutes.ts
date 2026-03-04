import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { generateQuotePDF } from '../services/quotePdfGenerator';
import { sendQuoteEmail } from '../services/quoteEmailService';
import { processUploadedImages } from '../services/imageProcessor';
import multer from 'multer';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';

const router = Router();

// Multer konfiguration för offertbilder
const quoteStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/quotes/images');
    try {
      await fsPromises.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `quote-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const quoteUpload = multer({
  storage: quoteStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Endast bilder är tillåtna (JPEG, PNG, WebP)'));
    }
  }
});

// ============================================================================
// QUOTE ENDPOINTS
// ============================================================================

/**
 * POST /api/quotes/estimate
 * AI-driven estimering baserad på liknande historiska projekt
 */
router.post('/estimate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      mainCategory,
      subCategory,
      areaSqm,
      complexity,
      hasGolvvarme,
      location,
      existingCondition
    } = req.body;

    // Hitta liknande projekt
    const similarQuotes = await prisma.quote.findMany({
      where: {
        mainCategory: mainCategory || undefined,
        status: { in: ['ACCEPTED'] }, // Bara accepterade projekt
      },
      include: {
        lineItems: true,
        materials: true,
      },
      take: 10,
    });

    if (similarQuotes.length === 0) {
      return res.json({
        success: true,
        data: {
          estimated: {
            totalHours: areaSqm * 12, // Standardestimat: 12h per kvm
            laborCost: areaSqm * 12 * 650, // 650 kr/h
            materialCost: areaSqm * 5000, // 5000 kr/kvm för material
            totalCost: (areaSqm * 12 * 650) + (areaSqm * 5000),
            rotDeduction: (areaSqm * 12 * 650) * 0.3, // 30% ROT-avdrag på arbetskostnad
            totalAfterRot: ((areaSqm * 12 * 650) * 0.7) + (areaSqm * 5000),
            hourlyRate: 650,
          },
          confidence: 50,
          basedOn: { count: 0, quotes: [] },
          lineItemsSuggestion: [],
        }
      });
    }

    // Beräkna genomsnittlig kostnad per kvm från liknande projekt
    const avgHoursPerSqm = similarQuotes.reduce((sum, q) => {
      const hours = q.actualTotalHours || q.estimatedTotalHours || 0;
      const area = q.areaSqm || 1;
      return sum + (hours / area);
    }, 0) / similarQuotes.length;

    const avgCostPerSqm = similarQuotes.reduce((sum, q) => {
      const cost = q.estimatedTotalCost || 0;
      const area = q.areaSqm || 1;
      return sum + (cost / area);
    }, 0) / similarQuotes.length;

    // Justera för komplexitet
    let complexityFactor = 1.0;
    if (complexity === 'SIMPLE') complexityFactor = 0.85;
    else if (complexity === 'COMPLEX') complexityFactor = 1.2;
    else if (complexity === 'VERY_COMPLEX') complexityFactor = 1.4;

    // Beräkna estimat
    const estimatedHours = Math.round(areaSqm * avgHoursPerSqm * complexityFactor);
    const hourlyRate = 650;
    const laborCost = estimatedHours * hourlyRate;
    const materialCost = Math.round(areaSqm * (avgCostPerSqm * 0.4)); // Ca 40% material
    const totalCost = laborCost + materialCost;
    const rotDeduction = Math.round(laborCost * 0.3); // 30% ROT
    const totalAfterRot = totalCost - rotDeduction;

    return res.json({
      success: true,
      data: {
        estimated: {
          totalHours: estimatedHours,
          laborCost,
          materialCost,
          totalCost,
          rotDeduction,
          totalAfterRot,
          hourlyRate,
        },
        confidence: Math.min(95, 60 + (similarQuotes.length * 5)),
        basedOn: {
          count: similarQuotes.length,
          quotes: similarQuotes.slice(0, 3).map(q => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            projectType: q.projectType,
            areaSqm: q.areaSqm,
            estimatedTotalCost: q.estimatedTotalCost,
          })),
        },
        adjustments: {
          complexityFactor,
          avgHoursPerSqm: Math.round(avgHoursPerSqm * 10) / 10,
        },
      }
    });

  } catch (error: any) {
    console.error('❌ Fel vid AI-estimering:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte generera estimat',
      error: error.message
    });
  }
});

/**
 * GET /api/quotes
 * Lista alla offerter med filtrering
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      status,
      mainCategory,
      clientEmail,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) where.status = status;
    if (mainCategory) where.mainCategory = mainCategory;
    if (clientEmail) where.clientEmail = clientEmail;
    if (search) {
      where.OR = [
        { clientName: { contains: search as string, mode: 'insensitive' } },
        { projectType: { contains: search as string, mode: 'insensitive' } },
        { quoteNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          lineItems: true,
          materials: true,
          project: {
            select: {
              id: true,
              projectNumber: true,
              status: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.quote.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        quotes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Fel vid hämtning av offerter:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte hämta offerter',
      error: error.message
    });
  }
});

/**
 * GET /api/quotes/:id
 * Hämta en specifik offert
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: true,
        materials: {
          include: {
            material: true,
          }
        },
        tags: true,
        images: true,
        project: true,
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Offert hittades inte'
      });
    }

    return res.json({
      success: true,
      data: quote
    });

  } catch (error: any) {
    console.error('❌ Fel vid hämtning av offert:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte hämta offert',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes
 * Skapa ny offert
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      mainCategory,
      subCategory,
      projectType,
      description,        // Arbetsbeskrivning
      areaSqm,
      complexity,
      existingCondition,
      hasGolvvarme,
      location,
      locationType,
      accessDifficulty,
      estimatedTotalHours,
      estimatedLaborCost,
      estimatedMaterialCost,
      estimatedTotalCost,
      rotDeduction,
      totalAfterRot,
      lineItems,
      materials,
      validUntil,
      saveAsTemplate,
      templateName,
    } = req.body;

    // Generera quote number
    const currentYear = new Date().getFullYear();
    const lastQuote = await prisma.quote.findFirst({
      where: {
        quoteNumber: {
          startsWith: `${currentYear}-`
        }
      },
      orderBy: {
        quoteNumber: 'desc'
      }
    });

    let quoteNumber;
    if (lastQuote) {
      const lastNumber = parseInt(lastQuote.quoteNumber.split('-')[1]);
      quoteNumber = `${currentYear}-${String(lastNumber + 1).padStart(4, '0')}`;
    } else {
      quoteNumber = `${currentYear}-0001`;
    }

    // Skapa offerten
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        mainCategory,
        subCategory,
        projectType,
        description,        // Arbetsbeskrivning sparas nu!
        areaSqm,
        complexity: complexity || 'MEDIUM',
        existingCondition: existingCondition || 'GOOD',
        hasGolvvarme: hasGolvvarme || false,
        location,
        locationType: locationType || 'SUBURB',
        accessDifficulty: accessDifficulty || 'EASY',
        estimatedTotalHours,
        estimatedLaborCost,
        estimatedMaterialCost,
        estimatedTotalCost,
        applyRotDeduction: req.body.applyRotDeduction !== false,
        rotDeduction,
        totalAfterRot,
        includeVat: req.body.includeVat || false,
        vatRate: req.body.vatRate || 25,
        vatAmount: req.body.vatAmount || null,
        totalWithVat: req.body.totalWithVat || null,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dagar
        status: 'DRAFT',
        createdById: req.user!.userId,
        lineItems: lineItems ? {
          create: lineItems.map((item: any) => ({
            category: item.category,
            customCategory: item.customCategory || null,
            description: item.description,
            // Nya flexibla fält
            quantity: item.quantity || item.estimatedHours || 0,
            unit: item.unit || 'tim',
            unitPrice: item.unitPrice || item.hourlyRate || 0,
            // Bakåtkompatibilitet
            estimatedHours: item.estimatedHours || item.quantity || 0,
            hourlyRate: item.hourlyRate || item.unitPrice || 0,
            totalCost: item.totalCost || 0,
          }))
        } : undefined,
        materials: materials ? {
          create: materials.map((m: any) => ({
            materialId: m.materialId,
            description: m.description,
            quantity: m.quantity,
            unit: m.unit,
            unitPrice: m.unitPrice,
            totalCost: m.totalCost,
            supplier: m.supplier,
          }))
        } : undefined,
      },
      include: {
        lineItems: true,
        materials: {
          include: {
            material: true,
          }
        },
      },
    });

    // Generera och spara nyckelord för AI-sökning
    const keywords = generateKeywords({
      projectType,
      mainCategory,
      subCategory,
      location,
      areaSqm,
      complexity,
      hasGolvvarme,
    });

    if (keywords.length > 0) {
      await prisma.quoteTag.createMany({
        data: keywords.map(keyword => ({
          quoteId: quote.id,
          tag: keyword,
          category: 'FEATURE', // Default category
        }))
      });
    }

    // Om användaren vill spara som mall
    if (saveAsTemplate && templateName) {
      await prisma.quoteTemplate.create({
        data: {
          name: templateName,
          mainCategory,
          subCategory,
          projectType,
          defaultComplexity: complexity || 'MEDIUM',
          defaultAreaSqm: areaSqm,
          includeVat: req.body.includeVat || false,
          vatRate: req.body.vatRate || 25,
          workTemplate: lineItems || [],
          materialTemplate: materials || [],
          keywords: keywords,
          timesUsed: 0,
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Offert skapad!',
      data: quote
    });

  } catch (error: any) {
    console.error('❌ Fel vid skapande av offert:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte skapa offert',
      error: error.message
    });
  }
});

/**
 * PUT /api/quotes/:id
 * Uppdatera offert
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Ta bort nested relations från update-data
    delete updateData.lineItems;
    delete updateData.materials;
    delete updateData.tags;
    delete updateData.project;

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        lineItems: true,
        materials: {
          include: {
            material: true,
          }
        },
      },
    });

    return res.json({
      success: true,
      message: 'Offert uppdaterad!',
      data: quote
    });

  } catch (error: any) {
    console.error('❌ Fel vid uppdatering av offert:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte uppdatera offert',
      error: error.message
    });
  }
});

/**
 * DELETE /api/quotes/:id
 * Ta bort offert
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.quote.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Offert borttagen!'
    });

  } catch (error: any) {
    console.error('❌ Fel vid borttagning av offert:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte ta bort offert',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/send
 * Skicka offert via email (PDF-generering kommer senare)
 */
router.post('/:id/send', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { to, message, selectedImageIds } = req.body;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: true,
        materials: {
          include: {
            material: true,
          },
        },
        images: true,
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Offert hittades inte'
      });
    }

    // Filtrera bilder baserat på val - om selectedImageIds skickas, använd bara de valda
    const filteredQuote = {
      ...quote,
      images: selectedImageIds && Array.isArray(selectedImageIds)
        ? quote.images.filter(img => selectedImageIds.includes(img.id))
        : quote.images
    };

    console.log(`📧 Skickar offert ${quote.quoteNumber} till ${to} med ${filteredQuote.images.length} bild(er)`);

    // Generera PDF
    const pdfPath = await generateQuotePDF(quote) as string;
    console.log(`📄 PDF genererad: ${pdfPath}`);

    // Skicka email med PDF och valda bilder
    await sendQuoteEmail({
      to,
      quote: filteredQuote,
      pdfPath,
      customMessage: message
    });

    // Radera temporär PDF efter skickning
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log(`🗑️ Temporär PDF raderad`);
    }

    // Uppdatera status
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentTo: to,
      }
    });

    console.log(`✅ Offert ${quote.quoteNumber} skickad till ${to}`);

    return res.json({
      success: true,
      message: 'Offert skickad!',
      data: {
        quoteNumber: quote.quoteNumber,
        sentTo: to,
        sentAt: new Date(),
      }
    });

  } catch (error: any) {
    console.error('❌ Fel vid skickande av offert:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte skicka offert',
      error: error.message
    });
  }
});

/**
 * GET /api/quotes/:id/pdf
 * Generera PDF för offert
 */
router.get('/:id/pdf', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: true,
        materials: {
          include: {
            material: true, // Inkludera materialnamn från biblioteket
          },
        },
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Offert hittades inte'
      });
    }

    // Generera PDF med vår professionella PDF-generator
    console.log('📄 Genererar PDF för offert:', quote.quoteNumber);
    const pdfPath = await generateQuotePDF(quote) as string;

    // Läs PDF-filen
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Sätt rätt headers för PDF-nedladdning
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Offert_${quote.quoteNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Skicka PDF-filen
    res.send(pdfBuffer);

    // Ta bort temporär fil efter att den skickats
    fs.unlinkSync(pdfPath);
    console.log('✅ PDF skickad och temporär fil raderad');

  } catch (error: any) {
    console.error('❌ Fel vid PDF-generering:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte generera PDF',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/create-project
 * Skapa projekt från accepterad offert
 */
router.post('/:id/create-project', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        project: true,
      }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Offert hittades inte'
      });
    }

    if (quote.project) {
      return res.status(400).json({
        success: false,
        message: 'Projekt finns redan för denna offert'
      });
    }

    // Skapa projekt och koppla till quote
    const project = await prisma.project.create({
      data: {
        title: quote.projectType,
        description: quote.description || '', // Använd offertens arbetsbeskrivning
        clientName: quote.clientName,
        clientEmail: quote.clientEmail || '',
        clientPhone: quote.clientPhone || '',
        address: quote.location,
        estimatedHours: quote.estimatedTotalHours,
        estimatedCost: quote.estimatedTotalCost,
        status: 'PENDING',
        priority: 'NORMAL',
        createdById: req.user!.userId,
        quoteId: id, // Koppla till quote
      }
    });

    // Uppdatera quote status
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
      }
    });

    return res.json({
      success: true,
      message: 'Projekt skapat från offert!',
      data: project
    });

  } catch (error: any) {
    console.error('❌ Fel vid skapande av projekt:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte skapa projekt',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/accept
 * Acceptera offert
 */
router.post('/:id/accept', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
      }
    });

    // 🆕 AUTOMATISK PROJEKTSKAPNING VID ACCEPT
    console.log(`✅ Offert ${quote.quoteNumber} accepterad - skapar projekt automatiskt...`);

    try {
      const userId = (req as any).user.userId;

      const project = await prisma.project.create({
        data: {
          title: quote.projectType,
          description: quote.description || `Projekt från accepterad offert ${quote.quoteNumber}`,
          address: quote.clientAddress || '',
          clientName: quote.clientName,
          clientEmail: quote.clientEmail || '',
          clientPhone: quote.clientPhone || '',
          status: 'ASSIGNED',
          priority: 'NORMAL',
          estimatedHours: quote.estimatedTotalHours,
          estimatedCost: quote.totalAfterRot || quote.estimatedTotalCost,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dagar
          createdById: userId,
          assignedToId: userId,
          quoteId: quote.id
        }
      });

      console.log(`✅ Projekt ${project.projectNumber} automatiskt skapat från offert ${quote.quoteNumber}`);
    } catch (projectError: any) {
      console.error('⚠️ Kunde inte skapa projekt automatiskt:', projectError.message);
      // Offerten är fortfarande accepterad även om projektet misslyckades
    }

    return res.json({
      success: true,
      message: 'Offert accepterad!',
      data: quote
    });

  } catch (error: any) {
    console.error('❌ Fel vid acceptering av offert:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte acceptera offert',
      error: error.message
    });
  }
});

/**
 * GET /api/quotes/similar
 * Hitta liknande offerter (för AI-matchning)
 */
router.get('/similar', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { mainCategory, areaSqm, complexity, location } = req.query;

    const quotes = await prisma.quote.findMany({
      where: {
        mainCategory: mainCategory as any || undefined,
        status: { in: ['ACCEPTED'] },
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
    });

    return res.json({
      success: true,
      data: quotes
    });

  } catch (error: any) {
    console.error('❌ Fel vid sökning efter liknande offerter:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte hitta liknande offerter',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/post-project
 * Logga faktiskt resultat efter projektet (för AI-träning)
 */
router.post('/:id/post-project', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      actualTotalHours,
      actualLaborCost,
      actualMaterialCost,
      actualTotalCost,
      surprises,
      lessonsLearned,
      customerSatisfaction,
    } = req.body;

    // Uppdatera quote med faktiska värden
    await prisma.quote.update({
      where: { id },
      data: {
        actualTotalHours,
        actualLaborCost,
        actualMaterialCost,
        actualTotalCost,
        surprises: surprises || [],
        lessonsLearned,
        customerSatisfaction,
      }
    });

    return res.json({
      success: true,
      message: 'Faktiskt resultat loggat! AI kommer lära sig från detta.'
    });

  } catch (error: any) {
    console.error('❌ Fel vid loggning av resultat:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte logga resultat',
      error: error.message
    });
  }
});

// ============================================================================
// MATERIAL ENDPOINTS
// ============================================================================

/**
 * GET /api/quotes/materials/list
 * Hämta alla material från biblioteket
 */
router.get('/materials/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    const where: any = { isActive: true };
    if (category && category !== 'ALL') where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { keywords: { hasSome: (search as string).toLowerCase().split(' ') } },
      ];
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      data: materials
    });

  } catch (error: any) {
    console.error('❌ Fel vid hämtning av material:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte hämta material',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/materials/create
 * Skapa nytt material i biblioteket
 */
router.post('/materials/create', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      category,
      keywords,
      unit,
      currentPrice,
      supplier,
      supplierArticleNumber,
      supplierUrl,
      typicalUsagePerSqm,
      typicalUsageNote,
      isActive = true,
    } = req.body;

    const material = await prisma.material.create({
      data: {
        name,
        category,
        keywords: keywords || [],
        unit,
        currentPrice,
        supplier,
        supplierArticleNumber,
        supplierUrl,
        typicalUsagePerSqm,
        typicalUsageNote,
        isActive,
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Material skapat!',
      data: material
    });

  } catch (error: any) {
    console.error('❌ Fel vid skapande av material:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte skapa material',
      error: error.message
    });
  }
});

/**
 * PUT /api/quotes/materials/:id
 * Uppdatera material
 */
router.put('/materials/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const material = await prisma.material.update({
      where: { id },
      data: updateData
    });

    return res.json({
      success: true,
      message: 'Material uppdaterat!',
      data: material
    });

  } catch (error: any) {
    console.error('❌ Fel vid uppdatering av material:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte uppdatera material',
      error: error.message
    });
  }
});

/**
 * DELETE /api/quotes/materials/:id
 * Ta bort material
 */
router.delete('/materials/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.material.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Material borttaget!'
    });

  } catch (error: any) {
    console.error('❌ Fel vid borttagning av material:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte ta bort material',
      error: error.message
    });
  }
});

// ============================================================================
// TEMPLATE ENDPOINTS
// ============================================================================

/**
 * GET /api/quotes/templates/list
 * Hämta alla offertmallar
 */
router.get('/templates/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { mainCategory } = req.query;

    const where: any = {};
    if (mainCategory && mainCategory !== 'ALL') where.mainCategory = mainCategory;

    const templates = await prisma.quoteTemplate.findMany({
      where,
      orderBy: [
        { timesUsed: 'desc' },
        { name: 'asc' }
      ]
    });

    return res.json({
      success: true,
      data: templates
    });

  } catch (error: any) {
    console.error('❌ Fel vid hämtning av mallar:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte hämta mallar',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/templates/:id/use
 * Använd en mall för att skapa ny offert
 */
router.post('/templates/:id/use', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clientName, clientEmail, areaSqm } = req.body;

    const template = await prisma.quoteTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Mall hittades inte'
      });
    }

    // Uppdatera användningsstatistik
    await prisma.quoteTemplate.update({
      where: { id },
      data: {
        timesUsed: { increment: 1 },
        lastUsedAt: new Date(),
      }
    });

    // Returnera mall-data för användning
    return res.json({
      success: true,
      data: {
        template,
        prefill: {
          clientName,
          clientEmail,
          mainCategory: template.mainCategory,
          subCategory: template.subCategory,
          projectType: template.projectType,
          areaSqm,
          includeVat: template.includeVat,
          vatRate: template.vatRate,
          lineItems: template.workTemplate,
          materials: template.materialTemplate,
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Fel vid användning av mall:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte använda mall',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/templates/create
 * Skapa ny mall
 */
router.post('/templates/create', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      mainCategory,
      subCategory,
      projectType,
      defaultComplexity,
      defaultAreaSqm,
      includeVat,
      vatRate,
      workTemplate,
      materialTemplate,
      keywords,
    } = req.body;

    const template = await prisma.quoteTemplate.create({
      data: {
        name,
        description,
        mainCategory,
        subCategory,
        projectType,
        defaultComplexity: defaultComplexity || 'MEDIUM',
        defaultAreaSqm,
        includeVat: includeVat || false,
        vatRate: vatRate || 25,
        workTemplate: workTemplate || [],
        materialTemplate: materialTemplate || [],
        keywords: keywords || [],
        timesUsed: 0,
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Mall skapad!',
      data: template
    });

  } catch (error: any) {
    console.error('❌ Fel vid skapande av mall:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte skapa mall',
      error: error.message
    });
  }
});

/**
 * DELETE /api/quotes/templates/:id
 * Ta bort mall
 */
router.delete('/templates/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.quoteTemplate.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Mall borttagen!'
    });

  } catch (error: any) {
    console.error('❌ Fel vid borttagning av mall:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte ta bort mall',
      error: error.message
    });
  }
});

// ============================================================================
// PUBLIC ROUTES (Ingen autentisering krävs)
// ============================================================================

/**
 * GET /api/quotes/public/:id
 * Hämta offert för publik visning (för kund att acceptera/neka)
 */
router.get('/public/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: true,
        materials: true,
      },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Offert hittades inte'
      });
    }

    // Returnera endast nödvändig information för kunden
    return res.json({
      success: true,
      data: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        clientName: quote.clientName,
        clientEmail: quote.clientEmail,
        projectType: quote.projectType,
        estimatedTotalHours: quote.estimatedTotalHours,
        estimatedLaborCost: quote.estimatedLaborCost,
        estimatedMaterialCost: quote.estimatedMaterialCost,
        estimatedTotalCost: quote.estimatedTotalCost,
        totalAfterRot: quote.totalAfterRot,
        rotDeduction: quote.rotDeduction,
        applyRotDeduction: quote.applyRotDeduction,
        status: quote.status,
        createdAt: quote.createdAt,
        lineItems: quote.lineItems,
        materials: quote.materials,
      }
    });

  } catch (error: any) {
    console.error('❌ Fel vid hämtning av publik offert:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte hämta offert',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/public/:id/accept
 * Acceptera offert (publik - för kund)
 */
router.post('/public/:id/accept', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerName, customerEmail, message } = req.body;

    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Offert hittades inte'
      });
    }

    // Uppdatera status till ACCEPTED
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
      }
    });

    console.log(`✅ Offert ${quote.quoteNumber} accepterad av ${customerName}`);

    // 🆕 AUTOMATISK PROJEKTSKAPNING VID KUNDACCEPTANS
    let createdProject: any = null;
    try {
      // Hämta admin-användare som projektägare
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (adminUser) {
        createdProject = await prisma.project.create({
          data: {
            title: quote.projectType || quote.subCategory || quote.mainCategory || 'Nytt projekt',
            description: quote.description || `Projekt från accepterad offert ${quote.quoteNumber}`,
            address: quote.clientAddress || '',
            clientName: quote.clientName,
            clientEmail: quote.clientEmail || '',
            clientPhone: quote.clientPhone || '',
            status: 'PENDING',
            priority: 'NORMAL',
            estimatedHours: quote.estimatedTotalHours,
            estimatedCost: quote.totalAfterRot || quote.estimatedTotalCost,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dagar
            createdById: adminUser.id,
            quoteId: quote.id
          }
        });

        console.log(`✅ Projekt ${createdProject.projectNumber} automatiskt skapat från kundaccepterad offert ${quote.quoteNumber}`);
      } else {
        console.error('⚠️ Ingen admin-användare hittades - kunde inte skapa projekt automatiskt');
      }
    } catch (projectError: any) {
      console.error('⚠️ Kunde inte skapa projekt automatiskt vid kundacceptans:', projectError.message);
    }

    // Skicka till n8n webhook för notifikationer
    const n8nWebhookUrl = process.env.N8N_QUOTE_ACCEPTED_WEBHOOK;
    if (n8nWebhookUrl) {
      try {
        const webhookData = {
          action: 'ACCEPTED',
          adminEmail: process.env.COMPANY_EMAIL || '${process.env.COMPANY_EMAIL || ''}',
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          clientName: quote.clientName,
          clientEmail: quote.clientEmail,
          clientPhone: quote.clientPhone || null,
          projectType: quote.projectType || quote.subCategory || quote.mainCategory,
          totalCost: quote.estimatedTotalCost,
          totalAfterRot: quote.totalAfterRot,
          customerName,
          customerEmail,
          message,
          acceptedAt: new Date().toISOString(),
          projectCreated: !!createdProject,
          projectNumber: createdProject?.projectNumber || null,
          projectId: createdProject?.id || null,
        };

        console.log('📤 Skickar till n8n webhook:', n8nWebhookUrl);
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData)
        });

        if (response.ok) {
          console.log('✅ Notification skickad till n8n');
        } else {
          console.error('⚠️ n8n svarade med status:', response.status);
        }
      } catch (n8nError) {
        console.error('⚠️ Kunde inte skicka till n8n:', n8nError);
      }
    } else {
      console.log('⚠️ N8N_QUOTE_ACCEPTED_WEBHOOK är inte konfigurerad');
    }

    return res.json({
      success: true,
      message: 'Tack! Din accept är mottagen. Vi återkommer inom kort.',
      data: {
        quoteNumber: quote.quoteNumber,
        acceptedAt: new Date(),
        projectCreated: !!createdProject,
        projectNumber: createdProject?.projectNumber || null,
      }
    });

  } catch (error: any) {
    console.error('❌ Fel vid accepterande av offert:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte acceptera offert',
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/public/:id/reject
 * Neka offert (publik - för kund)
 */
router.post('/public/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerName, customerEmail, reason } = req.body;

    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Offert hittades inte'
      });
    }

    // Uppdatera status till REJECTED
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'REJECTED',
      }
    });

    console.log(`❌ Offert ${quote.quoteNumber} nekad av ${customerName}`);

    // Skicka till n8n webhook för notifikationer
    const n8nWebhookUrl = process.env.N8N_QUOTE_REJECTED_WEBHOOK;
    if (n8nWebhookUrl) {
      try {
        const webhookData = {
          action: 'REJECTED',
          adminEmail: process.env.COMPANY_EMAIL || '${process.env.COMPANY_EMAIL || ''}',
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          clientName: quote.clientName,
          clientEmail: quote.clientEmail,
          clientPhone: quote.clientPhone || null,
          projectType: quote.projectType || quote.subCategory || quote.mainCategory,
          totalCost: quote.estimatedTotalCost,
          totalAfterRot: quote.totalAfterRot,
          customerName,
          customerEmail,
          reason: reason || 'Ingen anledning angiven',
          rejectedAt: new Date().toISOString(),
        };

        console.log('📤 Skickar till n8n webhook:', n8nWebhookUrl);
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData)
        });

        if (response.ok) {
          console.log('✅ Notification skickad till n8n');
        } else {
          console.error('⚠️ n8n svarade med status:', response.status);
        }
      } catch (n8nError) {
        console.error('⚠️ Kunde inte skicka till n8n:', n8nError);
      }
    } else {
      console.log('⚠️ N8N_QUOTE_REJECTED_WEBHOOK är inte konfigurerad');
    }

    return res.json({
      success: true,
      message: 'Tack för ditt svar. Vi beklagar att vi inte kunde möta dina förväntningar denna gång.',
      data: {
        quoteNumber: quote.quoteNumber,
        rejectedAt: new Date(),
      }
    });

  } catch (error: any) {
    console.error('❌ Fel vid nekande av offert:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte neka offert',
      error: error.message
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generera nyckelord för AI-sökning
 */
function generateKeywords(data: any): string[] {
  const keywords: string[] = [];

  // Från projekttyp
  if (data.projectType) {
    const words = data.projectType.toLowerCase()
      .split(' ')
      .filter((w: string) => w.length > 3);
    keywords.push(...words);
  }

  // Från kategori
  if (data.mainCategory) keywords.push(data.mainCategory.toLowerCase());
  if (data.subCategory) keywords.push(data.subCategory.toLowerCase());

  // Från plats
  if (data.location) keywords.push(data.location.toLowerCase());

  // Från area
  if (data.areaSqm) {
    keywords.push(`${Math.round(data.areaSqm)}kvm`);
    if (data.areaSqm < 5) keywords.push('liten');
    else if (data.areaSqm < 15) keywords.push('medel');
    else keywords.push('stor');
  }

  // Från komplexitet
  if (data.complexity) keywords.push(data.complexity.toLowerCase());

  // Special features
  if (data.hasGolvvarme) keywords.push('golvvärme', 'golvvarme');

  // Säsong
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) keywords.push('vår');
  else if (month >= 5 && month <= 7) keywords.push('sommar');
  else if (month >= 8 && month <= 10) keywords.push('höst');
  else keywords.push('vinter');

  // Ta bort duplikater
  return [...new Set(keywords)];
}

// ============================================================================
// KUND-AUTOCOMPLETE
// ============================================================================

/**
 * GET /api/quotes/customers/search
 * Sök befintliga kunder för autocomplete
 */
router.get('/customers/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const searchTerm = (q as string || '').toLowerCase();

    if (!searchTerm || searchTerm.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Sök i både quotes och projects för unika kunder
    const [quotesCustomers, projectsCustomers] = await Promise.all([
      prisma.quote.findMany({
        where: {
          OR: [
            { clientName: { contains: searchTerm, mode: 'insensitive' } },
            { clientEmail: { contains: searchTerm, mode: 'insensitive' } },
            { clientAddress: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          clientName: true,
          clientEmail: true,
          clientPhone: true,
          clientAddress: true,
        },
        distinct: ['clientEmail'],
        take: 10,
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { clientName: { contains: searchTerm, mode: 'insensitive' } },
            { clientEmail: { contains: searchTerm, mode: 'insensitive' } },
            { address: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          clientName: true,
          clientEmail: true,
          clientPhone: true,
          address: true,
        },
        distinct: ['clientEmail'],
        take: 10,
      }),
    ]);

    // Kombinera och deduplicera baserat på email
    const customerMap = new Map();

    quotesCustomers.forEach((c) => {
      if (c.clientEmail) {
        customerMap.set(c.clientEmail, {
          name: c.clientName,
          email: c.clientEmail,
          phone: c.clientPhone || '',
          address: c.clientAddress || '',
        });
      }
    });

    projectsCustomers.forEach((c) => {
      if (c.clientEmail && !customerMap.has(c.clientEmail)) {
        customerMap.set(c.clientEmail, {
          name: c.clientName,
          email: c.clientEmail,
          phone: c.clientPhone || '',
          address: c.address || '',
        });
      }
    });

    const customers = Array.from(customerMap.values()).slice(0, 10);

    return res.json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    console.error('❌ Fel vid kundsökning:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte söka kunder',
      error: error.message,
    });
  }
});

// ============================================================================
// QUOTE IMAGE ENDPOINTS
// ============================================================================

/**
 * POST /api/quotes/:id/images
 * Ladda upp bilder till en offert (max 10 bilder)
 */
router.post('/:id/images', authenticateToken, quoteUpload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Offert hittades inte' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'Inga bilder uppladdade' });
    }

    // Optimera bilder med sharp
    const renamedFiles = await processUploadedImages(files);

    const imageData = files.map(file => {
      const finalFilename = renamedFiles.get(file.filename) || file.filename;
      return {
        quoteId: id,
        filename: finalFilename,
        originalName: file.originalname,
        mimeType: finalFilename.endsWith('.jpeg') ? 'image/jpeg' : file.mimetype,
        size: file.size,
        url: `/uploads/quotes/images/${finalFilename}`,
        description: (req.body.description as string) || null
      };
    });

    const images = await prisma.quoteImage.createMany({ data: imageData });

    // Hämta de skapade bilderna för att returnera dem
    const createdImages = await prisma.quoteImage.findMany({
      where: { quoteId: id },
      orderBy: { uploadedAt: 'desc' },
      take: files.length
    });

    return res.json({
      success: true,
      message: `${files.length} bild(er) uppladdade`,
      data: createdImages
    });

  } catch (error: any) {
    console.error('Fel vid uppladdning av offertbilder:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte ladda upp bilder',
      error: error.message
    });
  }
});

/**
 * GET /api/quotes/:id/images
 * Hämta alla bilder för en offert
 */
router.get('/:id/images', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const images = await prisma.quoteImage.findMany({
      where: { quoteId: id },
      orderBy: { uploadedAt: 'asc' }
    });

    return res.json({ success: true, data: images });

  } catch (error: any) {
    console.error('Fel vid hämtning av offertbilder:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte hämta bilder',
      error: error.message
    });
  }
});

/**
 * PUT /api/quotes/images/:imageId
 * Uppdatera beskrivning på en offertbild
 */
router.put('/images/:imageId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const { description } = req.body;

    const image = await prisma.quoteImage.update({
      where: { id: imageId },
      data: { description }
    });

    return res.json({ success: true, data: image });

  } catch (error: any) {
    console.error('Fel vid uppdatering av offertbild:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte uppdatera bild',
      error: error.message
    });
  }
});

/**
 * DELETE /api/quotes/images/:imageId
 * Ta bort en offertbild
 */
router.delete('/images/:imageId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;

    const image = await prisma.quoteImage.findUnique({ where: { id: imageId } });
    if (!image) {
      return res.status(404).json({ success: false, message: 'Bild hittades inte' });
    }

    // Ta bort filen från disk
    const filePath = path.join(__dirname, '../../uploads/quotes/images', image.filename);
    try {
      await fsPromises.unlink(filePath);
    } catch (err) {
      console.error('Kunde inte ta bort bildfil:', err);
    }

    // Ta bort från databas
    await prisma.quoteImage.delete({ where: { id: imageId } });

    return res.json({ success: true, message: 'Bild borttagen' });

  } catch (error: any) {
    console.error('Fel vid borttagning av offertbild:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte ta bort bild',
      error: error.message
    });
  }
});

export default router;
