import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { PrismaClient } from '@prisma/client';
import { 
  isApprovedSender, 
  checkSubjectFilters, 
  EmailSender,
  APPROVED_SENDERS 
} from '../config/emailFilters';

const prisma = new PrismaClient();

class EmailService {
  private imap: Imap;
  private isConnected = false;

  constructor() {
    this.imap = new Imap({
      user: process.env.IMAP_USER!,
      password: process.env.IMAP_PASS!,
      host: process.env.IMAP_HOST!,
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: process.env.IMAP_TLS === 'true',
      authTimeout: 3000,
      connTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.imap.once('ready', () => {
      console.log('📧 IMAP anslutning klar - lyssnar på emails...');
      this.isConnected = true;
      this.openInbox();
    });

    this.imap.once('error', (err: Error) => {
      console.error('❌ IMAP fel:', err);
      this.isConnected = false;
    });

    this.imap.once('end', () => {
      console.log('📧 IMAP anslutning stängd');
      this.isConnected = false;
    });
  }

  // Starta email-övervakning
  public startMonitoring() {
    console.log('🔍 Startar email-övervakning...');
    this.imap.connect();
  }

  private openInbox() {
    this.imap.openBox('INBOX', false, (err: Error | null, box: any) => {
      if (err) {
        console.error('❌ Kunde inte öppna inbox:', err);
        return;
      }

      console.log(`📬 Inbox öppnad - ${box.messages.total} meddelanden totalt`);
      
      // Lyssna på nya emails
      this.imap.on('mail', (numNewMsgs: number) => {
        console.log(`📨 ${numNewMsgs} nya email(s) mottagna!`);
        this.processNewEmails();
      });

      // Bearbeta befintliga olästa emails vid start
      this.processNewEmails();
    });
  }

  private processNewEmails() {
    // Sök efter olästa emails
    this.imap.search(['UNSEEN'], (err: Error | null, results: number[]) => {
      if (err) {
        console.error('❌ Fel vid sökning av emails:', err);
        return;
      }

      if (!results || results.length === 0) {
        console.log('📭 Inga nya emails att bearbeta');
        return;
      }

      console.log(`🔍 Bearbetar ${results.length} nya email(s)...`);

      const fetch = this.imap.fetch(results, {
        bodies: '',
        markSeen: false // Låt dem vara olästa tills vi bestämt om de ska bli projekt
      });

      fetch.on('message', (msg: any, seqno: number) => {
        console.log(`📖 Läser email #${seqno}...`);
        
        msg.on('body', (stream: any) => {
          simpleParser(stream as any, async (err: Error | null, parsed: ParsedMail) => {
            if (err) {
              console.error('❌ Fel vid parsing av email:', err);
              return;
            }

            await this.processEmail(parsed, seqno);
          });
        });
      });

      fetch.once('error', (err: Error) => {
        console.error('❌ Fel vid hämtning av emails:', err);
      });
    });
  }

  private async processEmail(email: ParsedMail, seqno: number) {
    try {
      const fromEmail = email.from?.text || '';
      console.log(`\n📧 Bearbetar email från: ${fromEmail}`);
      console.log(`📝 Ämne: ${email.subject}`);

      // Kolla om avsändaren är godkänd
      const approvedSender = isApprovedSender(fromEmail);
      
      // Kolla även ämnesfilter
      const subjectFilter = checkSubjectFilters(email.subject || '');

      if (approvedSender || subjectFilter) {
        const matchInfo = approvedSender || subjectFilter;
        console.log(`✅ Email godkänd: ${approvedSender?.description || subjectFilter?.description}`);
        
        // Bestäm prioritet (ämnesfilter kan överstiga avsändare-prioritet)
        const priority = subjectFilter?.priority || approvedSender?.priority || 'NORMAL';
        
        // Skapa projekt från emailet
        const project = await this.createProjectFromEmail(email, {
          sender: approvedSender,
          priority,
          description: approvedSender?.description || subjectFilter?.description || 'Email-projekt'
        });
        
        if (project) {
          console.log(`🎯 Projekt skapat: ${project.projectNumber}`);
          console.log(`📊 Prioritet: ${priority}`);
          
          // Auto-tilldela om konfigurerat
          if (approvedSender?.autoAssign && approvedSender.assignToEmail) {
            await this.autoAssignProject(project.id, approvedSender.assignToEmail);
          }
          
          // Markera emailet som läst
          this.imap.addFlags(seqno, ['\\Seen'], (err: Error | null) => {
            if (err) console.error('❌ Kunde inte markera email som läst:', err);
          });
        }
      } else {
        console.log(`❌ Email från ${fromEmail} är INTE godkänd - ignoreras`);
        console.log(`📋 Godkända avsändare: ${APPROVED_SENDERS.filter(s => s.isActive).map(s => s.email).join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Fel vid bearbetning av email:', error);
    }
  }

  private async createProjectFromEmail(email: ParsedMail, matchInfo: any) {
    try {
      // Extrahera kund-information från emailet
      const fromEmail = email.from?.text || '';
      const clientEmail = this.extractEmail(fromEmail);
      const clientName = this.extractName(fromEmail) || 'Okänd kund';

      // Skapa projekt i databasen
      const project = await prisma.project.create({
        data: {
          title: email.subject || 'Nytt projekt',
          description: email.text || email.html || 'Ingen beskrivning',
          address: this.extractAddress(email.text || '') || 'Adress ej angiven',
          clientName,
          clientEmail,
          clientPhone: this.extractPhone(email.text || ''),
          priority: matchInfo.priority,
          status: 'PENDING',
          originalEmail: JSON.stringify({
            from: email.from,
            to: email.to,
            subject: email.subject,
            date: email.date,
            text: email.text,
            html: email.html
          }),
          createdBy: {
            connect: { email: process.env.COMPANY_EMAIL! }
          }
        }
      });

      // Skicka notifiering till dig om nytt projekt
      await this.sendNewProjectNotification(project);

      return project;

    } catch (error) {
      console.error('❌ Fel vid skapande av projekt:', error);
      return null;
    }
  }

  // Hjälpfunktioner för att extrahera information
  private extractEmail(fromText: string): string {
    const emailMatch = fromText.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    return emailMatch ? emailMatch[0] : '';
  }

  private extractName(fromText: string): string {
    // Ta bort email och rensa namn
    const name = fromText.replace(/[\w\.-]+@[\w\.-]+\.\w+/, '').replace(/[<>]/g, '').trim();
    return name || 'Okänd';
  }

  private extractAddress(text: string): string | null {
    // Enkel regex för att hitta adresser (kan förbättras)
    const addressPatterns = [
      /(\w+\s+\d+[a-zA-Z]?,?\s*\d{3}\s?\d{2}\s+\w+)/g, // Svensk adress
      /adress[:\s]+([^\n\r]+)/gi,
      /address[:\s]+([^\n\r]+)/gi
    ];

    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1]?.trim() || match[0]?.trim();
      }
    }

    return null;
  }

  private extractPhone(text: string): string | null {
    // Hitta telefonnummer
    const phoneMatch = text.match(/(\+46|0)[\s-]?\d{2,3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
    return phoneMatch ? phoneMatch[0].replace(/\s|-/g, '') : null;
  }

  private async autoAssignProject(projectId: string, assignToEmail: string) {
    try {
      // Hitta användaren att tilldela till
      const assignee = await prisma.user.findUnique({
        where: { email: assignToEmail }
      });

      if (assignee) {
        await prisma.project.update({
          where: { id: projectId },
          data: {
            assignedToId: assignee.id,
            status: 'ASSIGNED'
          }
        });
        
        console.log(`👤 Projekt automatiskt tilldelat till: ${assignee.name}`);
        
        // Skicka email till tilldelad person
        await this.sendAssignmentEmail(assignee.email, projectId);
      }
    } catch (error) {
      console.error('❌ Fel vid auto-tilldelning:', error);
    }
  }

  private async sendAssignmentEmail(email: string, projectId: string) {
    // Här implementeras email-sändning till tilldelad person
    console.log(`📧 Skickar tilldelnings-email till: ${email}`);
  }

  private async sendNewProjectNotification(project: any) {
    // Här kan du lägga till kod för att skicka email till dig om nytt projekt
    console.log(`📨 Nytt projekt notifiering: ${project.title}`);
  }

  // Hämta statistik över email-bearbetning
  public getStats() {
    return {
      isConnected: this.isConnected,
      approvedSenders: APPROVED_SENDERS.filter(s => s.isActive).length,
      totalSenders: APPROVED_SENDERS.length
    };
  }

  // Stoppa email-övervakning
  public stopMonitoring() {
    if (this.isConnected) {
      this.imap.end();
    }
  }
}

export default EmailService;
