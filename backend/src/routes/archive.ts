import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Arkivera ett projekt
router.post('/projects/:id/archive', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Verifiera att projektet är COMPLETED
    const project = await prisma.project.findUnique({
      where: { id },
      select: { status: true, archived: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Projekt hittades inte' });
    }

    if (project.archived) {
      return res.status(400).json({ error: 'Projektet är redan arkiverat' });
    }

    if (project.status !== 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Endast färdiga projekt kan arkiveras',
        currentStatus: project.status
      });
    }

    // Arkivera projektet
    const archivedProject = await prisma.project.update({
      where: { id },
      data: {
        archived: true,
        archivedAt: new Date(),
        archivedById: userId
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        archivedBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({
      success: true,
      message: 'Projekt arkiverat',
      project: archivedProject
    });
  } catch (error) {
    console.error('Arkivering misslyckades:', error);
    res.status(500).json({ error: 'Kunde inte arkivera projekt' });
  }
});

// Återställ ett arkiverat projekt
router.post('/projects/:id/unarchive', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { archived: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Projekt hittades inte' });
    }

    if (!project.archived) {
      return res.status(400).json({ error: 'Projektet är inte arkiverat' });
    }

    // Återställ projektet
    const restoredProject = await prisma.project.update({
      where: { id },
      data: {
        archived: false,
        archivedAt: null,
        archivedById: null
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({
      success: true,
      message: 'Projekt återställt från arkiv',
      project: restoredProject
    });
  } catch (error) {
    console.error('Återställning misslyckades:', error);
    res.status(500).json({ error: 'Kunde inte återställa projekt' });
  }
});

// Lista arkiverade projekt
router.get('/projects/archived', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search, sortBy = 'archivedAt', order = 'desc' } = req.query;

    const where: any = { archived: true };

    // Sök i arkivet
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { clientName: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
        { projectNumber: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const archivedProjects = await prisma.project.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        archivedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { reports: true, images: true } }
      },
      orderBy: { [sortBy as string]: order }
    });

    res.json({
      success: true,
      count: archivedProjects.length,
      projects: archivedProjects
    });
  } catch (error) {
    console.error('Hämtning av arkiv misslyckades:', error);
    res.status(500).json({ error: 'Kunde inte hämta arkiverade projekt' });
  }
});

// Global sökning (inkludera arkiv)
router.get('/projects/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      query, 
      includeArchived = 'false',
      status,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const where: any = {};

    // Exkludera arkiverade om inte explicit inkluderade
    if (includeArchived !== 'true') {
      where.archived = false;
    }

    // Textssökning
    if (query) {
      where.OR = [
        { title: { contains: query as string, mode: 'insensitive' } },
        { description: { contains: query as string, mode: 'insensitive' } },
        { clientName: { contains: query as string, mode: 'insensitive' } },
        { address: { contains: query as string, mode: 'insensitive' } },
        { projectNumber: { contains: query as string, mode: 'insensitive' } }
      ];
    }

    // Status-filter
    if (status) {
      where.status = status;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        archivedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { reports: true, images: true } }
      },
      orderBy: { [sortBy as string]: order }
    });

    res.json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    console.error('Sökning misslyckades:', error);
    res.status(500).json({ error: 'Kunde inte söka projekt' });
  }
});

export default router;
