import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  canvas_width: number | null;
  canvas_height: number | null;
}

const ProductListingPage = () => {
  const { categoryId, brandId } = useParams<{ categoryId: string; brandId?: string }>();
  const [title, setTitle] = useState<string>('Products');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      let query = supabase.from('products').select('id, name, description, image_url, price, canvas_width, canvas_height');
      let breadcrumbTitle = '';
      let backLink = '/';

      if (brandId) {
        // Fetch products for a specific brand within a category
        query = query.eq('brand_id', brandId);
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('name')
          .eq('id', brandId)
          .single();
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();

        if (brandData) breadcrumbTitle += brandData.name;
        if (categoryData) breadcrumbTitle += ` (${categoryData.name})`;
        setTitle(`Products for ${breadcrumbTitle}`);
        backLink = `/categories/${categoryId}/brands`;

        if (brandError || categoryError) {
          console.error("Error fetching brand/category for products:", brandError || categoryError);
          setError((brandError || categoryError)?.message || "Failed to load brand/category details.");
          setLoading(false);
          return;
        }

      } else if (categoryId) {
        // Fetch products for a specific category
        query = query.eq('category_id', categoryId);
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();

        if (categoryData) breadcrumbTitle = categoryData.name;
        setTitle(`Products in ${breadcrumbTitle}`);
        backLink = '/';

        if (categoryError) {
          console.error("Error fetching category for products:", categoryError);
          setError(categoryError.message || "Failed to load category details.");
          setLoading(false);
          return;
        }
      } else {
        // No category or brand specified, maybe show all products or an error
        setError("No category or brand specified.");
        setLoading(false);
        return;
      }

      const { data, error: productsError } = await query.order('name', { ascending: true });

      if (productsError) {
        console.error("Error fetching products:", productsError);
        setError(productsError.message);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [categoryId, brandId]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link to={brandId ? `/categories/${categoryId}/brands` : '/'} className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {title}
          </h1>
        </div>

        {loading && (
          <p className="text-gray-600 dark:text-gray-300">Loading products...</p>
        )}

        {error && (
          <p className="text-red-500">Error: {error}</p>
        )}

        {!loading && !error && (
          <>
            {products.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">No products found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Card key={product.id} className="h-full flex flex-col justify-between hover:shadow-lg transition-shadow duration-200">
                    <CardHeader>
                      <CardTitle className="text-xl">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Description removed */}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductListingPage;