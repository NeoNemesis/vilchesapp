/**
 * VILCHES ENTREPRENAD - CENTRAL PRISKONFIGURATION (Frontend)
 *
 * Speglar backend/src/config/pricing.ts
 * Alla priser och ROT-regler samlade.
 */

export type WorkCategory =
  | 'MALNING'
  | 'SNICKERI'
  | 'MURNING'
  | 'EL'
  | 'VVS'
  | 'KAKEL'
  | 'TAPETSERING'
  | 'FASADMALNING'
  | 'RIVNING'
  | 'FORBEREDELSE'
  | 'BYGG'
  | 'FINISH'
  | 'STADNING'
  | 'BILERSATTNING'
  | 'SOPHANTERING'
  | 'OVRIGT';

// Timpris inkl. moms (25%)
export const HOURLY_RATES_INCL_VAT: Record<WorkCategory, number> = {
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
  BILERSATTNING: 1875,  // 1500 exkl. moms × 1.25 = ROT-berättigad
  SOPHANTERING: 0,
  OVRIGT: 650,
};

// Timpris exkl. moms
export const HOURLY_RATES_EXCL_VAT: Record<WorkCategory, number> = {
  MALNING: 496,
  SNICKERI: 550,
  MURNING: 550,
  EL: 600,
  VVS: 560,
  KAKEL: 520,
  TAPETSERING: 496,
  FASADMALNING: 496,
  RIVNING: 520,
  FORBEREDELSE: 496,
  BYGG: 520,
  FINISH: 496,
  STADNING: 400,
  BILERSATTNING: 1500,  // Fast pris exkl. moms - ROT-berättigad
  SOPHANTERING: 0,
  OVRIGT: 520,
};

// ROT-berättigade kategorier (inkl. bilersättning och egen kategori)
export const ROT_ELIGIBLE_CATEGORIES: WorkCategory[] = [
  'MALNING',
  'SNICKERI',
  'MURNING',
  'EL',
  'VVS',
  'KAKEL',
  'TAPETSERING',
  'FASADMALNING',
  'RIVNING',
  'FORBEREDELSE',
  'BYGG',
  'FINISH',
  'BILERSATTNING',
  'OVRIGT',         // Egen kategori - ROT-berättigad
];

export const NON_ROT_CATEGORIES: WorkCategory[] = [
  'STADNING',
  'SOPHANTERING',
];

// Konstanter
export const ROT_PERCENTAGE = 0.30;
export const MAX_ROT_PER_PERSON = 50000;
export const VAT_RATE = 0.25;

// Hjälpfunktioner
export function isRotEligible(category: string): boolean {
  return ROT_ELIGIBLE_CATEGORIES.includes(category as WorkCategory);
}

export function getHourlyRate(category: string, includeVat: boolean): number {
  const cat = category as WorkCategory;
  return includeVat
    ? (HOURLY_RATES_INCL_VAT[cat] || HOURLY_RATES_INCL_VAT.OVRIGT)
    : (HOURLY_RATES_EXCL_VAT[cat] || HOURLY_RATES_EXCL_VAT.OVRIGT);
}

export const CATEGORY_LABELS: Record<WorkCategory, string> = {
  MALNING: 'Målning',
  SNICKERI: 'Snickeri',
  MURNING: 'Murning',
  EL: 'El',
  VVS: 'VVS',
  KAKEL: 'Kakel',
  TAPETSERING: 'Tapetsering',
  FASADMALNING: 'Fasadmålning',
  RIVNING: 'Rivning',
  FORBEREDELSE: 'Förberedelse',
  BYGG: 'Bygg',
  FINISH: 'Finish',
  STADNING: 'Städning',
  BILERSATTNING: 'Bilersättning',
  SOPHANTERING: 'Sophantering',
  OVRIGT: 'Övrigt',
};

