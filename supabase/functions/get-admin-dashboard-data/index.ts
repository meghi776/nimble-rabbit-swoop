import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log environment variables for debugging
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log(`Edge Function: SUPABASE_URL present: ${!!supabaseUrl}, length: ${supabaseUrl?.length}`);
    console.log(`Edge Function: SUPABASE_SERVICE_ROLE_KEY present: ${!!supabaseServiceRoleKey}, length: ${supabaseServiceRoleKey?.length}`);

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      supabaseUrl ?? '',
      supabaseServiceRoleKey ?? ''
    );

    // Get the user's ID from the request's Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Edge Function: Authorization header missing.");
      return new Response(JSON.stringify({ error: 'Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log("Edge Function: Authorization header found.");

    const token = authHeader.split(' ')[1];
    let invokerUser = null;
    try {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        console.error("Edge Function: Auth error during token verification:", authError?.message || "User not found.");
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }
      invokerUser = user;
      console.log(`Edge Function: Invoker user ID: ${invokerUser.id}, Email: ${invokerUser.email}`);
    } catch (e) {
      console.error("Edge Function: Exception during auth.getUser:", e);
      return new Response(JSON.stringify({ error: `Authentication check failed: ${e.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Check if the invoking user is an admin
    let invokerProfile = null;
    try {
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', invokerUser.id)
        .single();

      if (profileError) {
        console.error("Edge Function: Error fetching invoker profile:", profileError);
        return new Response(JSON.stringify({ error: `Forbidden: Error fetching user role: ${profileError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }
      invokerProfile = profileData;
      if (invokerProfile?.role !== 'admin') {
        console.error(`Edge Function: Forbidden: User ${invokerUser.id} (role: ${invokerProfile?.role}) is not an admin.`);
        return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can access dashboard data.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }
      console.log(`Edge Function: Invoker user ${invokerUser.id} is an admin. Role: ${invokerProfile.role}`);
    } catch (e) {
      console.error("Edge Function: Exception during profile fetch:", e);
      return new Response(JSON.stringify({ error: `Profile check failed: ${e.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    let totalUsers = 0;
    try {
      // Fetch total users count
      const { data: usersData, error: usersListError } = await supabaseAdmin.auth.admin.listUsers();
      if (usersListError) {
        console.error("Edge Function: Error listing users from Auth:", usersListError);
        throw new Error(`Failed to fetch user count: ${usersListError.message}`);
      }
      totalUsers = usersData.users.length;
      console.log(`Edge Function: Total users fetched: ${totalUsers}`);
    } catch (e) {
      console.error("Edge Function: Exception during user count fetch:", e);
      return new Response(JSON.stringify({ error: `User count fetch failed: ${e.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    let totalBrands = 0;
    try {
      // Fetch total brands count
      const { count: brandsCount, error: brandsError } = await supabaseAdmin
        .from('brands')
        .select('*', { count: 'exact', head: true });
      if (brandsError) {
        console.error("Edge Function: Error fetching brands count from DB:", brandsError);
        throw new Error(`Failed to fetch brand count: ${brandsError.message}`);
      }
      totalBrands = brandsCount;
      console.log(`Edge Function: Total brands fetched: ${totalBrands}`);
    } catch (e) {
      console.error("Edge Function: Exception during brand count fetch:", e);
      return new Response(JSON.stringify({ error: `Brand count fetch failed: ${e.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    let totalOrders = 0;
    try {
      // Fetch total orders count
      const { count: ordersCount, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true });
      if (ordersError) {
        console.error("Edge Function: Error fetching orders count from DB:", ordersError);
        throw new Error(`Failed to fetch order count: ${ordersError.message}`);
      }
      totalOrders = ordersCount;
      console.log(`Edge Function: Total orders fetched: ${totalOrders}`);
    } catch (e) {
      console.error("Edge Function: Exception during order count fetch:", e);
      return new Response(JSON.stringify({ error: `Order count fetch failed: ${e.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ totalUsers, totalBrands, totalOrders }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Edge Function: Unexpected top-level error in main logic:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});