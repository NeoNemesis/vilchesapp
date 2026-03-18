import axios, { AxiosInstance } from 'axios';

class ApiService {
  private client: AxiosInstance;
  private refreshPromise: Promise<any> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Viktigt för att skicka cookies
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // On 401/403, attempt a token refresh via cookies
        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Förhindra parallella refresh-anrop — återanvänd pågående refresh
            if (!this.refreshPromise) {
              this.refreshPromise = axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
                {},
                { withCredentials: true }
              ).finally(() => {
                this.refreshPromise = null;
              });
            }

            const refreshResponse = await this.refreshPromise;

            if (refreshResponse.data.success) {
              // Update cached user info
              if (refreshResponse.data.user) {
                localStorage.setItem('user', JSON.stringify(refreshResponse.data.user));
              }
              // Retry the original request (cookie is already updated by the server)
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.refreshPromise = null;
          }

          // Refresh failed - clear local state and redirect to login (only if not already there)
          localStorage.removeItem('user');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth
  login = async (email: string, password: string) => {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  };

  getMe = async () => {
    const response = await this.client.get('/auth/me');
    return response.data;
  };

  logout = async () => {
    const response = await this.client.post('/auth/logout');
    return response.data;
  };

  // Projects - Contractor / Employee
  getMyProjects = async () => {
    const response = await this.client.get('/projects/my');
    const data = response.data;
    // Normalize: backend may return array or { success, projects }
    if (Array.isArray(data)) return data;
    if (data?.projects && Array.isArray(data.projects)) return data.projects;
    return [];
  };

  getMyCompletedProjects = async () => {
    const response = await this.client.get('/projects/my/completed');
    return response.data;
  };

  getProject = async (id: string) => {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  };

  getProjectDetail = async (id: string) => {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  };

  submitReport = async (projectId: string, data: FormData, isDraft = false) => {
    // Lägg till isDraft i FormData
    const reportData = JSON.parse(data.get('reportData') as string || '{}');
    reportData.isDraft = isDraft;
    data.set('reportData', JSON.stringify(reportData));

    const response = await this.client.post(`/projects/${projectId}/report`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  };

  // Hämta utkast för projekt
  getDrafts = async (projectId: string) => {
    const response = await this.client.get(`/projects/${projectId}/drafts`);
    return response.data;
  };

  // Uppdatera befintlig rapport/utkast
  updateReport = async (projectId: string, reportId: string, data: FormData, isDraft = false) => {
    const reportData = JSON.parse(data.get('reportData') as string || '{}');
    reportData.isDraft = isDraft;
    data.set('reportData', JSON.stringify(reportData));

    const response = await this.client.put(`/projects/${projectId}/reports/${reportId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  };

  // Projects - Admin
  getAllProjects = async () => {
    const response = await this.client.get('/projects');
    return response.data;
  };

  createProject = async (data: {
    title: string;
    description: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    address: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    estimatedHours?: number;
    estimatedCost?: number; // Ändrat från budget
    deadline?: string;
    assignedToId?: string; // Ändrat från contractorId
    images?: File[];
  }) => {
    // Om det finns bilder, använd FormData
    if (data.images && data.images.length > 0) {
      const formData = new FormData();

      // Lägg till alla fält utom images
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'images' && value !== undefined && value !== '') {
          formData.append(key, value.toString());
        }
      });

      // Lägg till bilder
      data.images.forEach(file => {
        formData.append('images', file);
      });

      const response = await this.client.post('/projects', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Ingen bilder, använd vanlig JSON
      const { images, ...projectData } = data;
      const response = await this.client.post('/projects', projectData);
      return response.data;
    }
  };

  updateProject = async (id: string, data: {
    title?: string;
    description?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    address?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    estimatedHours?: number;
    budget?: number;
    deadline?: string;
    status?: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    contractorId?: string | null;
    images?: File[];
  }) => {
    // Om bilder finns, använd FormData
    if (data.images && data.images.length > 0) {
      const formData = new FormData();

      // Lägg till alla projekt-fält
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'images' && value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Lägg till bilder
      data.images.forEach((file) => {
        formData.append('images', file);
      });

      const response = await this.client.put(`/projects/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Ingen bilder, använd vanlig JSON
      const { images, ...projectData } = data;
      const response = await this.client.put(`/projects/${id}`, projectData);
      return response.data;
    }
  };

  deleteProject = async (id: string) => {
    const response = await this.client.delete(`/projects/${id}`);
    return response.data;
  };

  deleteProjectImage = async (projectId: string, imageId: string) => {
    const response = await this.client.delete(`/projects/${projectId}/images/${imageId}`);
    return response.data;
  };

  uploadProjectImages = async (projectId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    const response = await this.client.post(`/projects/${projectId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  };

  assignProject = async (projectId: string, contractorId: string) => {
    const response = await this.client.put(`/projects/${projectId}/assign`, { contractorId });
    return response.data;
  };

  // Rapport-hantering för admins
  getReport = async (reportId: string) => {
    const response = await this.client.get(`/projects/reports/${reportId}`);
    return response.data.report;
  };

  approveReport = async (reportId: string, sendToClient: boolean = false) => {
    const response = await this.client.post(`/projects/reports/${reportId}/approve`, { sendToClient });
    return response.data;
  };

  rejectReport = async (reportId: string, reason?: string) => {
    const response = await this.client.post(`/projects/reports/${reportId}/reject`, { reason });
    return response.data;
  };

  // Dashboard
  getDashboardStats = async () => {
    const response = await this.client.get('/projects/dashboard-stats');
    return response.data;
  };

  getRecentProjects = async () => {
    const response = await this.client.get('/projects/recent');
    return response.data;
  };

  // Contractors
  getContractors = async () => {
    const response = await this.client.get('/contractors');
    return response.data;
  };

  createContractor = async (data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    isActive?: boolean;
  }) => {
    const response = await this.client.post('/contractors', data);
    return response.data;
  };

  updateContractor = async (id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    isActive?: boolean;
  }) => {
    const response = await this.client.put(`/contractors/${id}`, data);
    return response.data;
  };

  deleteContractor = async (id: string) => {
    const response = await this.client.delete(`/contractors/${id}`);
    return response.data;
  };

  // Email-funktioner för entreprenörer
  sendWelcomeEmail = async (contractorId: string) => {
    const response = await this.client.post(`/contractors/${contractorId}/send-welcome`);
    return response.data;
  };

  sendPasswordResetEmail = async (contractorId: string) => {
    const response = await this.client.post(`/contractors/${contractorId}/reset-password`);
    return response.data;
  };

  // Project acceptance/rejection
  acceptProject = async (projectId: string) => {
    const response = await this.client.put(`/projects/${projectId}/accept`);
    return response.data;
  };

  rejectProject = async (projectId: string, reason?: string) => {
    const response = await this.client.put(`/projects/${projectId}/reject`, { reason });
    return response.data;
  };

  // Analytics
  getAnalytics = async (period: string = '30d') => {
    const response = await this.client.get(`/projects/analytics?period=${period}`);
    return response.data;
  };

  getRecentActivities = async () => {
    const response = await this.client.get('/projects/recent-activities');
    return response.data;
  };

  // Google Analytics
  getGoogleAnalyticsFull = async (days: number = 30) => {
    const response = await this.client.get(`/analytics/full?days=${days}`);
    return response.data;
  };

  // Cache-hantering för Google Analytics
  clearAnalyticsCache = async () => {
    const response = await this.client.post('/analytics/cache/clear');
    return response.data;
  };

  getAnalyticsCacheInfo = async () => {
    const response = await this.client.get('/analytics/cache/info');
    return response.data;
  };

  // Geocoding-funktioner
  geocodeAddress = async (address: string) => {
    const response = await this.client.get(`/geocoding/geocode?q=${encodeURIComponent(address)}`);
    return response.data;
  };

  // === QUOTE SYSTEM ===

  // AI-driven estimat
  estimateQuote = async (data: any) => {
    const response = await this.client.post('/quotes/estimate', data);
    return response.data;
  };

  // Lista offerter med filter
  getQuotes = async (filters?: {
    status?: string;
    mainCategory?: string;
    clientEmail?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await this.client.get(`/quotes?${params.toString()}`);
    return response.data;
  };

  // Hämta en offert
  getQuote = async (id: string) => {
    const response = await this.client.get(`/quotes/${id}`);
    return response.data;
  };

  // Skapa ny offert
  createQuote = async (data: any) => {
    const response = await this.client.post('/quotes', data);
    return response.data;
  };

  // Uppdatera offert
  updateQuote = async (id: string, data: any) => {
    const response = await this.client.put(`/quotes/${id}`, data);
    return response.data;
  };

  // Ta bort offert
  deleteQuote = async (id: string) => {
    const response = await this.client.delete(`/quotes/${id}`);
    return response.data;
  };

  // Skicka offert via email
  sendQuote = async (id: string, data: { to: string; message?: string; selectedImageIds?: string[] }) => {
    const response = await this.client.post(`/quotes/${id}/send`, data);
    return response.data;
  };

  // Generera PDF
  getQuotePDF = async (id: string) => {
    const response = await this.client.get(`/quotes/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  };

  // Skapa projekt från offert
  createProjectFromQuote = async (id: string) => {
    const response = await this.client.post(`/quotes/${id}/create-project`);
    return response.data;
  };

  // Acceptera offert
  acceptQuote = async (id: string) => {
    const response = await this.client.post(`/quotes/${id}/accept`);
    return response.data;
  };

  // Hämta projektmallar
  getQuoteTemplates = async () => {
    const response = await this.client.get('/quotes/templates/list');
    return response.data;
  };

  // Använd projektmall
  useQuoteTemplate = async (templateId: string, data: { clientName: string; areaSqm?: number }) => {
    const response = await this.client.post(`/quotes/templates/${templateId}/use`, data);
    return response.data;
  };

  // Sök befintliga kunder för autocomplete
  searchCustomers = async (query: string) => {
    const response = await this.client.get(`/quotes/customers/search?q=${encodeURIComponent(query)}`);
    return response.data;
  };

  // === QUOTE IMAGES ===

  uploadQuoteImages = async (quoteId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    const response = await this.client.post(`/quotes/${quoteId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  };

  getQuoteImages = async (quoteId: string) => {
    const response = await this.client.get(`/quotes/${quoteId}/images`);
    return response.data;
  };

  updateQuoteImage = async (imageId: string, data: { description?: string }) => {
    const response = await this.client.put(`/quotes/images/${imageId}`, data);
    return response.data;
  };

  deleteQuoteImage = async (imageId: string) => {
    const response = await this.client.delete(`/quotes/images/${imageId}`);
    return response.data;
  };

  // === AUTOMATIONS / N8N ===

  getAutomationsStatus = async () => {
    const response = await this.client.get('/automations/status');
    return response.data;
  };

  testAutomation = async (workflowId: string) => {
    const response = await this.client.post(`/automations/test/${workflowId}`);
    return response.data;
  };

  // === AKTIVITETSLOGGAR ===

  getActivityLogs = async (filters?: {
    category?: string;
    severity?: string;
    type?: string;
    search?: string;
    days?: number;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await this.client.get(`/activity-logs?${params.toString()}`);
    return response.data;
  };

  getActivityLogStats = async (days: number = 30) => {
    const response = await this.client.get(`/activity-logs/stats?days=${days}`);
    return response.data;
  };

  cleanupActivityLogs = async (days: number = 90) => {
    const response = await this.client.delete(`/activity-logs/cleanup?days=${days}`);
    return response.data;
  };

  markLogAsRead = async (id: string) => {
    const response = await this.client.put(`/activity-logs/${id}/read`);
    return response.data;
  };

  // === EMPLOYEES ===

  getEmployees = async () => {
    const response = await this.client.get('/employees');
    return response.data;
  };

  getEmployee = async (id: string) => {
    const response = await this.client.get(`/employees/${id}`);
    return response.data;
  };

  createEmployee = async (data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    isActive?: boolean;
    hourlyRate?: number;
    vacationPayPercent?: number;
    personalNumber?: string;
    address?: string;
    bankAccount?: string;
    employmentStartDate?: string;
    employmentType?: string;
  }) => {
    const response = await this.client.post('/employees', data);
    return response.data;
  };

  updateEmployee = async (id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    isActive?: boolean;
    hourlyRate?: number | null;
    vacationPayPercent?: number | null;
    personalNumber?: string | null;
    address?: string | null;
    bankAccount?: string | null;
    employmentStartDate?: string | null;
    employmentType?: string | null;
  }) => {
    const response = await this.client.put(`/employees/${id}`, data);
    return response.data;
  };

  deleteEmployee = async (id: string) => {
    const response = await this.client.delete(`/employees/${id}`);
    return response.data;
  };

  sendEmployeeWelcomeEmail = async (employeeId: string) => {
    const response = await this.client.post(`/employees/${employeeId}/send-welcome`);
    return response.data;
  };

  sendEmployeePasswordReset = async (employeeId: string) => {
    const response = await this.client.post(`/employees/${employeeId}/reset-password`);
    return response.data;
  };

  // === TIME REPORTS (Employee) ===

  getMyTimeReports = async (filters?: { year?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await this.client.get(`/time-reports/my?${params.toString()}`);
    return response.data;
  };

  getMyTimeReport = async (id: string) => {
    const response = await this.client.get(`/time-reports/my/${id}`);
    return response.data;
  };

  createTimeReport = async (data: any) => {
    const response = await this.client.post('/time-reports', data);
    return response.data;
  };

  updateTimeReport = async (id: string, data: any) => {
    const response = await this.client.put(`/time-reports/${id}`, data);
    return response.data;
  };

  submitTimeReport = async (id: string) => {
    const response = await this.client.post(`/time-reports/${id}/submit`);
    return response.data;
  };

  getMyProjects_Employee = async () => {
    const response = await this.client.get('/time-reports/my/projects');
    return response.data;
  };

  // === TIME REPORTS (Admin) ===

  getAdminTimeReports = async (filters?: {
    employee?: string;
    weekNumber?: number;
    year?: number;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await this.client.get(`/time-reports/admin?${params.toString()}`);
    return response.data;
  };

  getAdminTimeReport = async (id: string) => {
    const response = await this.client.get(`/time-reports/admin/${id}`);
    return response.data;
  };

  updateAdminTimeReport = async (id: string, data: { entries: any[] }) => {
    const response = await this.client.put(`/time-reports/admin/${id}`, data);
    return response.data;
  };

  createAdminTimeReport = async (data: { userId: string; weekNumber: number; year: number; weekStartDate: string; entries: any[] }) => {
    const response = await this.client.post('/time-reports/admin/create', data);
    return response.data;
  };

  deleteAdminTimeReport = async (id: string) => {
    const response = await this.client.delete(`/time-reports/admin/${id}`);
    return response.data;
  };

  getTimeReportSummary = async () => {
    const response = await this.client.get('/time-reports/admin/summary');
    return response.data;
  };

  getTimeReportReporters = async () => {
    const response = await this.client.get('/time-reports/admin/reporters');
    return response.data;
  };

  approveTimeReport = async (id: string) => {
    const response = await this.client.post(`/time-reports/admin/${id}/approve`);
    return response.data;
  };

  rejectTimeReport = async (id: string, reason: string) => {
    const response = await this.client.post(`/time-reports/admin/${id}/reject`, { reason });
    return response.data;
  };

  bulkApproveTimeReports = async (ids: string[]) => {
    const response = await this.client.post('/time-reports/admin/bulk-approve', { ids });
    return response.data;
  };

  sendTimeReportToAccountant = async (id: string, format: 'pdf' | 'csv' | 'both') => {
    const response = await this.client.post(`/time-reports/admin/${id}/send-to-accountant`, { format });
    return response.data;
  };

  getTimeReportPdf = async (id: string) => {
    const response = await this.client.get(`/time-reports/admin/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  };

  getTimeReportCsv = async (id: string) => {
    const response = await this.client.get(`/time-reports/admin/${id}/csv`, {
      responseType: 'blob'
    });
    return response.data;
  };

  // === PERIOD LOCKS ===

  getLockedPeriods = async (year?: number) => {
    const params = year ? `?year=${year}` : '';
    const response = await this.client.get(`/time-reports/locked-periods${params}`);
    return response.data;
  };

  lockPeriod = async (data: { year: number; month: number; note?: string }) => {
    const response = await this.client.post('/time-reports/admin/lock-period', data);
    return response.data;
  };

  unlockPeriod = async (id: string) => {
    const response = await this.client.delete(`/time-reports/admin/lock-period/${id}`);
    return response.data;
  };

  // === ACCOUNTANT SETTINGS ===

  getAccountantSettings = async () => {
    const response = await this.client.get('/settings/accountant');
    return response.data;
  };

  saveAccountantSettings = async (data: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  }) => {
    const response = await this.client.put('/settings/accountant', data);
    return response.data;
  };

  sendAccountantTestEmail = async () => {
    const response = await this.client.post('/settings/accountant/test-email');
    return response.data;
  };

  // === FORTNOX SETTINGS ===

  getFortnoxSettings = async () => {
    const response = await this.client.get('/settings/fortnox');
    return response.data;
  };

  saveFortnoxCredentials = async (data: { clientId: string; clientSecret: string }) => {
    const response = await this.client.put('/settings/fortnox/credentials', data);
    return response.data;
  };

  getFortnoxAuthUrl = async () => {
    const response = await this.client.get('/settings/fortnox/auth-url');
    return response.data;
  };

  disconnectFortnox = async () => {
    const response = await this.client.post('/settings/fortnox/disconnect');
    return response.data;
  };

  testFortnoxConnection = async () => {
    const response = await this.client.post('/settings/fortnox/test');
    return response.data;
  };

  syncFortnoxEmployees = async () => {
    const response = await this.client.post('/settings/fortnox/sync-employees');
    return response.data;
  };

  getFortnoxSalaryLogs = async (limit: number = 20) => {
    const response = await this.client.get(`/settings/fortnox/salary-logs?limit=${limit}`);
    return response.data;
  };

  // === INVOICES ===

  requestBillingInfo = async (quoteId: string) => {
    const response = await this.client.post(`/invoices/request-billing-info/${quoteId}`);
    return response.data;
  };

  createInvoiceFromQuote = async (quoteId: string) => {
    const response = await this.client.post(`/invoices/from-quote/${quoteId}`);
    return response.data;
  };

  sendInvoice = async (logId: string) => {
    const response = await this.client.post(`/invoices/${logId}/send`);
    return response.data;
  };

  getInvoiceLogs = async (limit: number = 20) => {
    const response = await this.client.get(`/invoices/logs?limit=${limit}`);
    return response.data;
  };

  // === CALENDAR ===

  getCalendarEvents = async (params?: { start?: string; end?: string; userId?: string; type?: string; projectId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.start) searchParams.set('start', params.start);
    if (params?.end) searchParams.set('end', params.end);
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    const query = searchParams.toString();
    const response = await this.client.get(`/calendar/events${query ? `?${query}` : ''}`);
    return response.data;
  };

  getCalendarEvent = async (id: string) => {
    const response = await this.client.get(`/calendar/events/${id}`);
    return response.data;
  };

  createCalendarEvent = async (data: any) => {
    const response = await this.client.post('/calendar/events', data);
    return response.data;
  };

  updateCalendarEvent = async (id: string, data: any) => {
    const response = await this.client.put(`/calendar/events/${id}`, data);
    return response.data;
  };

  deleteCalendarEvent = async (id: string) => {
    const response = await this.client.delete(`/calendar/events/${id}`);
    return response.data;
  };

  respondToCalendarEvent = async (id: string, accepted: boolean) => {
    const response = await this.client.post(`/calendar/events/${id}/respond`, { accepted });
    return response.data;
  };

  getCalendarUsers = async () => {
    const response = await this.client.get('/calendar/users');
    return response.data;
  };

  getCalendarFeedUrl = async () => {
    const response = await this.client.get('/calendar/feed-url');
    return response.data;
  };

  // === KUNDER (Kundregister) ===

  getCustomers = async (filters?: { search?: string; active?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.active !== undefined) params.append('active', String(filters.active));
    const response = await this.client.get(`/customers?${params.toString()}`);
    return response.data;
  };

  getCustomer = async (id: string) => {
    const response = await this.client.get(`/customers/${id}`);
    return response.data;
  };

  createCustomer = async (data: any) => {
    const response = await this.client.post('/customers', data);
    return response.data;
  };

  updateCustomer = async (id: string, data: any) => {
    const response = await this.client.put(`/customers/${id}`, data);
    return response.data;
  };

  deleteCustomer = async (id: string) => {
    const response = await this.client.delete(`/customers/${id}`);
    return response.data;
  };

  getCustomerHistory = async (id: string) => {
    const response = await this.client.get(`/customers/${id}/history`);
    return response.data;
  };

  // === FAKTUROR (Fristående) ===

  getStandaloneInvoices = async (filters?: { status?: string; customerId?: string; search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value));
      });
    }
    const response = await this.client.get(`/standalone-invoices?${params.toString()}`);
    return response.data;
  };

  getStandaloneInvoice = async (id: string) => {
    const response = await this.client.get(`/standalone-invoices/${id}`);
    return response.data;
  };

  getNextInvoiceNumber = async () => {
    const response = await this.client.get('/standalone-invoices/next-number');
    return response.data;
  };

  createStandaloneInvoice = async (data: any) => {
    const response = await this.client.post('/standalone-invoices', data);
    return response.data;
  };

  updateStandaloneInvoice = async (id: string, data: any) => {
    const response = await this.client.put(`/standalone-invoices/${id}`, data);
    return response.data;
  };

  deleteStandaloneInvoice = async (id: string) => {
    const response = await this.client.delete(`/standalone-invoices/${id}`);
    return response.data;
  };

  sendStandaloneInvoice = async (id: string) => {
    const response = await this.client.post(`/standalone-invoices/${id}/send`);
    return response.data;
  };

  markInvoicePaid = async (id: string) => {
    const response = await this.client.post(`/standalone-invoices/${id}/mark-paid`);
    return response.data;
  };

  getInvoiceStats = async () => {
    const response = await this.client.get('/standalone-invoices/stats');
    return response.data;
  };

  // Direkta HTTP-metoder för generisk användning
  get = async (url: string) => {
    const response = await this.client.get(url);
    return response.data;
  };

  post = async (url: string, data?: any, config?: any) => {
    const response = await this.client.post(url, data, config);
    return response.data;
  };

  put = async (url: string, data?: any) => {
    const response = await this.client.put(url, data);
    return response.data;
  };

  delete = async (url: string) => {
    const response = await this.client.delete(url);
    return response.data;
  };
}

export const api = new ApiService();
