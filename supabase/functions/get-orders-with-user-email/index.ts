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
  let orderType: string | null = null;

  try {
    const contentType = req.headers.get('content-type');
    let requestBody: any = {};

    if (contentType && contentType.includes('application/json')) {
      const bodyText = await req.text();
      if (bodyText) {
        try {
          requestBody = JSON.parse(bodyText);
          sortColumn = requestBody.sortColumn || sortColumn;
          sortDirection = requestBody.sortDirection || sortDirection;
          orderType = requestBody.orderType || null;
        } catch (jsonParseError) {
          console.error("Error parsing JSON body:", jsonParseError);
        }
      } else {
        console.log("Received application/json with empty body.");
      }
    }
    console.log(`Edge Function received request: sortColumn=${sortColumn}, sortDirection=${sortDirection}, orderType=${orderType}`);

  } catch (error) {
    console.error("Unexpected error in Edge Function (outer catch):", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
      `);

    if (orderType && orderType !== 'all') {
      query = query.eq('type', orderType);
      console.log(`Filtering orders by type: ${orderType}`);
    }

    // Apply sorting directly from the database for all columns except user_email
    if (sortColumn !== 'user_email') {
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
    }

    const { data: ordersData, error: ordersError } = await query;

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

    let ordersWithEmails = ordersData.map(order => ({
      ...order,
      user_email: userEmailMap.get(order.user_id) || null,
    }));

    // Apply client-side sorting for user_email if requested
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
      console.log(`Orders sorted by user_email in ${sortDirection} direction (client-side).`);
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