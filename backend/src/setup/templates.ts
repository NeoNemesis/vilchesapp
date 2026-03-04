/**
 * Industry Templates for VilchesApp Setup Wizard
 *
 * Each template pre-configures categories, pricing, and features
 * based on the selected industry.
 */

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  features: {
    enableQuotes: boolean;
    enableTimeReports: boolean;
    enableRotDeduction: boolean;
    enableRutDeduction: boolean;
    enableMapView: boolean;
  };
  pricing: Record<string, number>;
  categories: string[];
}

export const industryTemplates: Record<string, IndustryTemplate> = {
  'bygg': {
    id: 'bygg',
    name: 'Bygg & Renovering',
    description: 'Byggföretag, renovering, snickeri, måleri',
    features: {
      enableQuotes: true,
      enableTimeReports: true,
      enableRotDeduction: true,
      enableRutDeduction: false,
      enableMapView: true,
    },
    pricing: {
      MALNING: 620,
      SNICKERI: 688,
      MURNING: 688,
      EL: 750,
      VVS: 700,
      KAKEL: 650,
      TAPETSERING: 620,
      FASADMALNING: 620,
      RIVNING: 650,
      FORBEREDELSE: 620,
      BYGG: 650,
      FINISH: 620,
      STADNING: 500,
      BILERSATTNING: 1875,
      OVRIGT: 650,
    },
    categories: [
      'Målning', 'Snickeri', 'Murning', 'El', 'VVS',
      'Kakel', 'Tapetsering', 'Fasadmålning', 'Rivning',
      'Förberedelse', 'Bygg', 'Finish', 'Städning', 'Övrigt',
    ],
  },

  'stad': {
    id: 'stad',
    name: 'Städ & Facility Management',
    description: 'Städföretag, fastighetsskötsel, facility management',
    features: {
      enableQuotes: true,
      enableTimeReports: true,
      enableRotDeduction: false,
      enableRutDeduction: true,
      enableMapView: true,
    },
    pricing: {
      KONTORSSTAD: 450,
      HEMSTAD: 400,
      STORSTADNING: 500,
      FLYTTSTAD: 550,
      FONSTERPUTS: 500,
      GOLVVARD: 480,
      TRAPPSTAD: 420,
      OVRIGT: 450,
    },
    categories: [
      'Kontorsstäd', 'Hemstäd', 'Storstädning', 'Flyttstäd',
      'Fönsterputs', 'Golvvård', 'Trappstäd', 'Övrigt',
    ],
  },

  'el-vvs': {
    id: 'el-vvs',
    name: 'El & VVS',
    description: 'Elektriker, rörmokare, VVS-installatörer',
    features: {
      enableQuotes: true,
      enableTimeReports: true,
      enableRotDeduction: true,
      enableRutDeduction: false,
      enableMapView: true,
    },
    pricing: {
      EL_INSTALLATION: 750,
      EL_SERVICE: 700,
      VVS_INSTALLATION: 750,
      VVS_SERVICE: 700,
      VARMEPUMP: 800,
      GOLVVARME: 700,
      RORARBETE: 700,
      FELSOK: 800,
      OVRIGT: 700,
    },
    categories: [
      'El-installation', 'El-service', 'VVS-installation', 'VVS-service',
      'Värmepump', 'Golvvärme', 'Rörarbete', 'Felsökning', 'Övrigt',
    ],
  },

  'konsult': {
    id: 'konsult',
    name: 'Konsult & Projektering',
    description: 'Konsultföretag, projektering, besiktning, rådgivning',
    features: {
      enableQuotes: true,
      enableTimeReports: true,
      enableRotDeduction: false,
      enableRutDeduction: false,
      enableMapView: false,
    },
    pricing: {
      RADGIVNING: 1200,
      PROJEKTERING: 1100,
      BESIKTNING: 1000,
      UTREDNING: 1100,
      UTBILDNING: 900,
      OVRIGT: 1000,
    },
    categories: [
      'Rådgivning', 'Projektering', 'Besiktning',
      'Utredning', 'Utbildning', 'Övrigt',
    ],
  },

  'general': {
    id: 'general',
    name: 'Anpassad / Övrigt',
    description: 'Generell konfiguration — anpassa allt själv',
    features: {
      enableQuotes: true,
      enableTimeReports: true,
      enableRotDeduction: false,
      enableRutDeduction: false,
      enableMapView: false,
    },
    pricing: {
      ARBETE: 650,
      OVRIGT: 650,
    },
    categories: [
      'Arbete', 'Övrigt',
    ],
  },
};

export function getTemplate(industry: string): IndustryTemplate {
  return industryTemplates[industry] || industryTemplates['general'];
}

export function getAllTemplates(): IndustryTemplate[] {
  return Object.values(industryTemplates);
}
