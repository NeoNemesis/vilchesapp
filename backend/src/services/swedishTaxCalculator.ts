/**
 * Swedish Tax Calculator - Skattetabell 33, Kolumn 1 (Uppsala kommun 2026)
 *
 * Kommunalskatt Uppsala: 21.14%
 * Regionskatt Uppsala län: 11.71%
 * Total kommunalskatt: 32.85%
 * Arbetsgivaravgifter: 31.42%
 */

interface TaxResult {
  grossPay: number;         // Bruttolön
  taxDeduction: number;     // Skatteavdrag (preliminärskatt)
  netPay: number;           // Nettolön
  employerFees: number;     // Arbetsgivaravgifter
  vacationPay: number;      // Semesterersättning (ingår i bruttolön)
  totalCostEmployer: number; // Total kostnad för arbetsgivaren
}

// Skattetabell 33, kolumn 1 - Månadslön -> skatteavdrag
// Baserad på Skatteverkets tabell 33 för 2026 (Uppsala)
// Intervalllista: [maxInkomst, skatteavdrag per krona ovanför föregående]
const TAX_TABLE_33: Array<{ upTo: number; tax: number }> = [
  { upTo: 2200, tax: 0 },
  { upTo: 3400, tax: 0 },
  { upTo: 4600, tax: 0 },
  { upTo: 5800, tax: 0 },
  { upTo: 7000, tax: 0 },
  { upTo: 8200, tax: 0 },
  { upTo: 9400, tax: 0 },
  { upTo: 10600, tax: 0 },
  { upTo: 11800, tax: 44 },
  { upTo: 13000, tax: 332 },
  { upTo: 14200, tax: 676 },
  { upTo: 15400, tax: 1050 },
  { upTo: 16600, tax: 1443 },
  { upTo: 17800, tax: 1838 },
  { upTo: 19000, tax: 2232 },
  { upTo: 20200, tax: 2627 },
  { upTo: 21400, tax: 3021 },
  { upTo: 22600, tax: 3416 },
  { upTo: 23800, tax: 3810 },
  { upTo: 25000, tax: 4205 },
  { upTo: 26200, tax: 4600 },
  { upTo: 27400, tax: 4994 },
  { upTo: 28600, tax: 5389 },
  { upTo: 29800, tax: 5783 },
  { upTo: 31000, tax: 6178 },
  { upTo: 32200, tax: 6572 },
  { upTo: 33400, tax: 6967 },
  { upTo: 34600, tax: 7362 },
  { upTo: 35800, tax: 7756 },
  { upTo: 37000, tax: 8151 },
  { upTo: 38200, tax: 8545 },
  { upTo: 39400, tax: 8940 },
  { upTo: 40600, tax: 9335 },
  { upTo: 41800, tax: 9729 },
  { upTo: 43000, tax: 10124 },
  { upTo: 44200, tax: 10518 },
  { upTo: 45400, tax: 10913 },
  { upTo: 46600, tax: 11308 },
  { upTo: 47800, tax: 11702 },
  { upTo: 49000, tax: 12097 },
  { upTo: 50200, tax: 12491 },
  { upTo: 51400, tax: 12886 },
  { upTo: 52600, tax: 13281 },
  { upTo: 53800, tax: 13675 },
  { upTo: 55000, tax: 14070 },
  { upTo: 57600, tax: 14924 },
  { upTo: 60200, tax: 15778 },
  { upTo: 62800, tax: 16632 },
  { upTo: 65400, tax: 17486 },
  { upTo: 68000, tax: 18340 },
  { upTo: Infinity, tax: -1 }, // Markör: beräkna med procentsats
];

const KOMMUNALSKATT = 0.3285; // 32.85% (kommun + region)
const STATLIG_SKATT = 0.20;   // 20% statlig inkomstskatt över brytpunkt
const BRYTPUNKT_ARSINKOMST = 615700; // Skiktgräns 2026 (uppskattning)
const BRYTPUNKT_MANAD = BRYTPUNKT_ARSINKOMST / 12;
const ARBETSGIVARAVGIFT = 0.3142; // 31.42%

/**
 * Beräkna preliminärskatt baserat på månadslön
 * Använder skattetabell 33 (Uppsala) kolumn 1
 */
function calculateMonthlyTax(monthlyGross: number): number {
  if (monthlyGross <= 0) return 0;

  // Hitta rätt intervall i skattetabellen
  for (const bracket of TAX_TABLE_33) {
    if (monthlyGross <= bracket.upTo) {
      return bracket.tax;
    }
  }

  // Över högsta intervallet: kommunalskatt + statlig skatt
  const baseTax = monthlyGross * KOMMUNALSKATT;
  const overBreakpoint = Math.max(0, monthlyGross - BRYTPUNKT_MANAD);
  return Math.round(baseTax + overBreakpoint * STATLIG_SKATT);
}

/**
 * Beräkna lön från timrapport
 *
 * @param totalHours - Totalt antal arbetade timmar
 * @param hourlyRate - Timlön i SEK
 * @param vacationPayPercent - Semesterersättning i % (t.ex. 12)
 */
export function calculateSalary(
  totalHours: number,
  hourlyRate: number,
  vacationPayPercent: number = 12
): TaxResult {
  // Grundlön
  const basePay = totalHours * hourlyRate;

  // Semesterersättning
  const vacationPay = basePay * (vacationPayPercent / 100);

  // Bruttolön = grundlön + semesterersättning
  const grossPay = basePay + vacationPay;

  // Uppskatta månadslön för skattetabell-lookup
  // Veckorapport -> uppskattat till månadslön (faktor ~4.33)
  const estimatedMonthly = grossPay * 4.33;

  // Beräkna skatt
  const monthlyTax = calculateMonthlyTax(estimatedMonthly);

  // Proportionera skatten till denna periods bruttolön
  const taxDeduction = Math.round((monthlyTax / estimatedMonthly) * grossPay);

  // Nettolön
  const netPay = grossPay - taxDeduction;

  // Arbetsgivaravgifter
  const employerFees = Math.round(grossPay * ARBETSGIVARAVGIFT);

  // Total kostnad för arbetsgivaren
  const totalCostEmployer = grossPay + employerFees;

  return {
    grossPay: Math.round(grossPay),
    taxDeduction: Math.max(0, taxDeduction),
    netPay: Math.round(Math.max(0, netPay)),
    employerFees,
    vacationPay: Math.round(vacationPay),
    totalCostEmployer: Math.round(totalCostEmployer),
  };
}
