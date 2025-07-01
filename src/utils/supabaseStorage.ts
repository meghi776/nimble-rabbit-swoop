import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

/**
 * Handles file upload to a specified Supabase storage bucket and subfolder.
 * Shows error toasts if the upload fails.
 * @param file The File or Blob object to upload.
 * @param bucketName The name of the Supabase storage bucket (e.g., 'order-mockups').
 * @param subfolder An optional subfolder within the bucket (e.g., 'mockups', 'user-uploads').
 * @returns The public URL of the uploaded file, or null if upload fails.
 */
export const uploadFileToSupabase = async (file: File | Blob, bucketName: string, subfolder: string = ''): Promise<string | null> => {
  const fileExt = file instanceof File ? file.name.split('.').pop() : 'png'; // Get extension for File, default to png for Blob
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = subfolder ? `${subfolder}/${fileName}` : fileName;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      contentType: file instanceof File ? file.type : 'image/png', // Use file.type for File, default for Blob
      upsert: false, // Do not overwrite existing files by default
    });

  if (error) {
    console.error(`Error uploading image to ${bucketName}/${subfolder}:`, error);
    showError(`Error uploading image: ${error.message}`);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};

/**
 * Deletes a file from a specified Supabase storage bucket.
 * @param filePath The full path of the file within the bucket (e.g., 'mockups/image.png').
 * @param bucketName The name of the Supabase storage bucket.
 * @returns True if deletion was successful, false otherwise.
 */
export const deleteFileFromSupabase = async (filePath: string, bucketName: string): Promise<boolean> => {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    console.error(`Error deleting file from ${bucketName}/${filePath}:`, error);
    showError(`Failed to delete file: ${error.message}`);
    return false;
  }
  return true;
};