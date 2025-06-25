export const proxyImageUrl = (url: string) => {
  console.log("proxyImageUrl: Original URL received:", url);
  // If the image is already from your own domain or a Supabase storage URL, no proxy needed
  if (url.startsWith('/') || url.includes('supabase.co/storage/v1/object/public/')) {
    console.log("proxyImageUrl: URL is local or Supabase storage, no proxy:", url);
    return url;
  }
  
  // Use the Supabase Edge Function as a proxy
  // Replace 'smpjbedvyqensurarrym' with your actual Supabase Project ID
  const supabaseProjectId = 'smpjbedvyqensurarrym'; 
  const proxiedUrl = `https://${supabaseProjectId}.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
  console.log("proxyImageUrl: Proxied URL generated:", proxiedUrl);
  return proxiedUrl;
};