import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

interface Mockup {
  id: string;
  image_url: string | null;
  product_id: string;
  // Add other fields from your mockups table if needed
}

const MobileCoverCustomizationPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const [mockupImage, setMockupImage] = useState<string | null>(null);
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

      // Fetch the mockup associated with the product ID
      // Assuming one product can have multiple mockups, we'll just take the first one for now.
      const { data, error } = await supabase
        .from('mockups')
        .select('image_url')
        .eq('product_id', productId)
        .limit(1)
        .single(); // Use single() if you expect only one mockup per product, otherwise use .limit(1) and access data[0]

      if (error) {
        console.error("Error fetching mockup:", error);
        setError(error.message);
      } else if (data) {
        setMockupImage(data.image_url);
      } else {
        setError("No mockup found for this product.");
      }
      setLoading(false);
    };

    fetchMockup();
  }, [productId]);

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
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center min-h-[300px] md:min-h-[500px] overflow-hidden">
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
              <img src={mockupImage} alt="Product Mockup" className="max-w-full max-h-full object-contain" />
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
                  Upload Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Upload Image</Button>
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

            <Button size="lg" className="mt-4">Add to Cart</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileCoverCustomizationPage;