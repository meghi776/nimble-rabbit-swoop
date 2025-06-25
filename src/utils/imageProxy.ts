export const proxyImageUrl = (url: string) => {
  // If the image is already from your own domain or doesn't need proxying
  if (url.startsWith('/') || url.startsWith(process.env.NEXT_PUBLIC_SITE_URL || '')) {
    return url;
  }
  
  // Use a proxy endpoint (you'll need to create this in your API routes)
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
};