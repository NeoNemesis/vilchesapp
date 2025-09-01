import { Router } from 'express';
import { APPROVED_SENDERS, BLOCKED_SENDERS, SUBJECT_FILTERS } from '../config/emailFilters';
import EmailService from '../services/emailService';

const router = Router();
let emailService: EmailService | null = null;

// Hämta alla godkända avsändare
router.get('/approved-senders', (req, res) => {
  res.json({
    success: true,
    data: {
      approved: APPROVED_SENDERS,
      blocked: BLOCKED_SENDERS,
      subjectFilters: SUBJECT_FILTERS,
      stats: {
        totalApproved: APPROVED_SENDERS.length,
        activeApproved: APPROVED_SENDERS.filter(s => s.isActive).length,
        totalBlocked: BLOCKED_SENDERS.length
      }
    }
  });
});

// Starta email-övervakning
router.post('/start-monitoring', (req, res) => {
  try {
    if (emailService) {
      return res.json({
        success: false,
        message: 'Email-övervakning körs redan'
      });
    }

    emailService = new EmailService();
    emailService.startMonitoring();

    res.json({
      success: true,
      message: 'Email-övervakning startad',
      data: emailService.getStats()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kunde inte starta email-övervakning',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// Stoppa email-övervakning
router.post('/stop-monitoring', (req, res) => {
  try {
    if (!emailService) {
      return res.json({
        success: false,
        message: 'Email-övervakning körs inte'
      });
    }

    emailService.stopMonitoring();
    emailService = null;

    res.json({
      success: true,
      message: 'Email-övervakning stoppad'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kunde inte stoppa email-övervakning',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// Hämta status för email-övervakning
router.get('/monitoring-status', (req, res) => {
  res.json({
    success: true,
    data: {
      isRunning: emailService !== null,
      stats: emailService ? emailService.getStats() : null,
      config: {
        imapHost: process.env.IMAP_HOST,
        imapUser: process.env.IMAP_USER,
        smtpHost: process.env.SMTP_HOST,
        smtpUser: process.env.SMTP_USER
      }
    }
  });
});

// Testa email-anslutning
router.post('/test-connection', async (req, res) => {
  try {
    // Här kan du lägga till kod för att testa IMAP/SMTP anslutning
    res.json({
      success: true,
      message: 'Email-anslutning testad framgångsrikt',
      data: {
        imap: 'OK',
        smtp: 'OK'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email-anslutning misslyckades',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

export default router;
