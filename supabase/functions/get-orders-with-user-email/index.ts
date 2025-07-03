import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Get Payload and Set Defaults
    const body = await req.json().catch(() => ({})); // Handle empty body case
    const {
      orderType = 'all',
      userId: userIdFilter = null,
      startDate = null,
      endDate = null,
    } = body;

    console.log(`Edge Function: Received filters - orderType=${orderType}, userIdFilter=${userIdFilter}, startDate=${startDate}, endDate=${endDate}`);

    // 2. Create Admin Client and Authenticate
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 3. Check for Admin Role
    const { data: invokerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', invokerUser.id)
      .single();

    if (profileError || invokerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can view all orders.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 4. Build Query
    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, created_at, customer_name, customer_address, customer_phone,
        payment_method, status, total_price, ordered_design_image_url,
        products (name), profiles (first_name, last_name), user_id, type
      `);

    // Apply filters
    if (orderType && orderType !== 'all') {
      query = query.eq('type', orderType);
    }
    if (userIdFilter) {
      query = query.eq('user_id', userIdFilter);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query = query.lte('created_at', endOfDay.toISOString());
    }
    
    // Default sort by creation date on the database level for initial load
    query = query.order('created_at', { ascending: false });

    // 5. Execute Query
    const { data: ordersData, error: ordersError } = await query;

    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    // 6. Enrich with User Emails
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      throw new Error(`Failed to fetch auth users: ${usersError.message}`);
    }

    const userEmailMap = new Map(usersData.users.map(user => [user.id, user.email]));
    const ordersWithEmails = ordersData.map(order => ({
      ...order,
      user_email: userEmailMap.get(order.user_id) || null,
    }));

    // 7. Prepare and Return Response
    const userListForFrontend = usersData.users.map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.first_name || null,
      last_name: user.user_metadata?.last_name || null,
    }));

    return new Response(JSON.stringify({ orders: ordersWithEmails, users: userListForFrontend }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});