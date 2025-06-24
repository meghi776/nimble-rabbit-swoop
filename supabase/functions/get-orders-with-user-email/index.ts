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
    const { sortColumn = 'created_at', sortDirection = 'desc' } = await req.json();

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user's ID from the request's Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: invokerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !invokerUser) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if the invoking user is an admin
    const { data: invokerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', invokerUser.id)
      .single();

    if (profileError || invokerProfile?.role !== 'admin') {
      console.error("Profile error or not admin:", profileError);
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can view all orders.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Fetch orders and join with auth.users to get email
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        created_at,
        customer_name,
        customer_address,
        customer_phone,
        payment_method,
        status,
        total_price,
        ordered_design_image_url,
        products (name),
        profiles (first_name, last_name),
        user_id
      `)
      .order(sortColumn, { ascending: sortDirection === 'asc' });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return new Response(JSON.stringify({ error: ordersError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Manually fetch emails for each user_id from auth.users
    // This is less efficient than a direct join if Supabase allowed it,
    // but necessary given the current RLS and API limitations for auth.users.
    const userIds = [...new Set(ordersData.map(order => order.user_id))];
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Adjust as needed, or implement pagination if many users
    });

    if (usersError) {
      console.error("Error listing users:", usersError);
      return new Response(JSON.stringify({ error: usersError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const userEmailMap = new Map(usersData.users.map(user => [user.id, user.email]));

    const ordersWithEmails = ordersData.map(order => ({
      ...order,
      user_email: userEmailMap.get(order.user_id) || null,
    }));

    // Re-sort if sorting by user_email, as the initial sort was on a different column
    if (sortColumn === 'user_email') {
      ordersWithEmails.sort((a, b) => {
        const emailA = a.user_email || '';
        const emailB = b.user_email || '';
        if (sortDirection === 'asc') {
          return emailA.localeCompare(emailB);
        } else {
          return emailB.localeCompare(emailA);
        }
      });
    }

    return new Response(JSON.stringify({ orders: ordersWithEmails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});