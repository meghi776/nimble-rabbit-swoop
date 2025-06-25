export const proxyImageUrl = (url: string) => {
  // If the image is already from your own domain or a Supabase storage URL, no proxy needed
  if (url.startsWith('/') || url.includes('supabase.co/storage/v1/object/public/')) {
    return url;
  }
  
  // Use the Supabase Edge Function as a proxy
  // Replace 'smpjbedvyqensurarrym' with your actual Supabase Project ID
  const supabaseProjectId = 'smpjbedvyqensurarrym'; 
  return `https://${supabaseProjectId}.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
};