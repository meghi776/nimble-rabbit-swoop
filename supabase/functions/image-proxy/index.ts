import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const urlParam = new URL(req.url).searchParams.get('url');

  if (!urlParam) {
    return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const imageUrl = decodeURIComponent(urlParam);
    console.log(`Proxying image from: ${imageUrl}`);

    const imageRes = await fetch(imageUrl);

    if (!imageRes.ok) {
      console.error(`Failed to fetch image from ${imageUrl}: Status ${imageRes.status}`);
      return new Response(JSON.stringify({ error: `Failed to fetch image: ${imageRes.statusText}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: imageRes.status,
      });
    }

    // Get content type from the original response, default to image/png
    const contentType = imageRes.headers.get('Content-Type') || 'image/png';

    // Return the image data with CORS headers
    return new Response(imageRes.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for a year
      },
      status: 200,
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});