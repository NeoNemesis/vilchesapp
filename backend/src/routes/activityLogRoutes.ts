import { Router, Request, Response } from 'express';
import { NotificationType } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Alla endpoints kräver admin
router.use(authenticateToken);
router.use(requireAdmin);

// Kategorisera notifikationstyper
const SECURITY_TYPES: NotificationType[] = [
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'SUSPICIOUS_ACTIVITY',
  'PASSWORD_CHANGED', 'PASSWORD_CHANGE_FAILED', 'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_FAILED', 'PASSWORD_RESET_SUCCESS', 'EMAIL_CHANGED',
  'EMAIL_CHANGE_FAILED', 'PROFILE_UPDATED', 'TOKEN_REFRESHED', 'WELCOME_EMAIL_SENT',
];

const PROJECT_TYPES: NotificationType[] = [
  'PROJECT_ASSIGNED', 'REPORT_SUBMITTED', 'PROJECT_COMPLETED', 'DEADLINE_REMINDER',
];

const QUOTE_TYPES: NotificationType[] = [
  'QUOTE_CREATED', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED',
];

type SeverityLevel = 'critical' | 'warning' | 'info' | 'success';

function getSeverity(type: string): SeverityLevel {
  switch (type) {
    case 'LOGIN_FAILED':
    case 'UNAUTHORIZED_ACCESS':
    case 'SUSPICIOUS_ACTIVITY':
    case 'PASSWORD_CHANGE_FAILED':
    case 'PASSWORD_RESET_FAILED':
    case 'EMAIL_CHANGE_FAILED':
      return 'critical';
    case 'PASSWORD_RESET_REQUESTED':
    case 'DEADLINE_REMINDER':
    case 'QUOTE_REJECTED':
      return 'warning';
    case 'LOGIN_SUCCESS':
    case 'PASSWORD_CHANGED':
    case 'PASSWORD_RESET_SUCCESS':
    case 'EMAIL_CHANGED':
    case 'PROJECT_COMPLETED':
    case 'QUOTE_ACCEPTED':
      return 'success';
    default:
      return 'info';
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'LOGIN_SUCCESS': 'Inloggning lyckad',
    'LOGIN_FAILED': 'Inloggning misslyckad',
    'UNAUTHORIZED_ACCESS': 'Obehörig åtkomst',
    'SUSPICIOUS_ACTIVITY': 'Misstänkt aktivitet',
    'PASSWORD_CHANGED': 'Lösenord ändrat',
    'PASSWORD_CHANGE_FAILED': 'Lösenordsändring misslyckad',
    'PASSWORD_RESET_REQUESTED': 'Lösenordsåterställning begärd',
    'PASSWORD_RESET_FAILED': 'Lösenordsåterställning misslyckad',
    'PASSWORD_RESET_SUCCESS': 'Lösenord återställt',
    'EMAIL_CHANGED': 'E-post ändrad',
    'EMAIL_CHANGE_FAILED': 'E-poständring misslyckad',
    'PROFILE_UPDATED': 'Profil uppdaterad',
    'TOKEN_REFRESHED': 'Token förnyad',
    'WELCOME_EMAIL_SENT': 'Välkomstmail skickat',
    'PROJECT_ASSIGNED': 'Projekt tilldelat',
    'REPORT_SUBMITTED': 'Rapport inskickad',
    'PROJECT_COMPLETED': 'Projekt slutfört',
    'DEADLINE_REMINDER': 'Deadline-påminnelse',
    'QUOTE_CREATED': 'Offert skapad',
    'QUOTE_SENT': 'Offert skickad',
    'QUOTE_ACCEPTED': 'Offert accepterad',
    'QUOTE_REJECTED': 'Offert avvisad',
    'GENERAL': 'Allmänt',
  };
  return labels[type] || type;
}

// Extrahera IP från meddelande
function extractIP(message: string): string | null {
  const match = message.match(/\[IP: ([^\]]+)\]/);
  return match ? match[1] : null;
}

// GET /api/activity-logs
// Hämta aktivitetsloggar med filtrering och paginering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,   // 'security' | 'project' | 'quote' | 'all'
      severity,   // 'critical' | 'warning' | 'info' | 'success'
      type,       // Specifik NotificationType
      search,     // Fritextsökning i message
      days,       // Antal dagar bakåt (default 30)
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(10, parseInt(limit as string) || 50));
    const daysNum = parseInt(days as string) || 30;
    const skip = (pageNum - 1) * limitNum;

    // Bygg where-filter
    const where: any = {
      createdAt: {
        gte: new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000),
      },
    };

    // Filtrera på kategori
    if (category === 'security') {
      where.type = { in: SECURITY_TYPES };
    } else if (category === 'project') {
      where.type = { in: PROJECT_TYPES };
    } else if (category === 'quote') {
      where.type = { in: QUOTE_TYPES };
    }

    // Filtrera på specifik typ
    if (type) {
      where.type = type as string;
    }

    // Filtrera på severity (mappa till typer)
    if (severity) {
      const severityTypeMap: Record<string, NotificationType[]> = {
        critical: ['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'SUSPICIOUS_ACTIVITY', 'PASSWORD_CHANGE_FAILED', 'PASSWORD_RESET_FAILED', 'EMAIL_CHANGE_FAILED'],
        warning: ['PASSWORD_RESET_REQUESTED', 'DEADLINE_REMINDER', 'QUOTE_REJECTED'],
        success: ['LOGIN_SUCCESS', 'PASSWORD_CHANGED', 'PASSWORD_RESET_SUCCESS', 'EMAIL_CHANGED', 'PROJECT_COMPLETED', 'QUOTE_ACCEPTED'],
        info: ['TOKEN_REFRESHED', 'PROFILE_UPDATED', 'WELCOME_EMAIL_SENT', 'PROJECT_ASSIGNED', 'REPORT_SUBMITTED', 'QUOTE_CREATED', 'QUOTE_SENT', 'GENERAL'],
      };
      const severityTypes = severityTypeMap[severity as string];
      if (severityTypes) {
        // Kombinera med ev. kategorifilter
        if (where.type?.in) {
          where.type = { in: where.type.in.filter((t: NotificationType) => severityTypes.includes(t)) };
        } else if (!where.type) {
          where.type = { in: severityTypes };
        }
      }
    }

    // Fritextsökning
    if (search) {
      where.message = { contains: search as string, mode: 'insensitive' };
    }

    // Hämta loggar
    const [logs, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          project: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
    ]);

    // Filtrera på severity i minnet (beräknat fält)
    let filteredLogs = logs.map(log => ({
      id: log.id,
      type: log.type,
      typeLabel: getTypeLabel(log.type),
      severity: getSeverity(log.type),
      subject: log.subject,
      message: log.message.replace(/\s*\[IP:.*?\]\s*\[UA:.*?\]\s*$/, ''), // Rensa metadata från display
      ip: extractIP(log.message),
      user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email, role: log.user.role } : null,
      project: log.project ? { id: log.project.id, title: log.project.title } : null,
      isRead: !!log.readAt,
      createdAt: log.createdAt,
    }));

    res.json({
      success: true,
      data: {
        logs: filteredLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte hämta aktivitetsloggar',
    });
  }
});

// GET /api/activity-logs/stats
// Statistik för aktivitetsloggar
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalCount,
      securityCount,
      failedLogins,
      successfulLogins,
      recentLogs,
    ] = await Promise.all([
      prisma.notification.count({ where: { createdAt: { gte: since } } }),
      prisma.notification.count({
        where: { createdAt: { gte: since }, type: { in: SECURITY_TYPES } },
      }),
      prisma.notification.count({
        where: { createdAt: { gte: since }, type: 'LOGIN_FAILED' },
      }),
      prisma.notification.count({
        where: { createdAt: { gte: since }, type: 'LOGIN_SUCCESS' },
      }),
      // Senaste 24h per typ
      prisma.notification.groupBy({
        by: ['type'],
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        _count: { type: true },
      }),
    ]);

    // Aktivitet per dag (senaste N dagar)
    const dailyActivity = await prisma.$queryRaw`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "Notification"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT ${days}
    ` as Array<{ date: Date; count: bigint }>;

    res.json({
      success: true,
      data: {
        period: `${days} dagar`,
        totalEvents: totalCount,
        securityEvents: securityCount,
        failedLogins,
        successfulLogins,
        last24h: recentLogs.map(r => ({
          type: r.type,
          typeLabel: getTypeLabel(r.type),
          count: r._count.type,
        })),
        dailyActivity: dailyActivity.map(d => ({
          date: d.date,
          count: Number(d.count),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching activity log stats:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte hämta statistik',
    });
  }
});

// DELETE /api/activity-logs/cleanup
// Rensa gamla loggar (äldre än N dagar)
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const keepDays = parseInt(req.query.days as string) || 90;
    const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        // Behåll projekt-notifikationer längre
        type: { in: SECURITY_TYPES },
      },
    });

    res.json({
      success: true,
      message: `${result.count} säkerhetsloggar äldre än ${keepDays} dagar raderade`,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({
      success: false,
      error: 'Kunde inte rensa loggar',
    });
  }
});

// PUT /api/activity-logs/:id/read
// Markera logg som läst
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Kunde inte uppdatera' });
  }
});

export default router;
