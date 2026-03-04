import { useAuth } from '../contexts/AuthContext';

export function useBasePath(): string {
  const { user } = useAuth();
  return user?.role === 'EMPLOYEE' ? '/employee' : '/contractor';
}
