import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';

const MobileCoverCustomizationPage = () => {
  const { productId } = useParams<{ productId: string }>();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between py-2 px-4 bg-white dark:bg-gray-800 shadow-md">
        <Link to={-1} className="text-gray-600 dark:text-gray-300">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Product ID: {productId}
        </h1>
        <Button variant="ghost" size="icon">
          {/* Placeholder for future functionality */}
        </Button>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-300">Customization area will go here.</p>
      </main>
    </div>
  );
};

export default MobileCoverCustomizationPage;