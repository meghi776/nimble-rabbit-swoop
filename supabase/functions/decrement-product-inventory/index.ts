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

  console.log("--- decrement-product-inventory: Request received ---");
  console.log("Request method:", req.method);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));

  let rawBody;
  try {
    rawBody = await req.text();
    console.log(`Raw request body (length: ${rawBody.length}): "${rawBody}"`);
  } catch (e) {
    console.error("Error reading request body as text:", e);
    return new Response(JSON.stringify({ error: 'Could not read request body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  let requestBody;
  try {
    if (!rawBody) {
      throw new Error("Request body is empty");
    }
    requestBody = JSON.parse(rawBody);
    console.log("Successfully parsed JSON body:", requestBody);
  } catch (e) {
    console.error("Error parsing JSON body:", e.message);
    return new Response(JSON.stringify({ error: `Invalid JSON body: ${e.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const productId = requestBody.productId;
  const quantity = requestBody.quantity ?? 1;

  console.log(`Extracted productId: ${productId}, quantity: ${quantity}`);

  try {
    if (!productId || typeof quantity !== 'number' || quantity <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid productId or quantity provided.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

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
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

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

    console.log("--- decrement-product-inventory: Request successful ---");
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