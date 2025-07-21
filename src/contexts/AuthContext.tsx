import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define the shape of our auth context
type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: 'farmer' | 'admin' | 'dispatch' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  getRedirectPath: () => string;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps your app and makes auth object available to any child component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'farmer' | 'admin' | 'dispatch' | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 AuthProvider useEffect started');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔄 Getting initial session...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session fetch error:', error);
          return;
        }
        
        setSession(data.session);
        if (data.session?.user) {
          setUser(data.session.user);
          // Extract role from user metadata
          const role = data.session.user.user_metadata?.role as 'farmer' | 'admin' | 'dispatch' | null;
          setUserRole(role);
          console.log('User role set to:', role);
        }
      } catch (error) {
        console.error('Session fetch exception:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('🔄 Auth state change:', event, !!currentSession);
        setSession(currentSession);
        
        if (currentSession?.user) {
          setUser(currentSession.user);
          // Extract role from user metadata
          const role = currentSession.user.user_metadata?.role as 'farmer' | 'admin' | 'dispatch' | null;
          setUserRole(role);
          console.log('User role updated to:', role);
        } else {
          setUser(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Define auth methods
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: userData
        }
      });
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Function to determine redirect path based on user role
  const getRedirectPath = () => {
    if (!user) return '/auth';
    
    switch (userRole) {
      case 'admin':
        return '/admin-dashboard';
      case 'dispatch':
        return '/dispatch-dashboard';
      case 'farmer':
        return '/farmer-dashboard';
      default:
        return '/'; // Default dashboard
    }
  };

  // Create the value object that will be provided by the context
  const value = {
    session,
    user,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    getRedirectPath
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}