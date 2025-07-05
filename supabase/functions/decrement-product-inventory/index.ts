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
    const { productId, quantity = 1 } = await req.json();

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
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Fetch the product to get its SKU
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('sku, inventory')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      console.error("Error fetching product:", fetchError);
      return new Response(JSON.stringify({ error: 'Product not found or error fetching details.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // If the product has a SKU, use the RPC function for atomic, multi-product update
    if (product.sku) {
      console.log(`Product has SKU [${product.sku}]. Using RPC to decrement inventory.`);
      const { error: rpcError } = await supabaseAdmin
        .rpc('decrement_inventory_by_sku', {
          p_sku: product.sku,
          p_quantity: quantity
        });

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        // Check for the custom exception message from the database function
        if (rpcError.message.includes('Not enough stock')) {
           return new Response(JSON.stringify({ error: 'Not enough stock available for this SKU.' }), {
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
             status: 409, // Conflict
           });
        }
        throw new Error(`Failed to update inventory via RPC: ${rpcError.message}`);
      }
    } else {
      // If no SKU, decrement inventory for the single product
      console.log(`Product has no SKU. Decrementing inventory for single product.`);
      if ((product.inventory || 0) < quantity) {
        return new Response(JSON.stringify({ error: 'Not enough stock available.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        });
      }

      const newInventory = (product.inventory || 0) - quantity;
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ inventory: newInventory })
        .eq('id', productId);

      if (updateError) {
        throw new Error(`Failed to update inventory for single product: ${updateError.message}`);
      }
    }

    return new Response(JSON.stringify({ message: 'Inventory updated successfully!' }), {
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