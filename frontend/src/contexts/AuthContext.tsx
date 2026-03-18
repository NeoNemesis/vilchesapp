import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CONTRACTOR' | 'EMPLOYEE' | 'ACCOUNTANT';
  company?: string;
  phone?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Validate session by calling /auth/me (uses httpOnly cookie)
      const response = await api.getMe();
      if (response.success && response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
      } else {
        localStorage.removeItem('user');
      }
    } catch (error) {
      // Session invalid or expired - clear local state
      localStorage.removeItem('user');
    }
    setLoading(false);
  };

  const login = (userData: User) => {
    // Only store user info for UI purposes; auth is handled by httpOnly cookies
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    toast.success(`Välkommen ${userData.name}!`);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      // Proceed with local cleanup even if server logout fails
    }
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Du har loggat ut');
    window.location.href = '/login';
  };

  const updateUser = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}; 