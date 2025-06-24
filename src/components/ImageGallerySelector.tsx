import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ImageGallerySelectorProps {
  onImageSelect: (url: string) => void;
  onClose: () => void;
}

const ImageGallerySelector: React.FC<ImageGallerySelectorProps> = ({ onImageSelect, onClose }) => {
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchGalleryImages = async () => {
      setLoadingGallery(true);
      const { data, error } = await supabase.storage.from('stock-images').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        console.error("Error fetching gallery images:", error);
        toast({
          title: "Error",
          description: `Failed to load gallery images: ${error.message}`,
          variant: "destructive",
        });
      } else {
        const urls = data.map(file =>
          supabase.storage.from('stock-images').getPublicUrl(file.name).data.publicUrl
        );
        setGalleryImages(urls);
      }
      setLoadingGallery(false);
    };

    fetchGalleryImages();
  }, []);

  const handleFileUpload = async () => {
    if (!newImageFile) {
      toast({ title: "Validation Error", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileExt = newImageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('stock-images')
      .upload(filePath, newImageFile);

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
    }
    setUploading(false);
  };

  const handleUrlAdd = () => {
    if (!newImageUrl.trim()) {
      toast({ title: "Validation Error", description: "Please enter a valid image URL.", variant: "destructive" });
      return;
    }
    onImageSelect(newImageUrl.trim());
    toast({ title: "Success", description: "Image from URL added to design." });
    onClose();
  };

  return (
    <Tabs defaultValue="gallery" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="gallery">Gallery</TabsTrigger>
        <TabsTrigger value="upload">Upload</TabsTrigger>
        <TabsTrigger value="url">URL</TabsTrigger>
      </TabsList>
      <TabsContent value="gallery" className="mt-4">
        {loadingGallery ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : galleryImages.length === 0 ? (
          <p className="text-center text-gray-500">No images in gallery. Upload some!</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2">
            {galleryImages.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Gallery image ${index + 1}`}
                className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  onImageSelect(url);
                  onClose();
                }}
              />
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="upload" className="mt-4 space-y-4">
        <div>
          <Label htmlFor="upload-file">Select Image File</Label>
          <Input
            id="upload-file"
            type="file"
            accept="image/*"
            onChange={(e) => setNewImageFile(e.target.files ? e.target.files[0] : null)}
          />
        </div>
        <Button onClick={handleFileUpload} disabled={uploading || !newImageFile} className="w-full">
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Upload & Add
        </Button>
      </TabsContent>
      <TabsContent value="url" className="mt-4 space-y-4">
        <div>
          <Label htmlFor="image-url-input">Image URL</Label>
          <Input
            id="image-url-input"
            type="text"
            placeholder="Enter image URL"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
          />
        </div>
        <Button onClick={handleUrlAdd} disabled={!newImageUrl.trim()} className="w-full">
          <LinkIcon className="mr-2 h-4 w-4" /> Add from URL
        </Button>
      </TabsContent>
    </Tabs>
  );
};

export default ImageGallerySelector;