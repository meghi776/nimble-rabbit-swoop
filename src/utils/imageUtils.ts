import { proxyImageUrl } from '@/utils/imageProxy';

export const addTextToImage = (imageUrl: string, productName: string, orderDisplayId: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      const whitespaceHeight = 40; // Height for one line of text
      const orderIdFontSize = 20;

      // New canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height + whitespaceHeight;

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Original image
      ctx.drawImage(img, 0, 0);

      // Common text properties
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw Order Display ID
      ctx.font = `normal ${orderIdFontSize}px Arial`;
      const orderIdX = canvas.width / 2;
      const orderIdY = img.height + (whitespaceHeight / 2); // Center vertically
      ctx.fillText(orderDisplayId, orderIdX, orderIdY);

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