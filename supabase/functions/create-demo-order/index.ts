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

  let total_price, customer_name, customer_address, customer_phone;

  try {
    const requestBody = await req.json();
    total_price = requestBody.total_price;
    customer_name = requestBody.customer_name;
    customer_address = requestBody.customer_address;
    customer_phone = requestBody.customer_phone;
  } catch (jsonParseError) {
    console.error("Error parsing JSON body:", jsonParseError);
    return new Response(JSON.stringify({ error: 'Invalid request body format. Please ensure the request body is valid JSON.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    if (!total_price || !customer_name || !customer_address || !customer_phone) {
      return new Response(JSON.stringify({ error: 'Price, customer name, address, and phone are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

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
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can create demo orders.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Insert the new demo order
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: invokerUser.id,
        customer_name: customer_name,
        customer_address: customer_address,
        customer_phone: customer_phone,
        payment_method: 'N/A', // Demo orders might not have a real payment method
        status: 'Pending', // Default status for demo orders
        total_price: total_price,
        type: 'demo', // Explicitly set type to 'demo'
        // product_id and mockup_id can be null for demo orders
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating demo order:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ message: 'Demo order created successfully!', order: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error in main logic:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});