/**
 * Fortnox Invoice Service - Orchestration
 * Creates invoices in Fortnox from quotes/projects.
 * Handles ROT deductions, customer sync, and invoice sending.
 */

import { prisma } from '../lib/prisma';
import * as fortnox from './fortnoxApiClient';
import { sendBillingInfoRequestEmail } from './billingInfoEmailService';
import crypto from 'crypto';

/**
 * Create invoice in Fortnox from a quote
 */
export async function createInvoiceFromQuote(quoteId: string): Promise<{
  invoiceNumber: string;
  logId: string;
}> {
  const isActive = await fortnox.isConfiguredAndConnected();
  if (!isActive) throw new Error('Fortnox är inte anslutet');

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lineItems: { orderBy: { sortOrder: 'asc' } },
      materials: true,
    },
  });

  if (!quote) throw new Error('Offert hittades inte');
  if (quote.status !== 'ACCEPTED') throw new Error('Offerten måste vara accepterad');

  const isRot = quote.applyRotDeduction === true;

  if (isRot && !quote.clientPersonalNumber) {
    throw new Error('Personnummer krävs för ROT-faktura. Begär faktureringsuppgifter från kunden först.');
  }

  if (!isRot && !quote.clientPersonalNumber && !quote.clientOrgNumber) {
    throw new Error('Personnummer eller org.nummer krävs för faktura. Begär faktureringsuppgifter från kunden först.');
  }

  // Create log
  const log = await prisma.fortnoxInvoiceLog.create({
    data: {
      quoteId: quote.id,
      status: 'PENDING',
      totalAmount: quote.estimatedTotalCost,
      laborCost: quote.estimatedLaborCost,
      materialCost: quote.estimatedMaterialCost,
      rotDeduction: isRot ? (quote.rotDeduction || 0) : 0,
      invoiceType: isRot ? 'ROT' : 'STANDARD',
    },
  });

  try {
    // 1. Sync/create customer in Fortnox
    let customerId = quote.fortnoxCustomerId;
    if (!customerId) {
      const customerData = await fortnox.createCustomer({
        name: quote.clientName,
        email: quote.clientEmail || undefined,
        phone: quote.clientPhone || undefined,
        address: quote.clientAddress || undefined,
        personalNumber: quote.clientPersonalNumber || undefined,
        orgNumber: quote.clientOrgNumber || undefined,
        type: quote.clientType === 'COMPANY' ? 'COMPANY' : 'PRIVATE',
      });

      customerId = customerData.Customer?.CustomerNumber;
      if (!customerId) throw new Error('Kunde inte skapa kund i Fortnox');

      await prisma.quote.update({
        where: { id: quote.id },
        data: { fortnoxCustomerId: customerId },
      });
    }

    // 2. Build invoice rows
    const invoiceRows: any[] = [];

    // Add labor line items
    if (quote.lineItems && quote.lineItems.length > 0) {
      for (const item of quote.lineItems) {
        const row: any = {
          Description: (item as any).description || (item as any).name || 'Arbete',
          DeliveredQuantity: (item as any).quantity || (item as any).hours || 1,
          Price: (item as any).unitPrice || (item as any).pricePerUnit || 0,
          AccountNumber: 3001, // Försäljning tjänster
        };

        if (isRot) {
          row.HouseWork = true;
          row.HouseWorkType = 'CONSTRUCTION';
        }

        invoiceRows.push(row);
      }
    } else {
      // No line items — create single labor row
      const laborRow: any = {
        Description: `Arbete: ${quote.projectType || quote.subCategory || 'Entreprenad'}`,
        DeliveredQuantity: 1,
        Price: quote.estimatedLaborCost,
        AccountNumber: 3001,
      };

      if (isRot) {
        laborRow.HouseWork = true;
        laborRow.HouseWorkType = 'CONSTRUCTION';
      }

      invoiceRows.push(laborRow);
    }

    // Add material rows
    if (quote.materials && quote.materials.length > 0) {
      for (const mat of quote.materials) {
        invoiceRows.push({
          Description: `Material: ${(mat as any).name || 'Material'}`,
          DeliveredQuantity: (mat as any).quantity || 1,
          Price: (mat as any).unitPrice || (mat as any).totalPrice || 0,
          AccountNumber: 3001,
          HouseWork: false,
        });
      }
    } else if (quote.estimatedMaterialCost > 0) {
      invoiceRows.push({
        Description: 'Material',
        DeliveredQuantity: 1,
        Price: quote.estimatedMaterialCost,
        AccountNumber: 3001,
        HouseWork: false,
      });
    }

    // 3. Create invoice in Fortnox
    const invoiceData: any = {
      CustomerNumber: customerId,
      InvoiceRows: invoiceRows,
      Remarks: `Offert ${quote.quoteNumber}`,
      YourReference: quote.clientName,
    };

    if (isRot) {
      invoiceData.TaxReductionType = 'rot';
      if (quote.housingType === 'BRF' && quote.brfOrgNumber) {
        invoiceData.HouseWorkOtherCosts = quote.estimatedMaterialCost || 0;
      }
    }

    const result = await fortnox.createInvoice(invoiceData);
    const invoiceNumber = result?.Invoice?.DocumentNumber?.toString();

    if (!invoiceNumber) throw new Error('Fortnox returnerade inget fakturanummer');

    // 4. Update log
    await prisma.fortnoxInvoiceLog.update({
      where: { id: log.id },
      data: {
        status: 'CREATED',
        fortnoxInvoiceNumber: invoiceNumber,
        fortnoxCustomerId: customerId,
      },
    });

    return { invoiceNumber, logId: log.id };
  } catch (error: any) {
    await prisma.fortnoxInvoiceLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        errorMessage: error.message?.substring(0, 500) || 'Unknown error',
      },
    });
    throw error;
  }
}

