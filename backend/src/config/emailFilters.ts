// Email Filter Konfiguration
// Här bestämmer du vilka avsändare systemet ska lyssna på

export interface EmailSender {
  email: string;
  name: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isActive: boolean;
  autoAssign?: boolean; // Om projektet automatiskt ska tilldelas någon
  assignToEmail?: string; // Email till den som ska få projektet
}

// LISTA ÖVER GODKÄNDA AVSÄNDARE
// Lägg till/ta bort avsändare här som systemet ska lyssna på
export const APPROVED_SENDERS: EmailSender[] = [
  
  // === HEMSIDA & KONTAKTFORMULÄR ===
  {
    email: 'noreply@vilchesab.se',
    name: 'Hemsida Kontaktformulär',
    description: 'Förfrågningar från företagets hemsida',
    priority: 'NORMAL',
    isActive: true,
    autoAssign: false
  },
  
  // === STÖRRE LEVERANTÖRER/BYGGFÖRETAG ===
  {
    email: '@exempel.se',
    name: 'exempel',
    description: 'Service och reparationsuppdrag från Byggmax',
    priority: 'HIGH',
    isActive: true,
    autoAssign: false
  },
  {
    email: '@exempel.se',
    name: 'exempel',
    description: 'Service och reparationsuppdrag från Hornbach',
    priority: 'HIGH',
    isActive: true,
    autoAssign: false
  },
  {
    email: '@exempel.se',
    name: 'exempel',
    description: 'Service och reparationsuppdrag från Bauhaus',
    priority: 'HIGH',
    isActive: true,
    autoAssign: false
  },
  
  // === FASTIGHETSBOLAG ===
  {
    email: '@sbab.se',
    name: 'SBAB Fastigheter',
    description: 'Fastighetsunderhåll från SBAB',
    priority: 'NORMAL',
    isActive: true,
    autoAssign: false
  },
  {
    email: '@svenskfast.se',
    name: 'Svensk Fastighetsförmedling',
    description: 'Besiktningar och reparationer',
    priority: 'NORMAL',
    isActive: true,
    autoAssign: false
  },
  
  // === FÖRSÄKRINGSBOLAG ===
  {
    email: '@if.se',
    name: 'If Försäkring',
    description: 'Skadereglering och reparationer',
    priority: 'HIGH',
    isActive: true,
    autoAssign: false
  },
  {
    email: '@folksam.se',
    name: 'Folksam',
    description: 'Skadereglering och reparationer',
    priority: 'HIGH',
    isActive: true,
    autoAssign: false
  },
  {
    email: '@trygg-hansa.se',
    name: 'Trygg Hansa',
    description: 'Skadereglering och reparationer',
    priority: 'HIGH',
    isActive: true,
    autoAssign: false
  },
  
  // === KOMMUNER ===
  {
    email: '@stockholm.se',
    name: 'Stockholms Stad',
    description: 'Kommunala uppdrag och underhåll',
    priority: 'NORMAL',
    isActive: true,
    autoAssign: false
  },
  
  // === SPECIFIKA KUNDER ===
  // Lägg till dina återkommande kunder här
  {
    email: 'info@exempelkund.se',
    name: 'Exempel Kund AB',
    description: 'Återkommande kund med servicekontrakt',
    priority: 'HIGH',
    isActive: false, // Sätt till true när du vill aktivera
    autoAssign: true,
    assignToEmail: 'johan@vilchesab.se' // Exempel på automatisk tilldelning
  },
  
  // === AKUTA ÄRENDEN ===
  // Emails som alltid ska prioriteras högt
  {
    email: 'mafalda.martins@adapteo.com',
    name: 'Mafalda Martins',
    description: 'Service och reparationsuppdrag från Adapteo inom 24h',
    priority: 'URGENT',
    isActive: true,
    autoAssign: false
  },
  {
    email: 'angelo.fica@adapteo.com',
    name: 'Angelo Fica',
    description: 'Service och reparationsuppdrag från Adapteo inom 24h',
    priority: 'URGENT',
    isActive: true,
    autoAssign: false
  }
];

// ÄMNES-FILTER
// Vissa ämnesrader som alltid ska skapas som projekt
export const SUBJECT_FILTERS = [
  {
    keyword: 'AKUT',
    priority: 'URGENT' as const,
    description: 'Akut reparation eller service'
  },
  {
    keyword: 'BRÅDSKANDE',
    priority: 'URGENT' as const,
    description: 'Brådskande ärende'
  },
  {
    keyword: 'LÄCKAGE',
    priority: 'URGENT' as const,
    description: 'Vattenläckage'
  },
  {
    keyword: 'ELFEL',
    priority: 'HIGH' as const,
    description: 'Elektriskt fel'
  },
  {
    keyword: 'SERVICE',
    priority: 'NORMAL' as const,
    description: 'Serviceförfrågan'
  },
  {
    keyword: 'OFFERT',
    priority: 'LOW' as const,
    description: 'Offertförfrågan'
  }
];

// BLOCKERADE AVSÄNDARE
// Emails som ALDRIG ska skapas som projekt
export const BLOCKED_SENDERS = [
  '@spam.com',
  '@marketing.com',
  'noreply@',
  'no-reply@',
  '@newsletter.',
  '@reklam.'
];

// Hjälpfunktion för att kolla om en avsändare är godkänd
export function isApprovedSender(fromEmail: string): EmailSender | null {
  const email = fromEmail.toLowerCase();
  
  // Kolla först om avsändaren är blockerad
  for (const blocked of BLOCKED_SENDERS) {
    if (email.includes(blocked.toLowerCase())) {
      return null;
    }
  }
  
  // Kolla om avsändaren finns i godkända listan och är aktiv
  for (const sender of APPROVED_SENDERS) {
    if (!sender.isActive) continue;
    
    const senderEmail = sender.email.toLowerCase();
    
    // Om det börjar med @ så matcha domän
    if (senderEmail.startsWith('@')) {
      if (email.includes(senderEmail)) {
        return sender;
      }
    } 
    // Annars exakt matchning eller innehåller
    else if (email.includes(senderEmail)) {
      return sender;
    }
  }
  
  return null;
}

// Hjälpfunktion för att kolla ämnesfilter
export function checkSubjectFilters(subject: string): typeof SUBJECT_FILTERS[0] | null {
  const subjectUpper = subject.toUpperCase();
  
  for (const filter of SUBJECT_FILTERS) {
    if (subjectUpper.includes(filter.keyword)) {
      return filter;
    }
  }
  
  return null;
}
