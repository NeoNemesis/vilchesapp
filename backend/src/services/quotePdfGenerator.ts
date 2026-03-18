// @ts-nocheck
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import {
  calculateAltanCost,
  calculateInomhusmålningCost,
  calculateFasadmålningCost
} from '../utils/vilchesCalculator';
import {
  getHourlyRatesForPdf,
  isRotEligible,
  ROT_PERCENTAGE,
  MAX_ROT_PER_PERSON,
  VAT_RATE,
} from '../config/pricing';

/**
 * VILCHES ENTREPRENAD - PDF-GENERATOR FÖR OFFERTER
 *
 * Genererar offerter enligt Vilches officiella mall
 * Med dynamisk sidbrytning för att undvika tomma sidor
 */

// A4 dimensions: 595.28 x 841.89 points
const PAGE_MARGIN = 50;
const PAGE_BOTTOM = 710; // Lämna plats för footer (börjar vid 750)
const CONTENT_WIDTH = 495; // 595 - 50*2

async function generateQuotePDF(quote) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const fileName = `quote_${quote.quoteNumber}.pdf`;
    const uploadDir = path.join(__dirname, '../../uploads/quotes');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Registrera DejaVu-fonter för korrekt hantering av svenska tecken
    const fontDir = '/usr/share/fonts/truetype/dejavu';
    doc.registerFont('DejaVu', path.join(fontDir, 'DejaVuSans.ttf'));
    doc.registerFont('DejaVu-Bold', path.join(fontDir, 'DejaVuSans-Bold.ttf'));

    const logoPath = path.join(__dirname, '../assets/loggan1.jpg');
    let pageNum = 1;

    // Hjälpfunktion: kontrollera om vi behöver ny sida
    function needsNewPage(yPos, neededSpace = 40) {
      return yPos + neededSpace > PAGE_BOTTOM;
    }

    // Hjälpfunktion: lägg till ny sida med header
    function addNewPage(yPos) {
      renderFooter(doc, 750);
      doc.addPage();
      pageNum++;
      const newY = renderContinuationHeader(doc, PAGE_MARGIN, logoPath, pageNum);
      renderLine(doc, newY);
      return newY + 20;
    }

    // Hjälpfunktion: kontrollera och lägg till sidbrytning om nödvändigt
    function checkBreak(yPos, neededSpace = 40) {
      if (needsNewPage(yPos, neededSpace)) {
        return addNewPage(yPos);
      }
      return yPos;
    }

    let yPos = PAGE_MARGIN;

    // ============================================
    // SIDA 1: HEADER MED LOGOTYP & FÖRETAGSINFO
    // ============================================

    // Logo till vänster
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, yPos, { width: 120 });
    } else {
      doc.fontSize(18)
        .fillColor('#2C7A4B')
        .font('Helvetica-Bold')
        .text('VILCHES', 50, yPos);
      doc.fontSize(10)
        .text('ENTREPRENAD', 50, yPos + 20);
    }

    // "Offert" titel och nummer till höger
    doc.fontSize(18)
      .fillColor('#000')
      .font('Helvetica-Bold')
      .text('Offert', 400, yPos, { align: 'right', width: 145 });

    doc.fontSize(10)
      .fillColor('#333')
      .font('Helvetica')
      .text(`Nr: ${quote.quoteNumber || 'V-001'}`, 400, yPos + 25, { align: 'right', width: 145 });

    yPos += 80;

    // Företagsinfo i höger kolumn
    const companyInfoX = 350;
    let companyInfoY = yPos;

    doc.fontSize(8)
      .fillColor('#666')
      .font('Helvetica-Bold')
      .text('Postadress', companyInfoX, companyInfoY);

    companyInfoY += 12;
    doc.fontSize(8)
      .fillColor('#333')
      .font('Helvetica')
      .text(process.env.COMPANY_NAME || 'VilchesApp', companyInfoX, companyInfoY);
    companyInfoY += 10;
    doc.text('Kvarnängsgatan 24', companyInfoX, companyInfoY);
    companyInfoY += 10;
    doc.text('754 20 Uppsala', companyInfoX, companyInfoY);

    // Kundadress till vänster
    yPos += 20;
    doc.fontSize(10)
      .fillColor('#333')
      .font('Helvetica')
      .text(quote.clientName || 'Kund', 50, yPos);

    yPos += 15;
    if (quote.clientAddress) {
      doc.fontSize(9)
        .text(quote.clientAddress, 50, yPos);
      yPos += 12;
    }
    if (quote.clientCity) {
      doc.fontSize(9)
        .text(quote.clientCity, 50, yPos);
      yPos += 12;
    }

    yPos = Math.max(yPos, companyInfoY) + 30;

    // ============================================
    // PRODUKTTABELL
    // ============================================
    yPos = checkBreak(yPos, 60);

    // Kolumnrubriker
    doc.fontSize(10)
      .fillColor('#000')
      .font('Helvetica-Bold')
      .text('Beskrivning', 50, yPos);

    doc.text('Antal', 310, yPos, { width: 50, align: 'right' });
    doc.text('Enhet', 370, yPos, { width: 40, align: 'center' });
    doc.text('À-pris', 420, yPos, { width: 50, align: 'right' });
    doc.text('Belopp (SEK)', 475, yPos, { width: 70, align: 'right' });

    yPos += 20;

    // Produktrader - visa lineItems och materials
    const items: Array<{ description: string; quantity: number; unit: string; unitPrice: number; total: number; isLabor: boolean }> = [];

    // Mappa enheter till svenska för PDF
    const unitLabels: Record<string, string> = {
      'tim': 'h',
      'st': 'st',
      'dag': 'dag',
      'mil': 'mil',
      'resa': 'resa',
      'kvm': 'kvm',
      'lpm': 'lpm',
      'h': 'h',
    };

    // Lägg till alla lineItems (arbete) från offerten
    if (quote.lineItems && quote.lineItems.length > 0) {
      quote.lineItems.forEach((item: any) => {
        const quantity = item.quantity || item.estimatedHours || 1;
        const unitPrice = item.unitPrice || item.hourlyRate || 0;
        const total = item.totalCost || item.cost || (quantity * unitPrice);
        const rawUnit = item.unit || 'tim';
        const unit = unitLabels[rawUnit] || rawUnit;
        const description = item.description || item.customCategory || 'Arbete';

        items.push({ description, quantity, unit, unitPrice, total, isLabor: true });
      });
    }

    // Lägg till alla materials från offerten
    if (quote.materials && quote.materials.length > 0) {
      quote.materials.forEach((mat: any) => {
        const quantity = mat.quantity || 1;
        const unitPrice = mat.unitPrice || mat.pricePerUnit || 0;
        const total = mat.totalCost || mat.totalPrice || (quantity * unitPrice);
        const rawUnit = mat.unit || 'st';
        const unit = unitLabels[rawUnit] || rawUnit;
        const description = mat.description || mat.customName || mat.material?.name || 'Material';

        items.push({ description, quantity, unit, unitPrice, total, isLabor: false });
      });
    }

    const laborItems = items.filter(item => item.isLabor);
    const materialItems = items.filter(item => !item.isLabor);

    // Funktion för att rita en tabellrad
    function renderTableRow(doc, item, yPos) {
      doc.fontSize(9)
        .fillColor('#333')
        .font('Helvetica')
        .text(item.description, 50, yPos, { width: 250 });

      const qtyStr = item.quantity.toFixed(2).replace('.00', ',00').replace('.', ',');
      doc.text(qtyStr, 310, yPos, { width: 50, align: 'right' });
      doc.text(item.unit, 370, yPos, { width: 40, align: 'center' });
      doc.text(formatMoney(item.unitPrice), 420, yPos, { width: 50, align: 'right' });
      doc.text(formatMoney(item.total), 475, yPos, { width: 70, align: 'right' });
    }

    // Rita arbetsrader med sidbrytning
    if (laborItems.length > 0) {
      yPos = checkBreak(yPos, 30);
      doc.fontSize(10)
        .fillColor('#000')
        .font('Helvetica-Bold')
        .text('Arbete', 50, yPos);
      yPos += 15;

      laborItems.forEach((item) => {
        yPos = checkBreak(yPos, 20);
        renderTableRow(doc, item, yPos);
        yPos += 15;
      });
    }

    // Rita materialrader med sidbrytning
    if (materialItems.length > 0) {
      yPos += 5;
      yPos = checkBreak(yPos, 30);
      doc.fontSize(10)
        .fillColor('#000')
        .font('Helvetica-Bold')
        .text('Material', 50, yPos);
      yPos += 15;

      materialItems.forEach((item) => {
        yPos = checkBreak(yPos, 20);
        renderTableRow(doc, item, yPos);
        yPos += 15;
      });
    }

    // Linje innan totalt
    yPos += 5;
    yPos = checkBreak(yPos, 60);
    doc.strokeColor('#E0E0E0')
      .lineWidth(0.5)
      .moveTo(50, yPos)
      .lineTo(545, yPos)
      .stroke();

    yPos += 15;

    // Total summa
    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
    const includeVat = quote.includeVat === true;
    const vatRate = quote.vatRate || 25;

    let totalExclVat: number;
    let vatAmount: number;
    let totalWithVat: number;

    if (includeVat) {
      totalWithVat = itemsTotal;
      totalExclVat = itemsTotal / (1 + vatRate / 100);
      vatAmount = totalWithVat - totalExclVat;
    } else {
      totalExclVat = itemsTotal;
      vatAmount = 0;
      totalWithVat = totalExclVat;
    }

    yPos = checkBreak(yPos, 50);
    doc.fontSize(10)
      .fillColor('#000')
      .font('Helvetica-Bold')
      .text(includeVat ? 'Summa exkl. moms' : 'Totalt exkl. moms', 50, yPos);
    doc.text(formatMoney(totalExclVat), 475, yPos, { width: 70, align: 'right' });

    if (includeVat) {
      yPos += 18;
      doc.fontSize(9)
        .font('Helvetica')
        .text(`Moms (${vatRate}%)`, 50, yPos);
      doc.text(formatMoney(vatAmount), 475, yPos, { width: 70, align: 'right' });

      yPos += 18;
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .text('Totalt inkl. moms', 50, yPos);
      doc.text(formatMoney(totalWithVat), 475, yPos, { width: 70, align: 'right' });
    }

    yPos += 30;

    // ============================================
    // KOSTNADER SAMMANFATTNING
    // ============================================
    yPos = checkBreak(yPos, 80);

    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Kostnader', 50, yPos);
    yPos += 20;

    // ROT-beräkning
    const ROT_ELIGIBLE = ['MALNING', 'SNICKERI', 'MURNING', 'EL', 'VVS', 'KAKEL',
      'TAPETSERING', 'FASADMALNING', 'RIVNING', 'FORBEREDELSE', 'BYGG', 'FINISH',
      'BILERSATTNING', 'OVRIGT'];

    const rotEligibleTotal = (quote.lineItems || [])
      .filter((li: any) => ROT_ELIGIBLE.includes(li.category || 'OVRIGT'))
      .reduce((sum: number, li: any) => sum + (li.totalCost || 0), 0);

    const costForRot = includeVat ? rotEligibleTotal : rotEligibleTotal * (1 + vatRate / 100);
    const calculatedRotDeduction = Math.min(costForRot * 0.30, 50000);

    const applyRotDeduction = quote.applyRotDeduction !== false;
    const rotDeduction = applyRotDeduction ? calculatedRotDeduction : 0;
    const finalTotal = totalWithVat - rotDeduction;
    const momsText = includeVat ? 'inkl. moms' : 'exkl. moms';

    doc.fontSize(9)
      .fillColor('#333')
      .font('Helvetica');

    if (includeVat) {
      doc.text(`Uppdragets kostnad = ${formatMoney(totalExclVat)} SEK exkl. moms.`, 50, yPos);
      yPos += 15;
      yPos = checkBreak(yPos, 15);
      doc.text(`Moms (${vatRate}%): ${formatMoney(vatAmount)} SEK`, 50, yPos);
      yPos += 15;
      yPos = checkBreak(yPos, 15);
      doc.text(`Totalt inkl. moms: ${formatMoney(totalWithVat)} SEK`, 50, yPos);
      yPos += 15;
    } else {
      doc.text(`Uppdragets kostnad = ${formatMoney(totalExclVat)} SEK exkl. moms.`, 50, yPos);
      yPos += 15;
    }

    yPos = checkBreak(yPos, 20);
    if (applyRotDeduction && rotDeduction > 0) {
      doc.text(`ROT-avdrag (30%): ${formatMoney(rotDeduction)} SEK`, 50, yPos);
      yPos += 15;
      yPos = checkBreak(yPos, 15);
      doc.font('Helvetica-Bold')
        .text(`Totalkostnad efter ROT-avdrag: ${formatMoney(finalTotal)} SEK ${momsText}`, 50, yPos);
      doc.font('Helvetica');
    } else {
      const defaultRates = getHourlyRatesForPdf(includeVat);
      const snickeriRate = defaultRates.find(r => r.role.includes('snickare'))?.rate || 550;
      doc.text(`Tilläggsarbeten debiteras med ${formatMoney(snickeriRate)} SEK/h ${momsText}`, 50, yPos);
    }

    yPos += 25;

    // ============================================
    // ARBETSBESKRIVNING (om den finns)
    // ============================================
    if (quote.description && quote.description.trim()) {
      const descText = quote.description.trim();

      // Beräkna texthöjd för att avgöra om vi behöver sidbrytning
      doc.fontSize(9).font('DejaVu');
      const textHeight = doc.heightOfString(descText, { width: CONTENT_WIDTH });
      doc.font('Helvetica');

      // Behöver vi minst rubrik + lite text?
      yPos = checkBreak(yPos, Math.min(textHeight + 25, 60));

      doc.fontSize(11)
        .font('DejaVu-Bold')
        .fillColor('#000')
        .text('Arbetsbeskrivning', 50, yPos);
      yPos += 18;

      // Om texten är längre än vad som ryms på sidan, dela upp i stycken
      const remainingSpace = PAGE_BOTTOM - yPos;

      if (textHeight <= remainingSpace) {
        // Allt ryms på denna sida
        doc.fontSize(9)
          .font('DejaVu')
          .fillColor('#333')
          .text(descText, 50, yPos, { width: CONTENT_WIDTH, align: 'left' });
        yPos += textHeight + 25;
      } else {
        // Dela upp texten i stycken och rita med sidbrytning
        const paragraphs = descText.split('\n');
        doc.fontSize(9).font('DejaVu').fillColor('#333');

        for (const paragraph of paragraphs) {
          if (!paragraph.trim()) {
            yPos += 8;
            continue;
          }

          const paraHeight = doc.heightOfString(paragraph.trim(), { width: CONTENT_WIDTH });

          // Om stycket inte ryms, ny sida
          if (needsNewPage(yPos, paraHeight + 5)) {
            yPos = addNewPage(yPos);
            doc.fontSize(9).font('DejaVu').fillColor('#333');
          }

          doc.text(paragraph.trim(), 50, yPos, { width: CONTENT_WIDTH, align: 'left' });
          yPos += paraHeight + 5;
        }

        yPos += 20;
      }

      doc.font('Helvetica');
    }

    // ============================================
    // DATUM OCH UNDERSKRIFT
    // ============================================
    yPos = checkBreak(yPos, 120); // Underskrift behöver ca 120pt

    doc.fontSize(9)
      .fillColor('#333')
      .text(`Uppsala ${new Date(quote.createdAt).toLocaleDateString('sv-SE')}`, 50, yPos);

    yPos += 20;
    doc.fontSize(10)
      .text('Med vänliga hälsningar', 50, yPos);

    yPos += 25;
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#2C7A4B')
      .text('Victor Vilches', 50, yPos);

    yPos += 15;
    doc.fontSize(9)
      .fillColor('#666')
      .font('Helvetica-Oblique')
      .text('Entreprenör / Project Leader', 50, yPos);

    yPos += 12;
    doc.font('Helvetica')
      .text(process.env.COMPANY_NAME || 'VilchesApp', 50, yPos);

    yPos += 15;
    doc.text('M: +46 707978547', 50, yPos);
    yPos += 12;
    doc.text(`E: ${process.env.COMPANY_EMAIL || ''}`, 50, yPos);
    yPos += 12;
    doc.text('H: vilchesapp.com', 50, yPos);

    // Footer på offert-sidan/sidorna
    renderFooter(doc, 750);

    // ============================================
    // NY SIDA: VILLKOR
    // ============================================
    doc.addPage();
    pageNum++;
    yPos = renderContinuationHeader(doc, PAGE_MARGIN, logoPath, pageNum);
    renderLine(doc, yPos);

    // Beställarens ansvar
    yPos += 25;
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Beställarens ansvar', 50, yPos);

    yPos += 20;
    doc.fontSize(10)
      .font('Helvetica-Oblique')
      .fillColor('#333')
      .text('Hinder', 50, yPos);

    yPos += 15;
    doc.fontSize(9)
      .font('Helvetica')
      .text('Beställaren ansvarar för borttagning av sådant som kan utgöra ett hinder för entreprenaden. I de fall det är nödvändigt med polistillstånd så besörjer beställaren för detta.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    yPos += 35;
    yPos = checkBreak(yPos, 50);
    doc.fontSize(10)
      .font('Helvetica-Oblique')
      .fillColor('#333')
      .text('Förvaring, förbrukning, plats och utrymme', 50, yPos);

    yPos += 15;
    doc.fontSize(9)
      .font('Helvetica')
      .text('Beställaren står för materialförråd, el och vattenförbrukning, wc och lunch/fikarum. I dom fall beställaren inte kan tillhandahålla i sina lokaler toa och lunchrum utgår hyra av nödvändig utrustning enligt tilläggsbeställningar.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    // Pris tilläggsbeställningar
    yPos += 40;
    yPos = checkBreak(yPos, 80);
    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Pris tilläggsbeställningar', 50, yPos);

    yPos += 20;

    const vatLabel = includeVat ? 'kr. inkl. moms' : 'kr. exkl. moms';
    doc.fontSize(9)
      .font('Helvetica')
      .text(vatLabel, 450, yPos);

    yPos += 15;
    const hourlyRates = getHourlyRatesForPdf(includeVat);

    hourlyRates.forEach((item) => {
      yPos = checkBreak(yPos, 15);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#333')
        .text(item.role, 50, yPos)
        .text(item.rate.toString(), 500, yPos);
      yPos += 15;
    });

    // Tillvägagångssätt
    yPos += 20;
    yPos = checkBreak(yPos, 60);
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Tillvägagångssätt', 50, yPos);

    yPos += 20;
    doc.fontSize(10)
      .font('Helvetica-Oblique')
      .fillColor('#333')
      .text('Kvalitetskontroll', 50, yPos);

    yPos += 15;
    doc.fontSize(9)
      .font('Helvetica')
      .text('Arbetet utförs enligt branschstandard och gällande säkerhetsföreskrifter. Egenkontroll utförs och kan lämnas till beställaren om önskvärt när entreprenaden är färdigställd. Vi övertar ert arbetsmiljöansvar, är utbildade i BAS-P och BAS-U. Vi har digitalliggare i vårt system.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    // Villkor och utförande
    yPos += 45;
    yPos = checkBreak(yPos, 80);
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Villkor och utförande:', 50, yPos);

    yPos += 20;
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#333')
      .text('För att säkerställa effektivitet och säkerhet under projektets gång, krävs att arbetsområdet är väl tillgänglig och fritt från hinder såsom utemöbler och andra föremål. Vid behov av ytterligare arbete som inte omfattas av det ursprungliga avtalet, kommer detta att debiteras till en kostnad av 500 SEK per timme, plus kostnad för eventuellt material. Inga ytterligare arbeten påbörjas utan först erhållit ert uttryckliga godkännande.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    renderFooter(doc, 750);

    // ============================================
    // NY SIDA: BETALNING & AVSLUT
    // ============================================
    doc.addPage();
    pageNum++;
    yPos = renderContinuationHeader(doc, PAGE_MARGIN, logoPath, pageNum);
    renderLine(doc, yPos);

    // Betalningsvillkor
    yPos += 25;
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Betalningsvillkor:', 50, yPos);

    yPos += 20;
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#333')
      .text('Betalningen för projektet delas upp i två faser för att underlätta ekonomisk planering för båda parter.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    yPos += 25;
    doc.text('• En förskottsbetalning om 40% av den totala kostnaden faktureras vid projektets start.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    yPos += 15;
    doc.text('• Resterande 60% faktureras vid projektets slutförande.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    // Övrigt
    yPos += 35;
    yPos = checkBreak(yPos, 50);
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Övrigt:', 50, yPos);

    yPos += 20;
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#333')
      .text('• Vårt företag är registrerat för F-skatt och verksamheten utförs i enlighet med svensk lagstiftning.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    yPos += 15;
    yPos = checkBreak(yPos, 30);
    doc.text('• Vi engagerar oss för att leverera tjänster av hög kvalitet och strävar efter fullständigt kundnöjdhet. Har ni frågor, eller behöver ni mer information, är ni välkomna att kontakta oss.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    // Giltighet och avtal
    yPos += 35;
    yPos = checkBreak(yPos, 60);
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Giltighet och avtal:', 50, yPos);

    yPos += 20;
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#333')
      .text('Denna offert är giltig i 7 dagar från offertdatumet. Offerten övergår till bindande avtal endast efter att den har undertecknats av båda parterna.', 50, yPos, {
        width: CONTENT_WIDTH
      });

    yPos += 30;
    yPos = checkBreak(yPos, 20);
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#2C7A4B')
      .text('Vi ser fram emot möjligheten att arbeta tillsammans med er och bidra till ert projekt.', 50, yPos, {
        width: CONTENT_WIDTH,
        align: 'center'
      });

    renderFooter(doc, 750);

    doc.end();

    stream.on('finish', () => {
      resolve(filePath);
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

// ============================================
// HJÄLPFUNKTIONER
// ============================================

/**
 * Renderar header för fortsättningssidor (utan "Offert"-titel)
 */
function renderContinuationHeader(doc, yPos, logoPath, pageNumber) {
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, yPos, { width: 120 });
  } else {
    doc.fontSize(18)
      .fillColor('#2C7A4B')
      .font('Helvetica-Bold')
      .text('VILCHES', 50, yPos);
    doc.fontSize(10)
      .text('ENTREPRENAD', 50, yPos + 20);
  }

  doc.fontSize(9)
    .fillColor('#333')
    .font('Helvetica')
    .text(`Sida ${pageNumber}`, 400, yPos + 20, { align: 'right', width: 145 });

  return yPos + 60;
}

/**
 * Renderar horisontell linje
 */
function renderLine(doc, yPos) {
  doc.strokeColor('#E0E0E0')
    .lineWidth(1)
    .moveTo(50, yPos)
    .lineTo(545, yPos)
    .stroke();
}

/**
 * Renderar footer med företagsinfo i kolumner
 */
function renderFooter(doc, yPos) {
  doc.strokeColor('#E0E0E0')
    .lineWidth(0.5)
    .moveTo(50, yPos)
    .lineTo(545, yPos)
    .stroke();

  yPos += 10;

  const col1X = 50;
  const col2X = 180;
  const col3X = 310;
  const col4X = 440;

  doc.fontSize(7)
    .fillColor('#666')
    .font('Helvetica-Bold')
    .text('Postadress', col1X, yPos, { lineBreak: false })
    .text('Telefon', col2X, yPos, { lineBreak: false })
    .text('Bankgiro', col3X, yPos, { lineBreak: false })
    .text('Godkänd för F-skatt', col4X, yPos, { lineBreak: false });

  yPos += 10;

  doc.fontSize(7)
    .fillColor('#333')
    .font('Helvetica')
    .text(process.env.COMPANY_NAME || 'VilchesApp', col1X, yPos, { lineBreak: false })
    .text(process.env.COMPANY_PHONE || '', col2X, yPos, { lineBreak: false })
    .text('5775-1646', col3X, yPos, { lineBreak: false });

  yPos += 8;

  doc.text('Kvarnängsgatan 24', col1X, yPos, { lineBreak: false });
  doc.fontSize(7)
    .fillColor('#666')
    .font('Helvetica-Bold')
    .text('Momsreg.nr', col3X, yPos, { lineBreak: false });

  yPos += 8;

  doc.fontSize(7)
    .fillColor('#333')
    .font('Helvetica')
    .text('754 20 Uppsala', col1X, yPos, { lineBreak: false })
    .text('SE559123456701', col3X, yPos, { lineBreak: false });
}

/**
 * Genererar kalkylator-specifik breakdown om relevant
 */
function getCalculatorBreakdown(quote) {
  const { mainCategory, subCategory, areaSqm } = quote;

  if (!areaSqm) return null;

  try {
    // ALTAN
    if (mainCategory === 'ALTAN_TRADACK') {
      const materialType = quote.materialType || 'Tryckimpregnerat 28x120';
      const result = calculateAltanCost(areaSqm, materialType);

      let breakdown = `Area: ${areaSqm} kvm\n`;
      breakdown += `Material: ${materialType}\n`;
      breakdown += `Baspris: ${formatMoney(result.baseCost)} kr (${areaSqm <= 25 ? '≤25 kvm' : `25 kvm + ${areaSqm - 25} kvm á 1 600 kr`})\n`;
      breakdown += `Materialfaktor: ×${result.materialFactor}\n`;
      breakdown += `\nKostnadsfördelning:\n`;
      breakdown += `• Material (30%): ${formatMoney(result.materialCost)} kr\n`;
      breakdown += `• Arbete (70%): ${formatMoney(result.laborCost)} kr`;

      return breakdown;
    }

    // INOMHUSMÅLNING
    if (mainCategory === 'MALNING_TAPETSERING' || subCategory === 'INOMHUSMALNING') {
      const omfattning = quote.omfattning || 'Nej';
      const result = calculateInomhusmålningCost(areaSqm, omfattning);

      let breakdown = `Area: ${areaSqm} kvm\n`;
      breakdown += `Reparationsomfattning: ${omfattning}\n`;
      breakdown += `\nKostnadsfördelning:\n`;
      breakdown += `• Material (12%): ${formatMoney(result.materialCost)} kr\n`;
      breakdown += `• Arbete (88%): ${formatMoney(result.laborCost)} kr`;

      return breakdown;
    }

    // FASADMÅLNING
    if (mainCategory === 'FASADMALNING' || subCategory === 'FASADMALNING') {
      const materialType = quote.materialType || 'Alkyd/Akrylat';
      const floorCount = quote.floorCount || 1;
      const result = calculateFasadmålningCost(areaSqm, materialType, floorCount);

      let breakdown = `Area: ${areaSqm} kvm\n`;
      breakdown += `Färgtyp: ${materialType}\n`;
      breakdown += `Våningar: ${floorCount}\n`;
      breakdown += `Beräknad färgmängd: ca ${result.litersNeeded} liter\n`;
      breakdown += `\nKostnadsfördelning:\n`;
      breakdown += `• Material: ${formatMoney(result.materialCost)} kr\n`;
      breakdown += `• Arbete: ${formatMoney(result.laborCost)} kr`;

      if (floorCount > 1) {
        breakdown += `\n\nOBS: Våningsfaktor ×${result.floorFactor} har tilllämpats för ${floorCount} våningar`;
      }

      return breakdown;
    }

    return null;
  } catch (error) {
    console.error('Error generating calculator breakdown:', error);
    return null;
  }
}

function formatMoney(amount) {
  return Math.round(amount).toLocaleString('sv-SE').replace(/\s/g, ' ');
}

export { generateQuotePDF };
