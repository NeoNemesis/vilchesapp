import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layouts - loaded eagerly (always needed)
import AdminLayout from './components/layout/AdminLayout';
import ContractorLayout from './components/layout/ContractorLayout';
import EmployeeLayout from './components/layout/EmployeeLayout';
import AccountantLayout from './components/layout/AccountantLayout';

// Auth Pages - loaded eagerly (first thing users see)
import Login from './pages/VilchesLogin';

// Lazy-loaded pages
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PublicQuote = lazy(() => import('./pages/PublicQuote'));
const PublicBillingInfo = lazy(() => import('./pages/PublicBillingInfo'));

// Admin Pages (lazy)
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProjects = lazy(() => import('./pages/admin/Projects'));
const AdminProjectDetail = lazy(() => import('./pages/admin/ProjectDetail'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminContractors = lazy(() => import('./pages/admin/Contractors'));
const AdminReportDetail = lazy(() => import('./pages/admin/ReportDetail'));
const AdminCalendar = lazy(() => import('./pages/admin/Calendar'));
const AdminMapView = lazy(() => import('./pages/admin/MapView'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminQuotes = lazy(() => import('./pages/admin/Quotes'));
const AdminQuoteNew = lazy(() => import('./pages/admin/QuoteNew'));
const AdminQuoteDetail = lazy(() => import('./pages/admin/QuoteDetail'));
const AdminMaterials = lazy(() => import('./pages/admin/Materials'));
const AdminQuoteTemplates = lazy(() => import('./pages/admin/QuoteTemplates'));
const AdminActivityLogs = lazy(() => import('./pages/admin/ActivityLogs'));
const AdminEmployees = lazy(() => import('./pages/admin/Employees'));
const AdminEmployeeDetail = lazy(() => import('./pages/admin/EmployeeDetail'));
const AdminTimeReports = lazy(() => import('./pages/admin/TimeReports'));
const AdminTimeReportDetail = lazy(() => import('./pages/admin/TimeReportDetail'));
const AdminSalary = lazy(() => import('./pages/admin/Salary'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminCustomerDetail = lazy(() => import('./pages/admin/CustomerDetail'));
const AdminInvoices = lazy(() => import('./pages/admin/Invoices'));
const AdminInvoiceNew = lazy(() => import('./pages/admin/InvoiceNew'));

// Contractor Pages (lazy)
const ContractorDashboard = lazy(() => import('./pages/contractor/Dashboard'));
const ContractorProjects = lazy(() => import('./pages/contractor/Projects'));
const ContractorProjectDetail = lazy(() => import('./pages/contractor/ProjectDetail'));
const ReportForm = lazy(() => import('./pages/contractor/ReportForm'));
const ContractorSettings = lazy(() => import('./pages/contractor/Settings'));
const Calendar = lazy(() => import('./pages/contractor/Calendar'));
const MapView = lazy(() => import('./pages/contractor/MapView'));
const Documents = lazy(() => import('./pages/contractor/Documents'));
// Employee Pages (lazy)
const EmployeeDashboard = lazy(() => import('./pages/employee/Dashboard'));
const EmployeeTimeReport = lazy(() => import('./pages/employee/TimeReport'));
const EmployeeSalary = lazy(() => import('./pages/employee/Salary'));
const EmployeeSettings = lazy(() => import('./pages/employee/Settings'));

// Accountant Pages (lazy)
const AccountantDashboard = lazy(() => import('./pages/accountant/Dashboard'));
const AccountantTimeReports = lazy(() => import('./pages/accountant/TimeReports'));
const AccountantEmployees = lazy(() => import('./pages/accountant/Employees'));
const AccountantSalary = lazy(() => import('./pages/accountant/Salary'));
const AccountantExport = lazy(() => import('./pages/accountant/Export'));
const AccountantSettings = lazy(() => import('./pages/accountant/Settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/quote/:id" element={<PublicQuote />} />
                <Route path="/billing-info/:token" element={<PublicBillingInfo />} />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="projects" element={<AdminProjects />} />
                  <Route path="projects/:id" element={<AdminProjectDetail />} />
                  <Route path="quotes" element={<AdminQuotes />} />
                  <Route path="quotes/new" element={<AdminQuoteNew />} />
                  <Route path="quotes/:id" element={<AdminQuoteDetail />} />
                  <Route path="quote-templates" element={<AdminQuoteTemplates />} />
                  <Route path="materials" element={<AdminMaterials />} />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="reports/:id" element={<AdminReportDetail />} />
                  <Route path="calendar" element={<AdminCalendar />} />
                  <Route path="map" element={<AdminMapView />} />
                  <Route path="contractors" element={<AdminContractors />} />
                  <Route path="employees" element={<AdminEmployees />} />
                  <Route path="employees/:id" element={<AdminEmployeeDetail />} />
                  <Route path="time-reports" element={<AdminTimeReports />} />
                  <Route path="time-reports/:id" element={<AdminTimeReportDetail />} />
                  <Route path="salary" element={<AdminSalary />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="customers/:id" element={<AdminCustomerDetail />} />
                  <Route path="invoices" element={<AdminInvoices />} />
                  <Route path="invoices/new" element={<AdminInvoiceNew />} />
                  <Route path="activity-logs" element={<AdminActivityLogs />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* Contractor Routes */}
                <Route
                  path="/contractor"
                  element={
                    <ProtectedRoute allowedRoles={['CONTRACTOR']}>
                      <ContractorLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<ContractorDashboard />} />
                  <Route path="projects" element={<ContractorProjects />} />
                  <Route path="projects/:id" element={<ContractorProjectDetail />} />
                  <Route path="projects/:id/report" element={<ReportForm />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="map" element={<MapView />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="settings" element={<ContractorSettings />} />
                </Route>

                {/* Employee Routes (superset of Contractor) */}
                <Route
                  path="/employee"
                  element={
                    <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                      <EmployeeLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<EmployeeDashboard />} />
                  <Route path="time-report" element={<EmployeeTimeReport />} />
                  <Route path="salary" element={<EmployeeSalary />} />
                  <Route path="projects" element={<ContractorProjects />} />
                  <Route path="projects/:id" element={<ContractorProjectDetail />} />
                  <Route path="projects/:id/report" element={<ReportForm />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="map" element={<MapView />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="settings" element={<EmployeeSettings />} />
                </Route>

                {/* Accountant Routes */}
                <Route
                  path="/accountant"
                  element={
                    <ProtectedRoute allowedRoles={['ACCOUNTANT']}>
                      <AccountantLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AccountantDashboard />} />
                  <Route path="time-reports" element={<AccountantTimeReports />} />
                  <Route path="employees" element={<AccountantEmployees />} />
                  <Route path="salary" element={<AccountantSalary />} />
                  <Route path="export" element={<AccountantExport />} />
                  <Route path="settings" element={<AccountantSettings />} />
                </Route>

                {/* Redirect root to appropriate dashboard */}
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
