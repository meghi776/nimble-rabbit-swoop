import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useSession } from '@/contexts/SessionContext'; // Import useSession
import { Loader2 } from 'lucide-react'; // Import Loader2 icon

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // Initialize useNavigate
  const { user, loading: sessionLoading } = useSession(); // Get user and loading state from session context

  const type = searchParams.get('type');
  const initialView = type === 'recovery' ? 'update_password' : 'sign_in';

  // Get the 'redirect_to' parameter from the URL, default to the homepage if not present
  const redirectTo = searchParams.get('redirect_to') || '/'; // Default to '/' if no redirect_to

  useEffect(() => {
    // If session is not loading and user is logged in, redirect immediately
    if (!sessionLoading && user) {
      console.log("Login.tsx: User already logged in, redirecting to:", redirectTo);
      navigate(redirectTo, { replace: true }); // Use replace to prevent going back to login page
    }
  }, [user, sessionLoading, navigate, redirectTo]);

  // Show a loading spinner while session is being checked
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Welcome to Meghi
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300">Sign in or create an account</p>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={[]} // You can add 'google', 'github', etc. here if needed
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="light" // Use light theme by default, can be made dynamic
            view={initialView} // Set the view based on URL parameter
            redirectTo={window.location.origin + redirectTo} // Supabase Auth needs full URL for redirectTo
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;