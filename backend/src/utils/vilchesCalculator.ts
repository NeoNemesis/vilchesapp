/**
 * VilchesApp - BYGGKOSTNADSKALKYLATOR
 *
 * Beräkningslogik för VilchesApp
 * Kategorier: Altan, Inomhusmålning, Fasadmålning
 */

// ROT-avdrag konstanter
export const ROT_PERCENTAGE = 0.30;  // 30% ordinarie ROT-avdrag
export const MAX_ROT_PER_PERSON = 50000;

// ============================================
// 1. ALTAN BERÄKNING
// ============================================

export interface AltanResult {
  category: string;
  squareMeters: number;
  materialType: string;
  baseCost: number;
  materialFactor: number;
  totalCost: number;
  materialCost: number;
  laborCost: number;
  rotDeduction: number;
  finalCost: number;
}

const ALTAN_MATERIALS: Record<string, number> = {
  'Tryckimpregnerat 28x120': 1.2,
  'Tryckimpregnerat 34x145': 1.3,
  'Kärnfuru': 1.4,
  'Ädelträ': 1.5,
  'Träkomposit': 1.3
};

export function calculateAltanCost(squareMeters: number, materialType: string = 'Tryckimpregnerat 28x120'): AltanResult {
  // Baspris beräkning
  let baseCost: number;
  if (squareMeters <= 25) {
    baseCost = 40000;
  } else {
    baseCost = 40000 + ((squareMeters - 25) * 1600);
  }

  // Materialfaktor
  const materialFactor = ALTAN_MATERIALS[materialType] || 1.2;
  const totalCost = baseCost * materialFactor;

  // Kostnadsfördelning (uppskattning)
  const materialCost = totalCost * 0.3;  // 30% material
  const laborCost = totalCost * 0.7;     // 70% arbete

  // ROT-avdrag (50% av totalkostnad för altan)
  const rotDeduction = Math.min(totalCost * ROT_PERCENTAGE, MAX_ROT_PER_PERSON);
  const finalCost = totalCost - rotDeduction;

  return {
    category: 'ALTAN',
    squareMeters,
    materialType,
    baseCost,
    materialFactor,
    totalCost,
    materialCost,
    laborCost,
    rotDeduction,
    finalCost
  };
}

// ============================================
// 2. INOMHUSMÅLNING BERÄKNING
// ============================================

export interface InomhusmålningResult {
  category: string;
  squareMeters: number;
  omfattning: string;
  totalCost: number;
  materialCost: number;
  laborCost: number;
  rotDeduction: number;
  finalCost: number;
}

const INOMHUSMALNING_PRICES: Record<string, Array<{sqm: number, price: number}>> = {
  'Nej': [
    { sqm: 10, price: 25000 },
    { sqm: 70, price: 56000 },
    { sqm: 100, price: 80000 },
    { sqm: 150, price: 96000 }
  ],
  'Små': [
    { sqm: 10, price: 32000 },
    { sqm: 70, price: 70000 },
    { sqm: 100, price: 100000 },
    { sqm: 150, price: 120000 }
  ],
  'Medel': [
    { sqm: 10, price: 46000 },
    { sqm: 70, price: 80000 },
    { sqm: 100, price: 120000 },
    { sqm: 150, price: 140000 }
  ],
  'Stora': [
    { sqm: 10, price: 62000 },
    { sqm: 70, price: 90000 },
    { sqm: 100, price: 140000 },
    { sqm: 150, price: 160000 }
  ]
};

export function calculateInomhusmålningCost(squareMeters: number, omfattning: string = 'Nej'): InomhusmålningResult {
  const pricePoints = INOMHUSMALNING_PRICES[omfattning];

  if (!pricePoints) {
    throw new Error(`Ogiltig omfattning: ${omfattning}`);
  }

  let totalCost: number = 0;

  // Interpolera mellan prisintervall
  if (squareMeters <= pricePoints[0].sqm) {
    totalCost = pricePoints[0].price;
  } else if (squareMeters >= pricePoints[pricePoints.length - 1].sqm) {
    // Extrapolera för större ytor
    const lastTwo = pricePoints.slice(-2);
    const sqmDiff = lastTwo[1].sqm - lastTwo[0].sqm;
    const priceDiff = lastTwo[1].price - lastTwo[0].price;
    const pricePerSqm = priceDiff / sqmDiff;
    totalCost = lastTwo[1].price + ((squareMeters - lastTwo[1].sqm) * pricePerSqm);
  } else {
    // Interpolera mellan två punkter
    let found = false;
    for (let i = 0; i < pricePoints.length - 1; i++) {
      if (squareMeters >= pricePoints[i].sqm && squareMeters <= pricePoints[i + 1].sqm) {
        const sqmDiff = pricePoints[i + 1].sqm - pricePoints[i].sqm;
        const priceDiff = pricePoints[i + 1].price - pricePoints[i].price;
        const ratio = (squareMeters - pricePoints[i].sqm) / sqmDiff;
        totalCost = pricePoints[i].price + (priceDiff * ratio);
        found = true;
        break;
      }
    }
    // Fallback om inget intervall matchade (borde inte hända)
    if (!found) {
      totalCost = pricePoints[0].price;
    }
  }

  // Kostnadsfördelning
  const materialCost = totalCost * 0.12;  // 12% material
  const laborCost = totalCost * 0.88;     // 88% arbete

  // ROT-avdrag (50% av arbetskostnad)
  const rotDeduction = Math.min(laborCost * ROT_PERCENTAGE, MAX_ROT_PER_PERSON);
  const finalCost = totalCost - rotDeduction;

  return {
    category: 'INOMHUSMÅLNING',
    squareMeters,
    omfattning,
    totalCost,
    materialCost,
    laborCost,
    rotDeduction,
    finalCost
  };
}

