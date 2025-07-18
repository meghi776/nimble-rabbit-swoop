import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Tag } from 'lucide-react'; // Import Tag icon

interface Brand {
  id: string;
  name: string;
  description: string | null;
}

const BrandListingPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategoryAndBrands = async () => {
      setLoading(true);
      setError(null);

      // Fetch category name
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('name')
        .eq('id', categoryId)
        .single();

      if (categoryError) {
        console.error("Error fetching category:", categoryError);
        setError(categoryError.message);
        setLoading(false);
        return;
      }
      setCategoryName(categoryData?.name || 'Unknown Category');

      // Fetch brands for the category
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, name, description')
        .eq('category_id', categoryId)
        .order('name', { ascending: true });

      if (brandsError) {
        console.error("Error fetching brands:", brandsError);
        setError(brandsError.message);
      } else {
        setBrands(brandsData || []);
      }
      setLoading(false);
    };

    if (categoryId) {
      fetchCategoryAndBrands();
    }
  }, [categoryId]);

  return (
    <div className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-950"> {/* Removed min-h-screen */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link to="/" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Brands for {categoryName || 'Category'}
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
              <p className="text-gray-600 dark:text-gray-300">No brands found for this category.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map((brand) => (
                  <Link key={brand.id} to={`/categories/${categoryId}/brands/${brand.id}/products`}>
                    <Card className="h-full flex flex-col justify-between p-6 bg-white dark:bg-gray-800 shadow-xl rounded-xl border-2 border-indigo-500 hover:border-indigo-700 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                      <CardHeader className="pb-4 flex flex-col items-center text-center">
                        <Tag className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mb-3" /> {/* Added icon */}
                        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">{brand.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{brand.description || 'No description.'}</p>
                        <span className="inline-block bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md">
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
    </div>
  );
};

export default BrandListingPage;