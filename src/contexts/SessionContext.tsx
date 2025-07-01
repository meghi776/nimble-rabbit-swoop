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
  console.log("SessionContext: Component is rendering.");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("SessionContext: onAuthStateChange listener setup.");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`SessionContext: Auth state change event: ${event}`);
      console.log("SessionContext: currentSession:", currentSession); // Log the session object

      setSession(prevSession => {
        if (prevSession?.access_token === currentSession?.access_token && prevSession?.user?.id === currentSession?.user?.id) {
          console.log("SessionContext: Session object reference unchanged, skipping setSession.");
          return prevSession;
        }
        console.log("SessionContext: Session object changed, updating state.");
        return currentSession;
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
            return prevUser;
          }
          return { ...currentSession.user, can_preview: newCanPreview };
        });
      } else {
        console.log("SessionContext: No current user, setting user to null.");
        setUser(null);
      }
      setLoading(false);
      console.log(`SessionContext: Auth state changed to ${event}. Loading set to false.`);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (location.pathname === '/login') {
          console.log("SessionContext: Signed in/updated, redirecting from /login to /.");
          navigate('/');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("SessionContext: Signed out event detected.");
        if (location.pathname.startsWith('/admin')) {
          console.log("SessionContext: Signed out from admin path, redirecting to /login.");
          navigate('/login');
        }
      }
    });

    // Initial session check
    console.log("SessionContext: Initial getSession call.");
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log("SessionContext: Initial getSession result:", initialSession);
      setSession(prevSession => {
        if (prevSession?.access_token === initialSession?.access_token && prevSession?.user?.id === initialSession?.user?.id) {
          console.log("SessionContext: Initial session object reference unchanged, skipping setSession.");
          return prevSession;
        }
        console.log("SessionContext: Initial session object changed, updating state.");
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
        console.log("SessionContext: No initial user, setting user to null.");
        setUser(null);
      }
      setLoading(false);
      console.log("SessionContext: Initial getSession completed. Loading set to false.");
      if (!initialSession && location.pathname.startsWith('/admin')) {
        console.log("SessionContext: No initial session and on admin path, redirecting to /login.");
        navigate('/login');
      }
    });

    return () => {
      console.log("SessionContext: Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
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