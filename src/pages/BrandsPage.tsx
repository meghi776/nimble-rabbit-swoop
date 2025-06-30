import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button"; // Keep Button import
import { ArrowLeft } from 'lucide-react'; // Keep ArrowLeft icon

interface Brand {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  sort_order: number | null; // Added sort_order
}

const BrandsPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');

  useEffect(() => {
    const fetchCategoryAndBrands = async () => {
      setLoading(true);
      setError(null);

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

        // Fetch brands and order by sort_order, then by name
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('id, name, description, category_id, sort_order') // Select sort_order
          .eq('category_id', categoryId)
          .order('sort_order', { ascending: true }) // Order by sort_order first
          .order('name', { ascending: true }); // Secondary order by name

        if (brandsError) {
          console.error("BrandsPage.tsx: Error fetching brands:", brandsError);
          setError(brandsError.message);
          setBrands([]);
        } else {
          const fetchedBrands = brandsData || [];
          setBrands(fetchedBrands);
        }
      } catch (e: any) {
        console.error("BrandsPage.tsx: Unexpected error during fetchCategoryAndBrands:", e);
        setError(e.message || "An unexpected error occurred.");
        setBrands([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndBrands();
  }, [categoryId]);

  return (
    <div className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-950">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link to="/" className="mr-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
            <Button variant="outline" size="icon">
              <ArrowLeft size={24} />
            </Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    to={`/categories/${categoryId}/brands/${brand.id}/products`}
                    className="block"
                  >
                    <Button className="w-full h-auto py-4 px-6 text-lg font-semibold transition-colors duration-200 bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 rounded-md border border-input shadow-sm">
                      {brand.name}
                    </Button>
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