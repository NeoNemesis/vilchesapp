/**
 * Fortnox API Client
 * OAuth2 token management, rate limiting, and API methods
 */

import { prisma } from '../lib/prisma';

const FORTNOX_API_BASE = 'https://api.fortnox.se';
const FORTNOX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';
const RATE_LIMIT_MS = 200;

let lastRequestTime = 0;

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, options);
}

async function getSettings() {
  return prisma.fortnoxSettings.findUnique({ where: { id: 'default' } });
}

async function getValidToken(): Promise<string> {
  const settings = await getSettings();
  if (!settings?.accessToken || !settings?.refreshToken) {
    throw new Error('Fortnox ej anslutet - saknar tokens');
  }

  // Check if token is expired (with 5 min buffer)
  if (settings.tokenExpiresAt && settings.tokenExpiresAt.getTime() < Date.now() + 300000) {
    return refreshAccessToken(settings.refreshToken, settings.clientId!, settings.clientSecret!);
  }

  return settings.accessToken;
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data: any = await response.json();

  await prisma.fortnoxSettings.update({
    where: { id: 'default' },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

async function apiRequest(method: string, path: string, body?: any): Promise<any> {
  const token = await getValidToken();

  const response = await rateLimitedFetch(`${FORTNOX_API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fortnox API ${method} ${path} failed (${response.status}): ${errorText}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// === Public API ===

export function getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'salary companyinformation archive profile',
    state,
    access_type: 'offline',
    response_type: 'code',
  });
  return `${FORTNOX_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<void> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data: any = await response.json();

  // Get company info
  let companyName: string | null = null;
  try {
    const tempToken = data.access_token;
    const companyResponse = await fetch(`${FORTNOX_API_BASE}/3/companyinformation`, {
      headers: {
        'Authorization': `Bearer ${tempToken}`,
        'Accept': 'application/json',
      },
    });
    if (companyResponse.ok) {
      const companyData: any = await companyResponse.json();
      companyName = companyData?.CompanyInformation?.CompanyName || null;
    }
  } catch {
    // Non-critical
  }

  await prisma.fortnoxSettings.upsert({
    where: { id: 'default' },
    update: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      isConnected: true,
      companyName,
    },
    create: {
      id: 'default',
      clientId,
      clientSecret,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      isConnected: true,
      companyName,
    },
  });
}

export async function testConnection(): Promise<{ ok: boolean; companyName?: string; error?: string }> {
  try {
    const data = await apiRequest('GET', '/3/companyinformation');
    const companyName = data?.CompanyInformation?.CompanyName;

    if (companyName) {
      await prisma.fortnoxSettings.update({
        where: { id: 'default' },
        data: { companyName },
      });
    }

    return { ok: true, companyName };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

export async function createEmployee(employee: {
  employeeId: string;
  firstName: string;
  lastName: string;
  personalNumber?: string;
}): Promise<any> {
  return apiRequest('POST', '/3/employees', {
    Employee: {
      EmployeeId: employee.employeeId,
      FirstName: employee.firstName,
      LastName: employee.lastName,
      PersonalIdentityNumber: employee.personalNumber || '',
    },
  });
}

export async function createAttendanceTransaction(transaction: {
  employeeId: string;
  date: string;      // YYYY-MM-DD
  hours: number;
  causeCode: string;  // e.g. "TID" for ordinary work time
}): Promise<any> {
  return apiRequest('POST', '/3/attendancetransactions', {
    AttendanceTransaction: {
      EmployeeId: transaction.employeeId,
      Date: transaction.date,
      Hours: transaction.hours,
      CauseCode: transaction.causeCode,
    },
  });
}

export async function uploadToArchive(
  filename: string,
  buffer: Buffer,
  folderId?: string
): Promise<any> {
  const token = await getValidToken();

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'application/pdf' });
  formData.append('file', blob, filename);
  if (folderId) {
    formData.append('FolderId', folderId);
  }

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const response = await fetch(`${FORTNOX_API_BASE}/3/archive`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Archive upload failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

// === Customer API ===

export async function createCustomer(customer: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  personalNumber?: string;
  orgNumber?: string;
  type?: 'PRIVATE' | 'COMPANY';
}): Promise<any> {
  // Parse address into components
  const addressParts = (customer.address || '').split(',').map(s => s.trim());
  const address1 = addressParts[0] || '';
  const cityZip = addressParts[1] || '';
  const zipMatch = cityZip.match(/(\d{3}\s?\d{2})\s*(.*)/);

  return apiRequest('POST', '/3/customers', {
    Customer: {
      Name: customer.name,
      Email: customer.email || '',
      Phone: customer.phone || '',
      Address1: address1,
      ZipCode: zipMatch ? zipMatch[1] : '',
      City: zipMatch ? zipMatch[2] : cityZip,
      OrganisationNumber: customer.personalNumber || customer.orgNumber || '',
      Type: customer.type || 'PRIVATE',
      CountryCode: 'SE',
      Currency: 'SEK',
      DefaultDeliveryTypes: { Invoice: 'EMAIL' },
    },
  });
}

// === Invoice API ===

export async function createInvoice(invoiceData: {
  CustomerNumber: string;
  InvoiceRows: any[];
  Remarks?: string;
  YourReference?: string;
  TaxReductionType?: string;
  HouseWorkOtherCosts?: number;
}): Promise<any> {
  return apiRequest('POST', '/3/invoices', {
    Invoice: invoiceData,
  });
}

export async function sendInvoice(invoiceNumber: string): Promise<any> {
  return apiRequest('PUT', `/3/invoices/${invoiceNumber}/externalprint`, {});
}

export async function getInvoice(invoiceNumber: string): Promise<any> {
  return apiRequest('GET', `/3/invoices/${invoiceNumber}`);
}

export async function isConfiguredAndConnected(): Promise<boolean> {
  try {
    const appSettings = await prisma.appSettings.findUnique({ where: { id: 'default' } });
    if (!appSettings?.enableFortnox) return false;

    const fortnoxSettings = await getSettings();
    return fortnoxSettings?.isConnected === true;
  } catch {
    return false;
  }
}
