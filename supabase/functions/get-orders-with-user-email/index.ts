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

  let sortColumn = 'created_at';
  let sortDirection = 'desc';
  let orderType: string | null = null; // New variable for order type filter

  try {
    // Check if the request has a body and if it's JSON
    const contentType = req.headers.get('content-type');
    if (contentType && contentType.includes('application/json') && req.body) {
      const requestBody = await req.json();
      sortColumn = requestBody.sortColumn || sortColumn;
      sortDirection = requestBody.sortDirection || sortDirection;
      orderType = requestBody.orderType || null; // Extract orderType
    }
    console.log(`Edge Function received request: sortColumn=${sortColumn}, sortDirection=${sortDirection}, orderType=${orderType}`);

  } catch (error) {
    console.error("Error processing request body (using defaults):", error);
    // If JSON parsing fails, proceed with default sort parameters
    // The outer try-catch will handle other errors.
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user's ID from the request's Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Authorization header missing.");
      return new Response(JSON.stringify({ error: 'Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: invokerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !invokerUser) {
      console.error("Auth error during token verification:", authError?.message || "User not found.");
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log(`Invoker user ID: ${invokerUser.id}, Email: ${invokerUser.email}`);

    // Check if the invoking user is an admin
    const { data: invokerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', invokerUser.id)
      .single();

    if (profileError) {
      console.error("Error fetching invoker profile:", profileError);
      return new Response(JSON.stringify({ error: `Forbidden: Error fetching user role: ${profileError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    if (invokerProfile?.role !== 'admin') {
      console.error(`Forbidden: User ${invokerUser.id} (role: ${invokerProfile?.role}) is not an admin.`);
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can view all orders.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    console.log(`Invoker user ${invokerUser.id} is an admin.`);

    // Fetch orders and join with auth.users to get email
    let query = supabaseAdmin
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
        user_id,
        type
      `); // Include 'type' in the select statement

    if (orderType && orderType !== 'all') {
      query = query.eq('type', orderType); // Apply filter if orderType is specified and not 'all'
      console.log(`Filtering orders by type: ${orderType}`);
    }

    const { data: ordersData, error: ordersError } = await query.order(sortColumn, { ascending: sortDirection === 'asc' });

    if (ordersError) {
      console.error("Error fetching orders from DB:", ordersError);
      return new Response(JSON.stringify({ error: ordersError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log(`Fetched ${ordersData.length} orders.`);

    // Manually fetch emails for each user_id from auth.users
    const userIds = [...new Set(ordersData.map(order => order.user_id))];
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      console.error("Error listing users from Auth:", usersError);
      return new Response(JSON.stringify({ error: usersError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log(`Fetched ${usersData.users.length} users from Auth.`);

    const userEmailMap = new Map(usersData.users.map(user => [user.id, user.email]));

    const ordersWithEmails = ordersData.map(order => ({
      ...order,
      user_email: userEmailMap.get(order.user_id) || null,
    }));

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
      console.log(`Orders sorted by user_email in ${sortDirection} direction.`);
    } else if (sortColumn === 'type') { // New sort logic for 'type'
      ordersWithEmails.sort((a, b) => {
        const typeA = a.type || '';
        const typeB = b.type || '';
        if (sortDirection === 'asc') {
          return typeA.localeCompare(typeB);
        } else {
          return typeB.localeCompare(typeA);
        }
      });
      console.log(`Orders sorted by type in ${sortDirection} direction.`);
    }

    return new Response(JSON.stringify({ orders: ordersWithEmails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});