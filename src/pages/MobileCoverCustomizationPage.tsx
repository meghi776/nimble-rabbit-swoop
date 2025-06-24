import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Upload, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner'; // Using sonner for toasts

interface Mockup {
  id: string;
  image_url: string | null;
  product_id: string;
  design_data: { userImageUrl?: string } | null; // Added design_data
}

const MobileCoverCustomizationPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const [mockupId, setMockupId] = useState<string | null>(null);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [uploadedDesignFile, setUploadedDesignFile] = useState<File | null>(null);
  const [userDesignImageUrl, setUserDesignImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMockup = async () => {
      if (!productId) {
        setError("No product ID provided for customization.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('mockups')
        .select('id, image_url, design_data')
        .eq('product_id', productId)
        .limit(1); 

      if (error) {
        console.error("Error fetching mockup:", error);
        setError(error.message);
      } else if (data && data.length > 0) {
        const fetchedMockup = data[0];
        setMockupId(fetchedMockup.id);
        setMockupImage(fetchedMockup.image_url);
        if (fetchedMockup.design_data?.userImageUrl) {
          setUserDesignImageUrl(fetchedMockup.design_data.userImageUrl);
        } else {
          setUserDesignImageUrl(null);
        }
      } else {
        setError("No mockup found for this product.");
      }
      setLoading(false);
    };

    fetchMockup();
  }, [productId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setUploadedDesignFile(event.target.files[0]);
      setUserDesignImageUrl(null); // Clear previous URL if a new file is selected
    }
  };

  const handleClearImage = () => {
    setUploadedDesignFile(null);
    setUserDesignImageUrl(null);
    // Optionally, you might want to clear the image from the database here too
    // For now, it will only be cleared from the database on "Save Design"
  };

  const handleSaveDesign = async () => {
    if (!mockupId) {
      toast.error("Error: Mockup ID not found.");
      return;
    }

    setLoading(true);
    let finalUserDesignImageUrl = userDesignImageUrl;

    if (uploadedDesignFile) {
      const fileExt = uploadedDesignFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('user-designs') // Use the new bucket for user designs
        .upload(filePath, uploadedDesignFile);

      if (uploadError) {
        console.error("Error uploading user design image:", uploadError);
        toast.error(`Failed to upload design image: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('user-designs')
        .getPublicUrl(filePath);
      
      finalUserDesignImageUrl = publicUrlData.publicUrl;
    }

    // Update the design_data in the mockups table
    const { error: updateError } = await supabase
      .from('mockups')
      .update({ design_data: finalUserDesignImageUrl ? { userImageUrl: finalUserDesignImageUrl } : null })
      .eq('id', mockupId);

    if (updateError) {
      console.error("Error saving design data:", updateError);
      toast.error(`Failed to save design: ${updateError.message}`);
    } else {
      setUserDesignImageUrl(finalUserDesignImageUrl); // Update state with the final URL
      setUploadedDesignFile(null); // Clear file input after successful upload/save
      toast.success("Design saved successfully!");
    }
    setLoading(false);
  };

  const displayImageUrl = uploadedDesignFile ? URL.createObjectURL(uploadedDesignFile) : userDesignImageUrl;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Customize Your Mobile Cover
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6 p-6">
          {/* Left Panel: Design Area */}
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center min-h-[300px] md:min-h-[500px] overflow-hidden relative">
            {loading && (
              <p className="text-gray-600 dark:text-gray-300">Loading mockup...</p>
            )}
            {error && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            {!loading && !error && mockupImage ? (
              <>
                <img src={mockupImage} alt="Product Mockup" className="absolute inset-0 w-full h-full object-contain" />
                {displayImageUrl && (
                  <img 
                    src={displayImageUrl} 
                    alt="User Design" 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[80%] max-h-[80%] object-contain" 
                  />
                )}
              </>
            ) : (
              !loading && !error && <p className="text-gray-600 dark:text-gray-300 text-lg">No mockup image available.</p>
            )}
          </div>

          {/* Right Panel: Options/Tools */}
          <div className="flex-1 flex flex-col gap-4">
            <Card className="bg-white dark:bg-gray-800 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800 dark:text-gray-100">
                  Choose Phone Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Dropdown for selecting phone model...
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800 dark:text-gray-100">
                  Upload Your Design
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Input
                  id="designImageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {(uploadedDesignFile || userDesignImageUrl) && (
                  <Button variant="outline" onClick={handleClearImage} className="w-full">
                    <XCircle className="mr-2 h-4 w-4" /> Clear Image
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800 dark:text-gray-100">
                  Add Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Input for text, font options...
                </p>
              </CardContent>
            </Card>

            <Button size="lg" className="mt-4" onClick={handleSaveDesign} disabled={loading}>
              {loading ? 'Saving...' : 'Save Design'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileCoverCustomizationPage;