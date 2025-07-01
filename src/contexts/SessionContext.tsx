import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface CustomUser extends User {
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
  can_preview?: boolean; // Add can_preview to the user object
}

interface SessionContextType {
  session: Session | null;
  user: CustomUser | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("SessionContext: Component is rendering."); // NEW LOG HERE
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("SessionContext: onAuthStateChange listener setup."); // Added log
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      // Only update session state if the session object reference or its access token changes
      // This prevents unnecessary re-renders if only internal token refresh happens without user change.
      setSession(prevSession => {
        if (prevSession?.access_token === currentSession?.access_token && prevSession?.user?.id === currentSession?.user?.id) {
          return prevSession; // No change in relevant session data, keep old reference
        }
        return currentSession; // Session data changed, update
      });

      if (currentSession?.user) {
        // Fetch profile data including can_preview
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('can_preview')
          .eq('id', currentSession.user.id)
          .single();

        setUser(prevUser => {
          const newCanPreview = profileData?.can_preview || false;
          // Create a new user object only if the user ID or can_preview status has changed
          if (prevUser?.id === currentSession.user.id && prevUser?.can_preview === newCanPreview) {
            return prevUser; // No change in relevant user data, keep old reference
          }
          return { ...currentSession.user, can_preview: newCanPreview };
        });
      } else {
        setUser(null);
      }
      setLoading(false);
      console.log(`SessionContext: Auth state changed to ${event}. Loading set to false.`); // Added log

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (location.pathname === '/login') {
          navigate('/'); // Redirect authenticated users from login page to home
        }
      } else if (event === 'SIGNED_OUT') {
        if (location.pathname.startsWith('/admin')) {
          navigate('/login'); // Redirect unauthenticated users from admin to login
        }
      }
    });

    // Initial session check
    console.log("SessionContext: Initial getSession call."); // Added log
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(prevSession => {
        if (prevSession?.access_token === initialSession?.access_token && prevSession?.user?.id === initialSession?.user?.id) {
          return prevSession;
        }
        return initialSession;
      });

      if (initialSession?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('can_preview')
          .eq('id', initialSession.user.id)
          .single();

        setUser(prevUser => {
          const newCanPreview = profileData?.can_preview || false;
          if (prevUser?.id === initialSession.user.id && prevUser?.can_preview === newCanPreview) {
            return prevUser;
          }
          return { ...initialSession.user, can_preview: newCanPreview };
        });
      } else {
        setUser(null);
      }
      setLoading(false);
      console.log("SessionContext: Initial getSession completed. Loading set to false."); // Added log
      if (!initialSession && location.pathname.startsWith('/admin')) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return (
    <SessionContext.Provider value={{ session, user, loading }}>
      {children}
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