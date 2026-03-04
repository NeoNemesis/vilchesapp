/**
 * VilchesApp - CENTRAL PRISKONFIGURATION
 *
 * Alla priser och ROT-regler samlade på ett ställe.
 * Uppdatera här när priser ändras.
 */

// ===========================================
// ARBETSKATEGORIER
// ===========================================

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

// ===========================================
// TIMPRIS (inkl. moms 25%)
// ===========================================

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
  SOPHANTERING: 0,      // Fast pris, varierar per projekt
  OVRIGT: 650,
};

// ===========================================
// TIMPRIS (exkl. moms)
// ===========================================

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

// ===========================================
// ROT-BERÄTTIGADE KATEGORIER
// ===========================================

/**
 * Enligt Skatteverket får ROT-avdrag endast göras på arbetskostnad
 * för reparation, underhåll, om- och tillbyggnad av bostäder.
 *
 * ROT-berättigat:
 * - Arbetskostnad för hantverkare
 * - Bilersättning (ingår i arbetskostnad)
 *
 * EJ ROT-berättigat:
 * - Material
 * - Sophantering/avfallshantering
 * - Städning (gäller RUT istället)
 * - Nybyggnation
 */
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
  'STADNING',       // RUT-berättigad istället
  'SOPHANTERING',
];

// ===========================================
// ROT-KONSTANTER
// ===========================================

export const ROT_PERCENTAGE = 0.30;           // 30% avdrag
export const MAX_ROT_PER_PERSON = 50000;      // Max 50 000 kr/person/år

// ===========================================
// MOMS
// ===========================================

export const VAT_RATE = 0.25;                 // 25% moms

// ===========================================
// HJÄLPFUNKTIONER
// ===========================================

/**
 * Kolla om en kategori är ROT-berättigad
 */
export function isRotEligible(category: WorkCategory | string): boolean {
  return ROT_ELIGIBLE_CATEGORIES.includes(category as WorkCategory);
}

/**
 * Hämta timpris baserat på kategori och moms-inställning
 */
export function getHourlyRate(category: WorkCategory | string, includeVat: boolean): number {
  const cat = category as WorkCategory;
  return includeVat
    ? (HOURLY_RATES_INCL_VAT[cat] || HOURLY_RATES_INCL_VAT.OVRIGT)
    : (HOURLY_RATES_EXCL_VAT[cat] || HOURLY_RATES_EXCL_VAT.OVRIGT);
}

/**
 * Beräkna ROT-avdrag för en lista av arbetsmoment
 * ROT beräknas på arbetskostnad INKL. moms (svensk lag)
 */
export function calculateRotDeduction(
  lineItems: Array<{
    category: string;
    totalCost: number;
    hourlyRate?: number;
    estimatedHours?: number;
  }>,
  includeVat: boolean
): number {
  // Summera endast ROT-berättigade poster
  const rotEligibleCost = lineItems
    .filter(item => isRotEligible(item.category))
    .reduce((sum, item) => {
      const cost = item.totalCost || (item.estimatedHours || 0) * (item.hourlyRate || 0);
      return sum + cost;
    }, 0);

  // Om exkl. moms, lägg till moms för ROT-beräkning
  const costForRot = includeVat
    ? rotEligibleCost
    : rotEligibleCost * (1 + VAT_RATE);

  // ROT = 30% av arbetskostnad inkl. moms, max 50 000 kr
  return Math.min(costForRot * ROT_PERCENTAGE, MAX_ROT_PER_PERSON);
}

/**
 * Kategori-etiketter för UI
 */
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

/**
 * Timpris-lista för PDF (tilläggsbeställningar)
 */
export function getHourlyRatesForPdf(includeVat: boolean) {
  const rates = includeVat ? HOURLY_RATES_INCL_VAT : HOURLY_RATES_EXCL_VAT;
  return [
    { role: 'Timkostnad för målare', rate: rates.MALNING, rotEligible: true },
    { role: 'Timkostnad för snickare', rate: rates.SNICKERI, rotEligible: true },
    { role: 'Timkostnad för murare', rate: rates.MURNING, rotEligible: true },
    { role: 'Timkostnad för elektriker', rate: rates.EL, rotEligible: true },
  ];
}
