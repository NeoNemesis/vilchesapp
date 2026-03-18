import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

const router = Router();

// Alla routes kräver autentisering
router.use(authenticateToken);

// === VALIDATION SCHEMAS ===

const createEventSchema = z.object({
  title: z.string().min(1, 'Titel krävs'),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
  type: z.enum(['MEETING', 'SITE_VISIT', 'DEADLINE', 'TASK', 'REMINDER', 'BLOCKED', 'OTHER']).optional().default('MEETING'),
  status: z.enum(['CONFIRMED', 'TENTATIVE', 'CANCELLED']).optional().default('CONFIRMED'),
  color: z.string().optional(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']).optional().default('NONE'),
  recurrenceEndDate: z.string().datetime().optional(),
  projectId: z.string().optional(),
  participantIds: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  externalId: z.string().optional(),
});

const updateEventSchema = createEventSchema.partial();

// === GET /api/calendar/events ===
// Hämta händelser (med filtrering)
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { start, end, userId, type, projectId } = req.query;
    const isAdmin = req.user!.role === 'ADMIN';

    const where: any = {};

    // Datumfilter
    if (start && end) {
      where.startTime = { gte: new Date(start as string) };
      where.endTime = { lte: new Date(end as string) };
    } else if (start) {
      where.startTime = { gte: new Date(start as string) };
    } else if (end) {
      where.endTime = { lte: new Date(end as string) };
    }

    // Typ-filter
    if (type) {
      where.type = type as string;
    }

    // Projekt-filter
    if (projectId) {
      where.projectId = projectId as string;
    }

    // Behörigheter: admin ser allt, andra ser bara sina egna + händelser de deltar i
    if (!isAdmin) {
      where.OR = [
        { createdById: req.user!.userId },
        { participants: { some: { userId: req.user!.userId } } }
      ];
    } else if (userId) {
      // Admin kan filtrera per användare
      where.OR = [
        { createdById: userId as string },
        { participants: { some: { userId: userId as string } } }
      ];
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, title: true, projectNumber: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(events);
  } catch (error) {
    console.error('Fel vid hämtning av kalenderhändelser:', error);
    res.status(500).json({ error: 'Kunde inte hämta kalenderhändelser' });
  }
});

// === GET /api/calendar/events/:id ===
router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, title: true, projectNumber: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Händelse hittades inte' });
    }

    // Kolla behörighet
    const isAdmin = req.user!.role === 'ADMIN';
    const isCreator = event.createdById === req.user!.userId;
    const isParticipant = event.participants.some(p => p.userId === req.user!.userId);

    if (!isAdmin && !isCreator && !isParticipant) {
      return res.status(403).json({ error: 'Du har inte behörighet att se denna händelse' });
    }

    res.json(event);
  } catch (error) {
    console.error('Fel vid hämtning av händelse:', error);
    res.status(500).json({ error: 'Kunde inte hämta händelse' });
  }
});

// === POST /api/calendar/events ===
router.post('/events', async (req: Request, res: Response) => {
  try {
    const data = createEventSchema.parse(req.body);
    const { participantIds, ...eventData } = data;

    const icalUid = `${crypto.randomUUID()}@vilchesapp.com`;

    const event = await prisma.calendarEvent.create({
      data: {
        ...eventData,
        startTime: new Date(eventData.startTime),
        endTime: new Date(eventData.endTime),
        recurrenceEndDate: eventData.recurrenceEndDate ? new Date(eventData.recurrenceEndDate) : undefined,
        createdById: req.user!.userId,
        icalUid,
        participants: participantIds.length > 0 ? {
          create: participantIds.map(userId => ({
            userId,
            accepted: false,
            notified: false
          }))
        } : undefined
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, title: true, projectNumber: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Valideringsfel', details: error.errors });
    }
    console.error('Fel vid skapande av händelse:', error);
    res.status(500).json({ error: 'Kunde inte skapa händelse' });
  }
});

// === PUT /api/calendar/events/:id ===
router.put('/events/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.calendarEvent.findUnique({
      where: { id: req.params.id },
      select: { createdById: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Händelse hittades inte' });
    }

    // Bara admin eller skaparen kan redigera
    if (req.user!.role !== 'ADMIN' && existing.createdById !== req.user!.userId) {
      return res.status(403).json({ error: 'Du har inte behörighet att redigera denna händelse' });
    }

    const data = updateEventSchema.parse(req.body);
    const { participantIds, ...eventData } = data;

    // Konvertera datum
    const updateData: any = { ...eventData };
    if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
    if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);
    if (updateData.recurrenceEndDate) updateData.recurrenceEndDate = new Date(updateData.recurrenceEndDate);

    // Uppdatera deltagare om det skickas med
    if (participantIds !== undefined) {
      // Ta bort alla befintliga deltagare och lägg till nya
      await prisma.calendarParticipant.deleteMany({
        where: { eventId: req.params.id }
      });

      if (participantIds.length > 0) {
        await prisma.calendarParticipant.createMany({
          data: participantIds.map(userId => ({
            eventId: req.params.id,
            userId,
            accepted: false,
            notified: false
          }))
        });
      }
    }

    const event = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, title: true, projectNumber: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Valideringsfel', details: error.errors });
    }
    console.error('Fel vid uppdatering av händelse:', error);
    res.status(500).json({ error: 'Kunde inte uppdatera händelse' });
  }
});

