import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'admin';
}

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null; // Add profile to context type
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // New state for profile
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setLoading(false);

      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user.id); // Fetch profile when user is available
      } else {
        setProfile(null); // Clear profile if no user
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (location.pathname === '/login') {
          navigate('/'); // Redirect authenticated users from login page to home
        }
      } else if (event === 'SIGNED_OUT') {
        if (location.pathname.startsWith('/admin')) {
          navigate('/login'); // Redirect unauthenticated users from admin to login
          toast.info("You have been signed out. Please log in to access admin features.");
        }
      }
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user.id);
      }
      setLoading(false);
      if (!initialSession && location.pathname.startsWith('/admin')) {
        navigate('/login');
        toast.info("Please log in to access admin features.");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return (
    <SessionContext.Provider value={{ session, user, profile, loading }}>
      {children}
      <Toaster />
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};