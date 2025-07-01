import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
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
      console.log("SessionContext: currentSession:", currentSession);

      setSession(prevSession => {
        const isSameAccessToken = prevSession?.access_token === currentSession?.access_token;
        const isSameUserId = prevSession?.user?.id === currentSession?.user?.id;
        console.log(`SessionContext: setSession check - isSameAccessToken: ${isSameAccessToken}, isSameUserId: ${isSameUserId}`);
        if (isSameAccessToken && isSameUserId) {
          console.log("SessionContext: Session object reference unchanged, skipping setSession.");
          return prevSession;
        }
        console.log("SessionContext: Session object changed, updating state. New access_token (first 10 chars):", currentSession?.access_token?.substring(0, 10), "New user ID:", currentSession?.user?.id);
        return currentSession;
      });

      if (currentSession?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('can_preview')
          .eq('id', currentSession.user.id)
          .single();

        setUser(prevUser => {
          const newCanPreview = profileData?.can_preview || false;
          const isSameUserId = prevUser?.id === currentSession.user.id;
          const isSameCanPreview = prevUser?.can_preview === newCanPreview;
          console.log(`SessionContext: setUser check - isSameUserId: ${isSameUserId}, isSameCanPreview: ${isSameCanPreview}`);
          if (isSameUserId && isSameCanPreview) {
            return prevUser;
          }
          console.log("SessionContext: User object changed, updating state. New can_preview:", newCanPreview);
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

    console.log("SessionContext: Initial getSession call.");
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log("SessionContext: Initial getSession result:", initialSession);
      setSession(prevSession => {
        const isSameAccessToken = prevSession?.access_token === initialSession?.access_token;
        const isSameUserId = prevSession?.user?.id === initialSession?.user?.id;
        console.log(`SessionContext: Initial setSession check - isSameAccessToken: ${isSameAccessToken}, isSameUserId: ${isSameUserId}`);
        if (isSameAccessToken && isSameUserId) {
          console.log("SessionContext: Initial session object reference unchanged, skipping setSession.");
          return prevSession;
        }
        console.log("SessionContext: Initial session object changed, updating state. New access_token (first 10 chars):", initialSession?.access_token?.substring(0, 10), "New user ID:", initialSession?.user?.id);
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
          const isSameUserId = prevUser?.id === initialSession.user.id;
          const isSameCanPreview = prevUser?.can_preview === newCanPreview;
          console.log(`SessionContext: Initial setUser check - isSameUserId: ${isSameUserId}, isSameCanPreview: ${isSameCanPreview}`);
          if (isSameUserId && isSameCanPreview) {
            return prevUser;
          }
          console.log("SessionContext: Initial user object changed, updating state. New can_preview:", newCanPreview);
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

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({
    session,
    user,
    loading
  }), [session, user, loading]);

  return (
    <SessionContext.Provider value={contextValue}>
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