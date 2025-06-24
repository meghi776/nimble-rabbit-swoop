import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (url: string) => void;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ isOpen, onClose, onImageSelect }) => {
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async () => {
    if (!imageFile) {
      toast({ title: "Validation Error", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('stock-images') // Using 'stock-images' bucket as per existing code
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      toast({
        title: "Error",
        description: `Failed to upload image: ${uploadError.message}`,
        variant: "destructive",
      });
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('stock-images')
        .getPublicUrl(filePath);
      onImageSelect(publicUrlData.publicUrl);
      toast({ title: "Success", description: "Image uploaded and added to design." });
      onClose();
      setImageFile(null); // Clear file input after successful upload
    }
    setUploading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setImageFile(null); // Clear file when closing
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Your Photo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="upload-file">Select Image File</Label>
            <Input
              id="upload-file"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setImageFile(null);
            onClose();
          }}>Cancel</Button>
          <Button onClick={handleFileUpload} disabled={uploading || !imageFile}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload & Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadModal;