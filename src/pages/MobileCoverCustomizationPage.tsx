import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MobileCoverCustomizationPage = () => {
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
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center min-h-[300px] md:min-h-[500px]">
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Design Area (e.g., Phone Mockup, Image Upload)
            </p>
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