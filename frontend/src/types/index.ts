export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CONTRACTOR' | 'CLIENT' | 'EMPLOYEE' | 'ACCOUNTANT';
  company?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'COMPLETED' | 'CANCELLED' | 'SENT_TO_CLIENT';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

// Baserat på Prisma schema - detta är den kompletta Project interface
export interface Project {
  id: string;
  projectNumber?: string;
  title: string;
  description: string;
  address: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  priority: Priority;
  status: ProjectStatus;
  estimatedHours?: number;
  estimatedCost?: number;
  deadline?: string;
  originalEmail?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  assignedToId?: string;
  assignedTo?: User;
  createdBy?: User;
  images?: ProjectImage[];
  reports?: Report[];
  _count?: {
    reports?: number;
    images?: number;
  };
}

export interface ProjectImage {
  id: string;
  projectId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface Report {
  id: string;
  projectId: string;
  title: string;
  workDescription: string;
  hoursWorked: number;
  materialsUsed: any; // JSON field
  progressPercent: number;
  nextSteps?: string;
  issues?: string;
  status: ReportStatus;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author?: User;
  images?: ReportImage[];
}

export interface ReportImage {
  id: string;
  reportId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  description?: string;
  uploadedAt: string;
}

export interface Contractor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFormData {
  title: string;
  workDescription: string;
  hoursWorked: number;
  progressPercent: number;
  nextSteps?: string;
  issues?: string;
  materialsUsed: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
}

// Legacy interfaces - behålls för bakåtkompatibilitet
export interface ReportMaterial {
  name: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'REPORTED' | 'APPROVED' | 'SENT_TO_CLIENT' | 'COMPLETED';

export interface Order {
  id: string;
  orderNumber: string;
  title: string;
  description: string;
  address: string;
  priority: Priority;
  status: OrderStatus;
  originalEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  deadline?: string | null;
  assignedToId?: string | null;
  assignedTo?: User | null;
  report?: Report | null;
}

// === QUOTE SYSTEM TYPES ===

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

// Vilches huvudtjänster (från vilchesab.se)
export type ProjectMainCategory =
  | 'MALNING_TAPETSERING'    // Måleri & Tapetsering
  | 'SNICKERIARBETEN'        // Snickeriarbeten
  | 'TOTALRENOVERING'        // Totalrenovering
  | 'MOBELMONTERING'         // Möbelmontering
  | 'VATRUM'                 // Våtrum/Badrum
  | 'KOK'                    // Kök
  | 'FASADMALNING'           // Fasadmålning
  | 'ALTAN_TRADACK'          // Altan & Trädäck
  | 'GARDEROB'               // Garderob
  | 'TAPETSERING'            // Tapetsering
  | 'TAK'                    // Legacy
  | 'MALNING'                // Legacy
  | 'SNICKERI'               // Legacy
  | 'EL'                     // Legacy
  | 'VVS'                    // Legacy
  | 'MURNING'                // Legacy
  | 'KOMBINERAT';            // Kombinerade projekt

export type ComplexityLevel = 'VERY_SIMPLE' | 'SIMPLE' | 'MEDIUM' | 'COMPLEX' | 'VERY_COMPLEX';
export type ConditionLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR';

// Vilches arbetskategorier (med timpris)
export type WorkCategoryType =
  | 'RIVNING'
  | 'FORBEREDELSE'
  | 'SKRAPNING'
  | 'RENGORING'
  | 'MALNING'              // Målare: 620 kr/h
  | 'SNICKERI'             // Snickare: 688 kr/h
  | 'MURNING'              // Murare: 688 kr/h
  | 'EL'                   // Elektriker: 750 kr/h
  | 'VVS'
  | 'KAKEL'
  | 'TAPETSERING'
  | 'FASADMALNING'
  | 'GOLVVARME'
  | 'BYGGNATION'
  | 'BYGG'                 // Legacy alias för BYGGNATION
  | 'MONTERING'
  | 'PLATSBYGGDA_MOBEL'
  | 'KOKSMONTAGE'
  | 'STADNING'
  | 'FINISH'
  | 'SPECIALARBETE'
  | 'BILERSATTNING'        // Bilersättning
  | 'SOPHANTERING'         // Sophantering
  | 'OVRIGT';              // Övrigt

export type MaterialCategory = 'KAKEL_KLINKER' | 'VVS_PORSLIN' | 'VVS_DELAR' | 'EL_ARMATURER' | 'EL_MATERIAL' | 'BYGG_MATERIAL' | 'FARG_FINISH' | 'GOLVVARME' | 'KOK_LUCKOR' | 'KOK_BENKSKIVA' | 'VITVAROR' | 'TRADGARD' | 'VERKTYG' | 'OVRIGT';

export interface Quote {
  id: string;
  quoteNumber: string;

  // Klientinformation
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;

  // Projektkategori
  mainCategory: ProjectMainCategory;
  subCategory?: string;
  projectType: string;

  // Status
  status: QuoteStatus;
  validUntil?: string;

  // Beskrivning
  description?: string;
  location: string;
  areaSqm: number;

  // AI parametrar
  complexity: ComplexityLevel;
  condition?: ConditionLevel;
  specialFeatures: string[];
  keywords: string[];

  // Kostnad
  estimatedTotalHours: number;
  hourlyRate: number;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalCost: number;

  // ROT & Moms
  applyRotDeduction?: boolean;
  rotDeduction?: number;
  totalAfterRot?: number;
  includeVat?: boolean;
  vatRate?: number;
  vatAmount?: number;
  totalWithVat?: number;

  // AI matchning
  similarityScore?: number;
  confidenceLevel?: number;
  basedOnQuoteIds: string[];

  // Relations
  lineItems?: QuoteLineItem[];
  materials?: QuoteMaterial[];
  tags?: QuoteTag[];
  images?: QuoteImage[];
  projectId?: string;
  project?: Project;

  // Faktiskt utfall
  actualTotalHours?: number;
  actualLaborCost?: number;
  actualMaterialCost?: number;
  actualTotalCost?: number;

  // PDF & Email
  pdfUrl?: string;
  sentAt?: string;
  sentTo?: string;

  // Metadata
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteImage {
  id: string;
  quoteId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  description?: string;
  uploadedAt: string;
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  category: WorkCategoryType;
  customCategory?: string;  // För egen kategori
  description: string;
  // Nya flexibla fält
  quantity?: number;        // Antal (ersätter/kompletterar estimatedHours)
  unit?: string;            // Enhet (tim, st, dag, mil, etc.)
  unitPrice?: number;       // Pris per enhet (ersätter/kompletterar hourlyRate)
  // Bakåtkompatibilitet
  estimatedHours: number;
  hourlyRate: number;
  totalCost: number;
  actualHours?: number;
  varianceHours?: number;
  sortOrder: number;
}

export interface QuoteMaterial {
  id: string;
  quoteId: string;
  materialId?: string;
  material?: Material;
  customName?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  supplier?: string;
  actualQuantity?: number;
  actualCost?: number;
}

export interface Material {
  id: string;
  name: string;
  description?: string;
  category: MaterialCategory;
  defaultUnit: string;
  avgPrice: number;
  supplier?: string;
  productUrl?: string;
  isActive: boolean;
}

export interface QuoteTag {
  id: string;
  quoteId: string;
  tag: string;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  description?: string;
  mainCategory: ProjectMainCategory;
  subCategory?: string;
  projectType: string;
  defaultAreaSqm: number;
  complexity: ComplexityLevel;
  condition?: ConditionLevel;
  estimatedHours: number;
  hourlyRate: number;
  specialFeatures: string[];
  lineItems: any; // JSON
  materials: any; // JSON
  isActive: boolean;
  usageCount: number;
}

// API Request/Response types
export interface CreateQuoteRequest {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  mainCategory: ProjectMainCategory;
  subCategory?: string;
  projectType: string;
  description?: string;
  location: string;
  areaSqm: number;
  complexity: ComplexityLevel;
  condition?: ConditionLevel;
  specialFeatures?: string[];
  hourlyRate?: number;
}

export interface EstimateQuoteRequest {
  mainCategory: ProjectMainCategory;
  projectType: string;
  areaSqm: number;
  complexity: ComplexityLevel;
  location: string;
  condition?: ConditionLevel;
  specialFeatures?: string[];
  clientName?: string;
  clientEmail?: string;
}

// === TIME REPORT SYSTEM TYPES ===

export type TimeReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface TimeReport {
  id: string;
  userId: string;
  weekNumber: number;
  year: number;
  weekStartDate: string;
  status: TimeReportStatus;
  totalHours: number;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvedById?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string; phone?: string };
  entries: TimeReportEntry[];
  approvedBy?: { name: string } | null;
}

export interface TimeReportEntry {
  id?: string;
  timeReportId?: string;
  projectId?: string | null;
  activityName: string;
  comment?: string | null;
  mondayHours: number;
  tuesdayHours: number;
  wednesdayHours: number;
  thursdayHours: number;
  fridayHours: number;
  saturdayHours: number;
  sundayHours: number;
  totalHours: number;
  sortOrder: number;
  project?: { id: string; title: string; projectNumber: string } | null;
}

export interface AccountantSettings {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  isActive: boolean;
  createdAt: string;
  hourlyRate?: number | null;
  vacationPayPercent?: number | null;
  personalNumber?: string | null;
  address?: string | null;
  bankAccount?: string | null;
  employmentStartDate?: string | null;
  employmentType?: string | null;
}

export interface EmployeeDetail extends Employee {
  timeReports: TimeReport[];
  stats: {
    totalReports: number;
    totalApprovedHours: number;
    pendingCount: number;
  };
}

// === CALENDAR SYSTEM TYPES ===

export type CalendarEventType = 'MEETING' | 'SITE_VISIT' | 'DEADLINE' | 'TASK' | 'REMINDER' | 'BLOCKED' | 'OTHER';
export type CalendarEventStatus = 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
export type CalendarRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';

export interface CalendarParticipant {
  id: string;
  eventId: string;
  userId: string;
  accepted: boolean;
  notified: boolean;
  user: { id: string; name: string; email: string };
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  type: CalendarEventType;
  status: CalendarEventStatus;
  color?: string;
  recurrence: CalendarRecurrence;
  recurrenceEndDate?: string;
  createdById: string;
  createdBy?: { id: string; name: string; email: string };
  projectId?: string;
  project?: { id: string; title: string; projectNumber: string };
  participants: CalendarParticipant[];
  externalId?: string;
  icalUid?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  type?: CalendarEventType;
  status?: CalendarEventStatus;
  color?: string;
  recurrence?: CalendarRecurrence;
  recurrenceEndDate?: string;
  projectId?: string;
  participantIds?: string[];
  notes?: string;
  externalId?: string;
}

export interface QuoteFilters {
  status?: QuoteStatus;
  mainCategory?: ProjectMainCategory;
  clientEmail?: string;
  search?: string;
  page?: number;
  limit?: number;
}