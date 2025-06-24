import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams

const Login = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const initialView = type === 'recovery' ? 'update_password' : 'sign_in';

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
            redirectTo={window.location.origin} // Redirect to home after login/password update
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;