/**
 * Send a created invoice via Fortnox
 */
export async function sendFortnoxInvoice(logId: string): Promise<void> {
  const log = await prisma.fortnoxInvoiceLog.findUnique({ where: { id: logId } });
  if (!log) throw new Error('Fakturalog hittades inte');
  if (!log.fortnoxInvoiceNumber) throw new Error('Ingen faktura skapad ännu');

  await fortnox.sendInvoice(log.fortnoxInvoiceNumber);

  await prisma.fortnoxInvoiceLog.update({
    where: { id: logId },
    data: { status: 'SENT', sentAt: new Date() },
  });
}

/**
 * Generate billing info token and send request email to customer
 */
export async function requestBillingInfo(quoteId: string): Promise<void> {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error('Offert hittades inte');
  if (!quote.clientEmail) throw new Error('Kunden har ingen email');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dagar

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      billingInfoToken: token,
      billingInfoTokenExpiresAt: expiresAt,
    },
  });

  await sendBillingInfoRequestEmail({
    clientName: quote.clientName,
    clientEmail: quote.clientEmail,
    quoteNumber: quote.quoteNumber,
    projectType: quote.projectType || quote.subCategory || '',
    totalCost: quote.totalAfterRot || quote.estimatedTotalCost,
    isRot: quote.applyRotDeduction === true,
    formUrl: `${process.env.FRONTEND_URL}/billing-info/${token}`,
  });
}

/**
 * Save billing info submitted by customer via public form
 */
export async function saveBillingInfo(token: string, data: {
  clientType: string;
  personalNumber?: string;
  orgNumber?: string;
  propertyAddress?: string;
  housingType?: string;
  brfName?: string;
  brfOrgNumber?: string;
  address?: string;
}): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { billingInfoToken: token },
  });

  if (!quote) throw new Error('Ogiltig länk');
  if (quote.billingInfoTokenExpiresAt && quote.billingInfoTokenExpiresAt < new Date()) {
    throw new Error('Länken har gått ut. Kontakta oss för en ny länk.');
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      clientType: data.clientType,
      clientPersonalNumber: data.personalNumber || null,
      clientOrgNumber: data.orgNumber || null,
      clientAddress: data.address || quote.clientAddress,
      propertyAddress: data.propertyAddress || null,
      housingType: data.housingType || null,
      brfName: data.brfName || null,
      brfOrgNumber: data.brfOrgNumber || null,
      billingInfoCollected: true,
      billingInfoToken: null,
      billingInfoTokenExpiresAt: null,
    },
  });

  // Copy to linked project if exists
  if (quote.id) {
    const project = await prisma.project.findUnique({
      where: { quoteId: quote.id },
    });

    if (project) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          clientType: data.clientType,
          clientPersonalNumber: data.personalNumber || null,
          clientOrgNumber: data.orgNumber || null,
          propertyAddress: data.propertyAddress || null,
          housingType: data.housingType || null,
          brfName: data.brfName || null,
          brfOrgNumber: data.brfOrgNumber || null,
          billingInfoCollected: true,
        },
      });
    }
  }
}