// === DELETE /api/calendar/events/:id ===
router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.calendarEvent.findUnique({
      where: { id: req.params.id },
      select: { createdById: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Händelse hittades inte' });
    }

    if (req.user!.role !== 'ADMIN' && existing.createdById !== req.user!.userId) {
      return res.status(403).json({ error: 'Du har inte behörighet att ta bort denna händelse' });
    }

    await prisma.calendarEvent.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Händelse borttagen' });
  } catch (error) {
    console.error('Fel vid borttagning av händelse:', error);
    res.status(500).json({ error: 'Kunde inte ta bort händelse' });
  }
});

// === POST /api/calendar/events/:id/respond ===
// Deltagare svarar på en inbjudan
router.post('/events/:id/respond', async (req: Request, res: Response) => {
  try {
    const { accepted } = req.body;

    const participant = await prisma.calendarParticipant.findUnique({
      where: {
        eventId_userId: {
          eventId: req.params.id,
          userId: req.user!.userId
        }
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Du är inte inbjuden till denna händelse' });
    }

    await prisma.calendarParticipant.update({
      where: { id: participant.id },
      data: { accepted: !!accepted }
    });

    res.json({ success: true, accepted: !!accepted });
  } catch (error) {
    console.error('Fel vid svar på inbjudan:', error);
    res.status(500).json({ error: 'Kunde inte svara på inbjudan' });
  }
});

// === GET /api/calendar/users ===
// Hämta alla användare som kan bokas (för admin)
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Fel vid hämtning av användare:', error);
    res.status(500).json({ error: 'Kunde inte hämta användare' });
  }
});

// === GET /api/calendar/feed/:userId.ics ===
// iCal-feed för extern synkning (Google Calendar, Apple Calendar, etc.)
// Denna endpoint använder en API-nyckel istället för JWT
router.get('/feed/:token.ics', async (req: Request, res: Response) => {
  try {
    // Token är base64(userId:secret)
    const decoded = Buffer.from(req.params.token, 'base64').toString('utf-8');
    const [userId, secret] = decoded.split(':');

    if (!userId || secret !== process.env.ICAL_FEED_SECRET) {
      return res.status(401).json({ error: 'Ogiltig feed-nyckel' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    // Hämta händelser för denna användare (senaste 3 månader + framtida)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const events = await prisma.calendarEvent.findMany({
      where: {
        OR: [
          { createdById: userId },
          { participants: { some: { userId } } }
        ],
        startTime: { gte: threeMonthsAgo },
        status: { not: 'CANCELLED' }
      },
      include: {
        participants: {
          include: { user: { select: { name: true, email: true } } }
        },
        project: { select: { title: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    // Generera iCal
    const ical = generateICal(events, user.name);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vilchesapp-calendar.ics"');
    res.send(ical);
  } catch (error) {
    console.error('Fel vid generering av iCal-feed:', error);
    res.status(500).json({ error: 'Kunde inte generera kalender-feed' });
  }
});

// === GET /api/calendar/feed-url ===
// Generera feed-URL för nuvarande användare
router.get('/feed-url', async (req: Request, res: Response) => {
  try {
    const secret = process.env.ICAL_FEED_SECRET || 'vilchesapp-ical-default-secret';
    const token = Buffer.from(`${req.user!.userId}:${secret}`).toString('base64');
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const feedUrl = `${baseUrl}/api/calendar/feed/${token}.ics`;

    res.json({ feedUrl });
  } catch (error) {
    console.error('Fel vid generering av feed-URL:', error);
    res.status(500).json({ error: 'Kunde inte generera feed-URL' });
  }
});

// === Helper: Generera iCal-format ===
function generateICal(events: any[], calendarName: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VilchesApp//Calendar//SV',
    `X-WR-CALNAME:VilchesApp - ${calendarName}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.icalUid || event.id + '@vilchesapp.com'}`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatICalDateOnly(event.startTime)}`);
      lines.push(`DTEND;VALUE=DATE:${formatICalDateOnly(event.endTime)}`);
    } else {
      lines.push(`DTSTART:${formatICalDate(event.startTime)}`);
      lines.push(`DTEND:${formatICalDate(event.endTime)}`);
    }

    lines.push(`SUMMARY:${escapeICalText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeICalText(event.location)}`);
    }
    if (event.project) {
      lines.push(`CATEGORIES:${escapeICalText(event.project.title)}`);
    }

    // Deltagare
    for (const p of event.participants || []) {
      const status = p.accepted ? 'ACCEPTED' : 'NEEDS-ACTION';
      lines.push(`ATTENDEE;PARTSTAT=${status};CN=${escapeICalText(p.user.name)}:mailto:${p.user.email}`);
    }

    lines.push(`STATUS:${event.status === 'CANCELLED' ? 'CANCELLED' : event.status === 'TENTATIVE' ? 'TENTATIVE' : 'CONFIRMED'}`);
    lines.push(`CREATED:${formatICalDate(event.createdAt)}`);
    lines.push(`LAST-MODIFIED:${formatICalDate(event.updatedAt)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatICalDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export default router;
