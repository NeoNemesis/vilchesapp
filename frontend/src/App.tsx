import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import ContractorLayout from './components/layout/ContractorLayout';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProjects from './pages/admin/Projects';
import AdminProjectDetail from './pages/admin/ProjectDetail';
import AdminReports from './pages/admin/Reports';
import AdminContractors from './pages/admin/Contractors';

// Contractor Pages
import ContractorDashboard from './pages/contractor/Dashboard';
import ContractorProjects from './pages/contractor/Projects';
import ContractorProjectDetail from './pages/contractor/ProjectDetail';
import ReportForm from './pages/contractor/ReportForm';

// Auth Pages
import Login from './pages/VilchesLogin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
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
              <Route path="reports" element={<AdminReports />} />
              <Route path="contractors" element={<AdminContractors />} />
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
            </Route>
            
            {/* Redirect root to appropriate dashboard */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
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
  );
};

export default App; 