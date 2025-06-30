import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Tag, ShoppingCart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext'; // Import useSession

const AdminDashboard = () => {
  const { user, session, loading: sessionLoading } = useSession(); // Get user, session, and sessionLoading
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalBrands, setTotalBrands] = useState<number | null>(null);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); // Local loading state for dashboard data
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (sessionLoading || !user || !session) { // Wait for session to load and user to be present
        setLoading(false); // Set local loading to false if session not ready
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Invoke the Edge Function to get all dashboard data securely
        const { data, error: invokeError } = await supabase.functions.invoke('get-admin-dashboard-data', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`, // Explicitly pass the token
          },
        });

        if (invokeError) {
          console.error("Edge Function Invoke Error:", invokeError);
          let errorMessage = invokeError.message;
          if (invokeError.context?.data) {
            try {
              const parsedError = JSON.parse(invokeError.context.data);
              if (parsedError.error) {
                errorMessage = parsedError.error;
              }
            } catch (e) {
              // Fallback if context.data is not JSON
            }
          }
          throw new Error(`Failed to load dashboard data: ${errorMessage}`);
        } else if (data) {
          setTotalUsers(data.totalUsers);
          setTotalBrands(data.totalBrands);
          setTotalOrders(data.totalOrders);
        } else {
          throw new Error("Unexpected response from server when fetching dashboard data.");
        }
      } catch (err: any) {
        console.error("Error in AdminDashboard fetchData:", err);
        showError(err.message || "Failed to load dashboard data.");
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, session, sessionLoading]); // Add user, session, and sessionLoading to dependencies

  if (loading || sessionLoading) { // Use combined loading state
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        <p>Error loading dashboard data: {error}</p>
      </div>
    );
  }

  // If not loading and no error, but no user (should be redirected by SessionContext for admin routes)
  if (!user) {
    return (
      <div className="text-gray-600 dark:text-gray-300 text-center p-4">
        <p>Please log in to view the admin dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers !== null ? totalUsers : 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Overall users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBrands !== null ? totalBrands : 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Overall brands</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders !== null ? totalOrders : 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Overall orders</p>
          </CardContent>
        </Card>
      </div>
      {/* More dashboard content can go here */}
    </div>
  );
};

export default AdminDashboard;