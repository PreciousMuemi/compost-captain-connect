import { supabase } from '@/integrations/supabase/client';

// Helper function to add timeout to promises
export const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Safe session getter with timeout
export const getSessionSafe = async (timeoutMs: number = 8000) => {
  try {
    return await withTimeout(supabase.auth.getSession(), timeoutMs);
  } catch (error) {
    console.error('Session fetch failed:', error);
    return { data: { session: null }, error: error as Error };
  }
};

// Safe sign in with timeout
export const signInSafe = async (email: string, password: string, timeoutMs: number = 10000) => {
  try {
    return await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      timeoutMs
    );
  } catch (error) {
    console.error('Sign in failed:', error);
    return { 
      data: { user: null, session: null }, 
      error: error as Error 
    };
  }
};

// Safe sign up with timeout
export const signUpSafe = async (
  email: string, 
  password: string, 
  options?: any, 
  timeoutMs: number = 15000
) => {
  try {
    return await withTimeout(
      supabase.auth.signUp({ email, password, options }),
      timeoutMs
    );
  } catch (error) {
    console.error('Sign up failed:', error);
    return { 
      data: { user: null, session: null }, 
      error: error as Error 
    };
  }
};

// Simple connection health check
export const checkConnection = async (): Promise<boolean> => {
  try {
    const result = await withTimeout(
      (async () => await supabase.from('profiles').select('id').limit(1))(),
      5000
    );
    return !result.error;
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
};