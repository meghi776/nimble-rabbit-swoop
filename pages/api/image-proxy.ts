import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const imageRes = await fetch(url);
    if (!imageRes.ok) throw new Error('Failed to fetch image');
    
    // Set appropriate headers
    res.setHeader('Content-Type', imageRes.headers.get('Content-Type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Stream the image data
    const imageBuffer = await imageRes.buffer();
    return res.send(imageBuffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(500).json({ error: 'Failed to proxy image' });
  }
}