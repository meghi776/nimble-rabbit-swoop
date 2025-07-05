import { proxyImageUrl } from '@/utils/imageProxy';

export const addTextToImage = (imageUrl: string, text: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      const whitespaceHeight = 60; // Height of the white space for the text

      // New canvas dimensions to include the white bar
      canvas.width = img.width;
      canvas.height = img.height + whitespaceHeight;

      // Fill the entire canvas with a white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the original image at the top
      ctx.drawImage(img, 0, 0);

      // Configure text properties for the white bar
      const fontSize = 24;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'black'; // Black text on white background
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Calculate text position within the new white space
      const x = canvas.width / 2;
      const y = img.height + (whitespaceHeight / 2);

      // Draw the text
      ctx.fillText(text, x, y);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, 'image/png');
    };
    img.onerror = (err) => {
      console.error("Error loading image for text addition:", err);
      reject(new Error('Failed to load image'));
    };
    img.src = proxyImageUrl(imageUrl);
  });
};