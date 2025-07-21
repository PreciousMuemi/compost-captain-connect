import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  full_name: string;
  phone_number: string;
  location?: string;
  role: 'farmer' | 'admin' | 'dispatch';
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("🔥 AuthProvider: Getting initial session");
        const { data: { session } } = await supabase.auth.getSession();
        console.log("🔥 Session fetched:", session?.user?.id);
        setUser(session?.user || null);
        
        if (session?.user) {
          console.log("🔥 User found, fetching profile...");
          await fetchProfile(session.user.id);
        } else {
          console.log("🔥 No session, setting loading false");
          setLoading(false);
        }
      } catch (error) {
        console.error("🔥 Error getting initial session:", error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔥 AuthProvider: Auth state changed:", event, session?.user?.id);
        setUser(session?.user || null);
        
        if (session?.user) {
          console.log("🔥 Auth change: User found, fetching profile...");
          await fetchProfile(session.user.id);
        } else {
          console.log("🔥 Auth change: No user, clearing state");
          setProfile(null);
          setLoading(false);
          
          if (event === 'SIGNED_OUT') {
            navigate('/auth');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("🔥 AuthProvider: Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, location, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error("🔥 Error fetching profile:", error);
        setProfile(null);
      } else if (data) {
        console.log("🔥 AuthProvider: Profile fetched successfully:", data);
        setProfile(data as Profile);
      } else {
        console.log("🔥 AuthProvider: No profile found for user");
        setProfile(null);
      }
    } catch (error) {
      console.error("🔥 Error in fetchProfile:", error);
      setProfile(null);
    } finally {
      console.log("🔥 Setting loading to false");
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);