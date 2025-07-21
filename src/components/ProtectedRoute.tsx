import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('farmer' | 'admin' | 'dispatch')[];
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['farmer', 'admin', 'dispatch'] 
}: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (profile && !allowedRoles.includes(profile.role)) {
    // Redirect to the appropriate dashboard based on role
    if (profile.role === 'farmer') {
      return <Navigate to="/farmer" replace />;
    } else if (profile.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (profile.role === 'dispatch') {
      return <Navigate to="/dispatch" replace />;
    }
  }
  
  return <>{children}</>;
};