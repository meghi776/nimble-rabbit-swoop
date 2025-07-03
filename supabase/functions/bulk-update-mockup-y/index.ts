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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // Perform the bulk update on the 'mockups' table
    const { data, error } = await supabaseAdmin
      .from('mockups')
      .update({ mockup_y: -20 })
      .neq('id', '00000000-0000-0000-0000-000000000000') // This condition ensures we attempt to update all rows
      .select('id'); // Select 'id' to get a count of updated rows

    if (error) {
      console.error("Error performing bulk mockup_y update:", error);
      return new Response(JSON.stringify({ error: `Failed to update mockups: ${error.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({
      message: 'Mockups updated successfully!',
      updatedCount: data ? data.length : 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Unexpected error in bulk-update-mockup-y function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});