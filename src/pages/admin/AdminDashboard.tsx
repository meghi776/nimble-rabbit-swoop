import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Tag, ShoppingCart, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalBrands, setTotalBrands] = useState<number | null>(null);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    console.log("AdminDashboard: fetchData initiated.");
    setLoading(true);
    setError(null);

    // Explicitly get the latest session before invoking
    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError) {
      console.error("AdminDashboard: Error getting session before invoke:", getSessionError);
      showError("Failed to get current session. Please try logging in again.");
      setLoading(false);
      return;
    }

    if (!currentSession || !currentSession.access_token) {
      console.log("AdminDashboard: No active session found, redirecting to login.");
      showError("Your session has expired or is invalid. Please log in again.");
      navigate('/login');
      setLoading(false);
      return;
    }

    try {
      console.log("AdminDashboard: Attempting to invoke 'get-admin-dashboard-data' Edge Function.");
      console.log("AdminDashboard: Session access token length:", currentSession.access_token?.length);

      const { data, error: invokeError } = await supabase.functions.invoke('get-admin-dashboard-data', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`, // Use the fresh token
        },
      });

      if (invokeError) {
        console.error("AdminDashboard: Edge Function Invoke Error:", invokeError);
        console.error("AdminDashboard: Invoke Error Context:", invokeError.context);

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
        console.log("AdminDashboard: Edge Function returned data:", data);
        setTotalUsers(data.totalUsers);
        setTotalBrands(data.totalBrands);
        setTotalOrders(data.totalOrders);
        showSuccess("Dashboard data refreshed!");
      } else {
        console.warn("AdminDashboard: Edge Function returned no data.");
        throw new Error("Unexpected response from server when fetching dashboard data.");
      }
    } catch (err: any) {
      console.error("AdminDashboard: Error in AdminDashboard fetchData:", err);
      showError(err.message || "Failed to load dashboard data.");
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      console.log("AdminDashboard: fetchData completed. Loading set to false.");
    }
  }, [navigate]);

  useEffect(() => {
    // Only fetch data if session is not loading, to prevent premature calls
    if (!sessionLoading) {
      fetchData();
    }
  }, [fetchData, sessionLoading]); // Add sessionLoading to dependencies

  const handleRefreshClick = () => {
    fetchData();
  };

  const handleClearSession = async () => {
    const toastId = showSuccess("Clearing session...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(`Failed to sign out: ${error.message}`);
    } else {
      showSuccess("Session cleared. Redirecting to login.");
      navigate('/login');
    }
    // dismissToast(toastId); // Dismiss toast after a short delay or immediately
  };

  if (loading || sessionLoading) {
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

  if (!user) {
    return (
      <div className="text-gray-600 dark:text-gray-300 text-center p-4">
        <p>Please log in to view the admin dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Admin Dashboard</h1>
        <div className="flex space-x-2">
          <Button onClick={handleRefreshClick} variant="outline" disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
          </Button>
          <Button onClick={handleClearSession} variant="outline">
            <LogOut className="mr-2 h-4 w-4" /> Clear Session
          </Button>
        </div>
      </div>
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
    </div>
  );
};

export default AdminDashboard;