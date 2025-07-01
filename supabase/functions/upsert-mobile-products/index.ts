import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to slugify names for SKUs
function slugify(text: string) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Supabase environment variables are not set.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Authenticate the invoker as an admin
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

    const { data: invokerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', invokerUser.id)
      .single();

    if (profileError || invokerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can perform this action.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Define the products to upsert
    const productsToUpsert = [
      { name: "VIVO Y18", description: "Mobile cover for VIVO Y18" },
      { name: "Y18E", description: "Mobile cover for Y18E" },
      { name: "T3 LITE", description: "Mobile cover for T3 LITE" },
      { name: "Y28S", description: "Mobile cover for Y28S" },
      { name: "Y28E ( 5G )", description: "Mobile cover for Y28E (5G)" },
      { name: "IQ00 Z9 LITE ( 5G )", description: "Mobile cover for IQ00 Z9 LITE (5G)" },
      { name: "Y03", description: "Mobile cover for Y03" },
    ];

    // 1. Find or Create 'Mobile Cover' Category
    let { data: categoryData, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', 'Mobile Cover')
      .single();

    let mobileCoverCategoryId: string;
    if (catError && catError.code === 'PGRST116') { // No rows found
      const { data: newCat, error: insertCatError } = await supabaseAdmin
        .from('categories')
        .insert({ name: 'Mobile Cover', description: 'Customizable mobile phone covers', sort_order: 10 })
        .select('id')
        .single();
      if (insertCatError) throw new Error(`Failed to create category: ${insertCatError.message}`);
      mobileCoverCategoryId = newCat.id;
    } else if (catError) {
      throw new Error(`Failed to fetch category: ${catError.message}`);
    } else {
      mobileCoverCategoryId = categoryData.id;
    }

    // 2. Find or Create 'Generic' Brand under 'Mobile Cover' Category
    let { data: brandData, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id')
      .eq('name', 'Generic')
      .eq('category_id', mobileCoverCategoryId)
      .single();

    let genericBrandId: string;
    if (brandError && brandError.code === 'PGRST116') { // No rows found
      const { data: newBrand, error: insertBrandError } = await supabaseAdmin
        .from('brands')
        .insert({ category_id: mobileCoverCategoryId, name: 'Generic', description: 'Generic brand for various mobile covers', sort_order: 10 })
        .select('id')
        .single();
      if (insertBrandError) throw new Error(`Failed to create brand: ${insertBrandError.message}`);
      genericBrandId = newBrand.id;
    } else if (brandError) {
      throw new Error(`Failed to fetch brand: ${brandError.message}`);
    } else {
      genericBrandId = brandData.id;
    }

    let successfulUpserts = 0;
    let failedUpserts = 0;

    // 3. Upsert Products
    for (const product of productsToUpsert) {
      const sku = slugify(product.name);
      const productPayload = {
        category_id: mobileCoverCategoryId,
        brand_id: genericBrandId,
        name: product.name,
        description: product.description,
        price: 9.99, // Default price
        canvas_width: 300, // Default canvas width
        canvas_height: 600, // Default canvas height
        is_disabled: false, // Default status
        inventory: 100, // Default inventory
        sku: sku,
      };

      // Check if product already exists by name, category_id, and brand_id
      const { data: existingProduct, error: checkError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('name', product.name)
        .eq('category_id', mobileCoverCategoryId)
        .eq('brand_id', genericBrandId)
        .single();

      if (checkError && checkError.code === 'PGRST116') { // Product does not exist, insert it
        const { error: insertError } = await supabaseAdmin
          .from('products')
          .insert(productPayload);
        if (insertError) {
          console.error(`Failed to insert product ${product.name}:`, insertError.message);
          failedUpserts++;
        } else {
          successfulUpserts++;
        }
      } else if (checkError) { // Other error during check
        console.error(`Error checking for existing product ${product.name}:`, checkError.message);
        failedUpserts++;
      } else { // Product exists, update it
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update(productPayload)
          .eq('id', existingProduct.id);
        if (updateError) {
          console.error(`Failed to update product ${product.name}:`, updateError.message);
          failedUpserts++;
        } else {
          successfulUpserts++;
        }
      }
    }

    return new Response(JSON.stringify({
      message: 'Product upsert process completed.',
      successfulUpserts,
      failedUpserts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function: Unexpected error in upsert-mobile-products:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});