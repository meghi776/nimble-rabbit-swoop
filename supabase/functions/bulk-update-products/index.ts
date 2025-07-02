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

  let requestBody;
  try {
    // Check if there's a body to parse
    const contentType = req.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const bodyText = await req.text(); // Read as text first
      if (bodyText) {
        requestBody = JSON.parse(bodyText); // Then parse as JSON
      } else {
        console.error("Edge Function: Received application/json with empty body.");
        return new Response(JSON.stringify({ error: 'Request body is empty. Expected JSON payload.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    } else {
      console.error("Edge Function: Content-Type is not application/json or missing.");
      return new Response(JSON.stringify({ error: 'Invalid Content-Type. Expected application/json.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
  } catch (jsonParseError) {
    console.error("Edge Function: Error parsing JSON body:", jsonParseError);
    return new Response(JSON.stringify({ error: `Invalid JSON format: ${jsonParseError.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const { productIds, updates } = requestBody;

  try {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Product IDs array is required and cannot be empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'Updates object is required and cannot be empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

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
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can perform bulk product updates.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Separate updates for 'products' table and 'mockups' table
    const productUpdates: { [key: string]: any } = {};
    const mockupUpdates: { [key: string]: any } = {};

    const productFields = ['name', 'description', 'price', 'canvas_width', 'canvas_height', 'is_disabled', 'inventory', 'sku'];
    const mockupFields = ['mockup_x', 'mockup_y', 'mockup_width', 'mockup_height', 'mockup_rotation'];

    for (const key in updates) {
      if (productFields.includes(key)) {
        productUpdates[key] = updates[key];
      } else if (mockupFields.includes(key)) {
        mockupUpdates[key] = updates[key];
      }
    }

    let updatedProductCount = 0;
    let updatedMockupCount = 0;

    // 1. Perform update on 'products' table if there are product-specific updates
    if (Object.keys(productUpdates).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .update(productUpdates)
        .in('id', productIds)
        .select('id');

      if (error) {
        console.error("Error performing bulk product update:", error);
        return new Response(JSON.stringify({ error: `Failed to update products: ${error.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      updatedProductCount = data.length;
    }

    // 2. Perform update on 'mockups' table if there are mockup-specific updates
    if (Object.keys(mockupUpdates).length > 0) {
      // Fetch mockup IDs associated with the product IDs
      const { data: mockupsData, error: fetchMockupsError } = await supabaseAdmin
        .from('mockups')
        .select('id')
        .in('product_id', productIds);

      if (fetchMockupsError) {
        console.error("Error fetching associated mockups for bulk update:", fetchMockupsError);
        return new Response(JSON.stringify({ error: `Failed to fetch associated mockups: ${fetchMockupsError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const mockupIdsToUpdate = mockupsData.map(m => m.id);

      if (mockupIdsToUpdate.length > 0) {
        const { data, error } = await supabaseAdmin
          .from('mockups')
          .update(mockupUpdates)
          .in('id', mockupIdsToUpdate)
          .select('id');

        if (error) {
          console.error("Error performing bulk mockup update:", error);
          return new Response(JSON.stringify({ error: `Failed to update mockups: ${error.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
        updatedMockupCount = data.length;
      }
    }

    return new Response(JSON.stringify({
      message: 'Products and/or mockups updated successfully!',
      updatedProductCount,
      updatedMockupCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error in bulk-update-products function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});