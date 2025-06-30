import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Store } from 'lucide-react'; // Import icons

interface Brand {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
}

const BrandsPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');

  console.log("BrandsPage.tsx: Component Rendered. Current loading state:", loading);

  useEffect(() => {
    const fetchCategoryAndBrands = async () => {
      setLoading(true);
      setError(null);
      console.log("BrandsPage.tsx: Starting fetchCategoryAndBrands for categoryId:", categoryId);

      if (!categoryId) {
        setError("Category ID is missing.");
        setLoading(false);
        return;
      }

      try {
        // Fetch category name
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();

        if (categoryError) {
          console.error("BrandsPage.tsx: Error fetching category name:", categoryError);
          setError(categoryError.message);
        } else if (categoryData) {
          setCategoryName(categoryData.name);
        } else {
          setCategoryName('Unknown Category');
        }

        // Fetch brands
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('id, name, description, category_id')
          .eq('category_id', categoryId)
          .order('name', { ascending: true });

        console.log("BrandsPage.tsx: Supabase brands response - data:", brandsData, "error:", brandsError);

        if (brandsError) {
          console.error("BrandsPage.tsx: Error fetching brands:", brandsError);
          setError(brandsError.message);
          setBrands([]);
        } else {
          const fetchedBrands = brandsData || [];
          console.log("BrandsPage.tsx: Brands fetched successfully. Count:", fetchedBrands.length);
          setBrands(fetchedBrands);
        }
      } catch (e: any) {
        console.error("BrandsPage.tsx: Unexpected error during fetchCategoryAndBrands:", e);
        setError(e.message || "An unexpected error occurred.");
        setBrands([]);
      } finally {
        console.log("BrandsPage.tsx: Before setting loading to false. Current loading state:", loading);
        setLoading(false);
        console.log("BrandsPage.tsx: setLoading(false) called.");
      }
    };

    fetchCategoryAndBrands();
  }, [categoryId]); // Re-run when categoryId changes

  return (
    <div className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-950"> {/* Removed min-h-screen */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link to="/" className="mr-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            Brands in {categoryName}
          </h1>
        </div>

        {loading && (
          <p className="text-gray-600 dark:text-gray-300">Loading brands...</p>
        )}

        {error && (
          <p className="text-red-500">Error: {error}</p>
        )}

        {!loading && !error && (
          <>
            {brands.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">No brands found for this category. Please add some from the admin panel.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    to={`/categories/${categoryId}/brands/${brand.id}/products`}
                    className="block"
                  >
                    <Card className="h-full flex flex-col justify-between p-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl border-2 border-green-500 hover:border-green-700 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                      <CardHeader className="pb-4 flex flex-col items-center text-center">
                        <Store className="h-12 w-12 text-green-600 dark:text-green-400 mb-3" />
                        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">{brand.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{brand.description || 'Explore products from this brand.'}</p>
                        <span className="inline-block bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md">
                          View Products
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-4 text-center mt-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} All rights reserved by Puppala Mohan
        </p>
      </div>
    </div>
  );
};

export default BrandsPage;