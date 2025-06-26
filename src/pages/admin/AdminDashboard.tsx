import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Tag, ShoppingCart, Loader2 } from 'lucide-react'; // Changed Package to Tag, added Loader2
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { showError } from '@/utils/toast'; // Import toast utility for errors

const AdminDashboard = () => {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalBrands, setTotalBrands] = useState<number | null>(null); // New state for total brands
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch total users (using admin.listUsers for accurate count)
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) {
          console.error("Error fetching users:", usersError);
          throw new Error(`Failed to fetch user count: ${usersError.message}`);
        }
        setTotalUsers(usersData.users.length);

        // Fetch total brands
        const { count: brandsCount, error: brandsError } = await supabase
          .from('brands')
          .select('*', { count: 'exact', head: true }); // Use head: true for count only
        if (brandsError) {
          console.error("Error fetching brands count:", brandsError);
          throw new Error(`Failed to fetch brand count: ${brandsError.message}`);
        }
        setTotalBrands(brandsCount);

        // Fetch total orders
        const { count: ordersCount, error: ordersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        if (ordersError) {
          console.error("Error fetching orders count:", ordersError);
          throw new Error(`Failed to fetch order count: ${ordersError.message}`);
        }
        setTotalOrders(ordersCount);

      } catch (err: any) {
        console.error("Error in AdminDashboard fetchData:", err);
        showError(err.message || "Failed to load dashboard data.");
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
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
            <Tag className="h-4 w-4 text-muted-foreground" /> {/* Changed icon to Tag */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBrands !== null ? totalBrands : 'N/A'}</div> {/* Display total brands */}
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