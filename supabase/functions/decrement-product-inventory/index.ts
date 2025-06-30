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

  let email, password, first_name, last_name; // These variables are not used in this function, but are present from previous context.

  try {
    const requestBody = await req.json();
    const productId = requestBody.productId;
    const quantity = requestBody.quantity ?? 1; // Default to 1 if not provided

    // Log environment variable lengths for debugging
    console.log("Edge Function: SUPABASE_URL length:", (Deno.env.get('SUPABASE_URL') ?? '').length);
    console.log("Edge Function: SUPABASE_SERVICE_ROLE_KEY length:", (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').length);

    if (!productId || typeof quantity !== 'number' || quantity <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid productId or quantity provided.' }), {
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

    // Fetch current inventory and update in a transaction-like manner
    const { data: productData, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('inventory')
      .eq('id', productId)
      .single();

    if (fetchError || !productData) {
      console.error("Error fetching product inventory:", fetchError);
      return new Response(JSON.stringify({ error: 'Product not found or error fetching inventory.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const currentInventory = productData.inventory || 0;
    if (currentInventory < quantity) {
      return new Response(JSON.stringify({ error: 'Not enough stock available.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    const newInventory = currentInventory - quantity;

    const { data, error: updateError } = await supabaseAdmin
      .from('products')
      .update({ inventory: newInventory })
      .eq('id', productId)
      .select('inventory')
      .single();

    if (updateError) {
      console.error("Error updating product inventory:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Inventory updated successfully!', new_inventory: data.inventory }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error in decrement-product-inventory function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});