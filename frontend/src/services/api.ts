import axios, { AxiosInstance } from 'axios';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.client.defaults.headers.common['Authorization'];
  }

  // Auth
  login = async (email: string, password: string) => {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  };

  // Projects - Contractor
  getMyProjects = async () => {
    const response = await this.client.get('/projects/my');
    return response.data;
  };

  getProjectDetail = async (id: string) => {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  };

  submitReport = async (projectId: string, data: FormData) => {
    const response = await this.client.post(`/projects/${projectId}/report`, data, {
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
  }) => {
    const response = await this.client.put(`/projects/${id}`, data);
    return response.data;
  };

  deleteProject = async (id: string) => {
    const response = await this.client.delete(`/projects/${id}`);
    return response.data;
  };

  assignProject = async (projectId: string, contractorId: string) => {
    const response = await this.client.put(`/projects/${projectId}/assign`, { contractorId });
    return response.data;
  };

  getProjectStats = async () => {
    const response = await this.client.get('/projects/stats');
    return response.data;
  };

  approveReport = async (projectId: string, clientEmail: string) => {
    const response = await this.client.post(`/projects/${projectId}/approve`, { clientEmail });
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

  // Legacy methods för kompatibilitet
  getRecentOrders = async () => {
    return this.getRecentProjects();
  };

  getAllOrders = async () => {
    return this.getAllProjects();
  };

  getMyOrders = async () => {
    return this.getMyProjects();
  };

  getOrderDetail = async (id: string) => {
    return this.getProjectDetail(id);
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

  getContractorStats = async () => {
    const response = await this.client.get('/contractors/stats');
    return response.data;
  };

  // Analytics
  getAnalytics = async (period: string = '30d') => {
    const response = await this.client.get(`/projects/analytics?period=${period}`);
    return response.data;
  };
}

export const api = new ApiService(); 