// ============================================
// 3. FASADMÅLNING BERÄKNING
// ============================================

export interface FasadmålningResult {
  category: string;
  squareMeters: number;
  materialType: string;
  floorCount: number;
  baseCost: number;
  materialFactor: number;
  floorFactor: number;
  totalCost: number;
  materialCost: number;
  laborCost: number;
  litersNeeded: number;
  rotDeduction: number;
  finalCost: number;
}

interface FasadMaterial {
  factor: number;
  pricePerLiter: number;
  coverage: number;
}

const FASAD_MATERIALS: Record<string, FasadMaterial> = {
  'Alkyd/Akrylat': { factor: 1.0, pricePerLiter: 300, coverage: 7 },
  'Linoljefärg': { factor: 1.2, pricePerLiter: 450, coverage: 8 },
  'Slamfärg': { factor: 0.8, pricePerLiter: 150, coverage: 5 }
};

const FASAD_BASE_COST = 11327.25;
const FASAD_COST_PER_SQM = 498.33;

export function calculateFasadmålningCost(
  squareMeters: number,
  materialType: string = 'Alkyd/Akrylat',
  floorCount: number = 1
): FasadmålningResult {
  const material = FASAD_MATERIALS[materialType];

  if (!material) {
    throw new Error(`Ogiltigt material: ${materialType}`);
  }

  // Basuträkning
  let baseCost = FASAD_BASE_COST + (squareMeters * FASAD_COST_PER_SQM);

  // Storleksjusteringar
  if (squareMeters <= 50) {
    baseCost -= 100;
  } else if (squareMeters <= 100) {
    baseCost -= 50;
  } else if (squareMeters > 200) {
    baseCost += 50;
  }

  // Materialfaktor
  baseCost *= material.factor;

  // Våningsfaktor
  const floorFactor = floorCount > 1 ? 1.3 : 1.0;
  const totalCost = baseCost * floorFactor;

  // Materialkostnad
  const litersNeeded = squareMeters / material.coverage;
  const materialCost = litersNeeded * material.pricePerLiter;
  const laborCost = totalCost - materialCost;

  // ROT-avdrag (50% av arbetskostnad)
  const rotDeduction = Math.min(laborCost * ROT_PERCENTAGE, MAX_ROT_PER_PERSON);
  const finalCost = totalCost - rotDeduction;

  return {
    category: 'FASADMÅLNING',
    squareMeters,
    materialType,
    floorCount,
    baseCost,
    materialFactor: material.factor,
    floorFactor,
    totalCost,
    materialCost,
    laborCost,
    litersNeeded: Math.ceil(litersNeeded),
    rotDeduction,
    finalCost
  };
}

// ============================================
// HJÄLPFUNKTIONER
// ============================================

export function formatMoney(amount: number): string {
  return Math.round(amount).toLocaleString('sv-SE');
}

export function generateCalculationDescription(result: any): string {
  let desc = '';

  switch (result.category) {
    case 'ALTAN':
      desc = `Altan ${result.squareMeters} kvm med ${result.materialType}\n`;
      desc += `Baspris: ${formatMoney(result.baseCost)} kr\n`;
      desc += `Materialfaktor: ×${result.materialFactor}\n`;
      desc += `Material: ${formatMoney(result.materialCost)} kr\n`;
      desc += `Arbete: ${formatMoney(result.laborCost)} kr\n`;
      break;

    case 'INOMHUSMÅLNING':
      desc = `Inomhusmålning ${result.squareMeters} kvm\n`;
      desc += `Reparationsomfattning: ${result.omfattning}\n`;
      desc += `Material (12%): ${formatMoney(result.materialCost)} kr\n`;
      desc += `Arbete (88%): ${formatMoney(result.laborCost)} kr\n`;
      break;

    case 'FASADMÅLNING':
      desc = `Fasadmålning ${result.squareMeters} kvm\n`;
      desc += `Färgtyp: ${result.materialType}\n`;
      desc += `Våningar: ${result.floorCount}\n`;
      desc += `Färgmängd: ca ${result.litersNeeded} liter\n`;
      desc += `Material: ${formatMoney(result.materialCost)} kr\n`;
      desc += `Arbete: ${formatMoney(result.laborCost)} kr\n`;
      break;
  }

  desc += `\nTotalkostnad: ${formatMoney(result.totalCost)} kr\n`;
  desc += `ROT-avdrag (30%): -${formatMoney(result.rotDeduction)} kr\n`;
  desc += `Att betala: ${formatMoney(result.finalCost)} kr`;

  return desc;
}