// Standardenheter per kategori
export const DEFAULT_UNITS: Record<WorkCategory, string> = {
  MALNING: 'tim',
  SNICKERI: 'tim',
  MURNING: 'tim',
  EL: 'tim',
  VVS: 'tim',
  KAKEL: 'tim',
  TAPETSERING: 'tim',
  FASADMALNING: 'tim',
  RIVNING: 'tim',
  FORBEREDELSE: 'tim',
  BYGG: 'tim',
  FINISH: 'tim',
  STADNING: 'tim',
  BILERSATTNING: 'st',
  SOPHANTERING: 'st',
  OVRIGT: 'st',
};

// Vanliga enheter för dropdown
export const COMMON_UNITS = [
  { value: 'tim', label: 'Timmar' },
  { value: 'st', label: 'Styck' },
  { value: 'dag', label: 'Dagar' },
  { value: 'mil', label: 'Mil' },
  { value: 'resa', label: 'Resa' },
  { value: 'kvm', label: 'Kvadratmeter' },
  { value: 'lpm', label: 'Löpmeter' },
];

// Kategori-alternativ för dropdown
export const WORK_CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
  rotEligible: isRotEligible(value),
  defaultUnit: DEFAULT_UNITS[value as WorkCategory],
}));

// Fördefinierade arbetsbeskrivningar per kategori
export const WORK_DESCRIPTIONS: Record<WorkCategory, string[]> = {
  MALNING: [
    'Målning av väggar',
    'Målning av tak',
    'Målning av fönsterkarmar',
    'Målning av dörrar',
    'Lackering av snickerier',
    'Spackling och slipning',
    'Grundmålning',
  ],
  SNICKERI: [
    'Montering av lister',
    'Montering av garderob',
    'Bygga inredning',
    'Snickeriarbete',
    'Montering av kök',
    'Dörrmontering',
    'Fönsterbyte',
  ],
  MURNING: [
    'Murning av vägg',
    'Putsning av fasad',
    'Lagning av puts',
    'Murning av skorsten',
  ],
  EL: [
    'Elinstallation',
    'Montering av uttag',
    'Montering av belysning',
    'Eldragning',
    'Säkringscentral',
  ],
  VVS: [
    'VVS-installation',
    'Montering av handfat',
    'Montering av toalett',
    'Rördragning',
    'Blandarbyte',
  ],
  KAKEL: [
    'Kakelläggning väggar',
    'Klinkerläggning golv',
    'Fogning',
    'Borttagning av gammalt kakel',
  ],
  TAPETSERING: [
    'Tapetsering av väggar',
    'Borttagning av gammal tapet',
    'Spackling inför tapetsering',
  ],
  FASADMALNING: [
    'Fasadmålning',
    'Målning av vindskivor',
    'Målning av takfot',
    'Rengöring av fasad',
    'Skrapning av fasad',
  ],
  RIVNING: [
    'Rivning av kakel',
    'Rivning av golv',
    'Demontering av kök',
    'Demontering av badrum',
    'Borttagning av väggar',
  ],
  FORBEREDELSE: [
    'Förberedelse',
    'Skydd av golv och möbler',
    'Demontering av lister',
    'Rengöring',
  ],
  BYGG: [
    'Byggnadsarbete',
    'Montering av gipsskivor',
    'Tätskikt',
    'Isolering',
  ],
  FINISH: [
    'Finish och slutkontroll',
    'Återmontering av lister',
    'Slutstädning',
  ],
  STADNING: [
    'Byggstädning',
    'Slutstädning',
  ],
  BILERSATTNING: [
    'Bilersättning',
    'Resor till arbetsplats',
  ],
  SOPHANTERING: [
    'Sophantering',
    'Containerhyra',
    'Transport av avfall',
  ],
  OVRIGT: [
    'Övrigt arbete',
  ],
};

// Alla arbetsbeskrivningar (flat lista för autocomplete)
export const ALL_WORK_DESCRIPTIONS = Object.entries(WORK_DESCRIPTIONS).flatMap(
  ([category, descriptions]) =>
    descriptions.map(desc => ({
      category: category as WorkCategory,
      description: desc,
      hourlyRateExcl: HOURLY_RATES_EXCL_VAT[category as WorkCategory],
      hourlyRateIncl: HOURLY_RATES_INCL_VAT[category as WorkCategory],
    }))
);
