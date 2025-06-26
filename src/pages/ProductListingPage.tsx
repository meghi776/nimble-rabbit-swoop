import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input component
import { ArrowLeft, Search } from 'lucide-react'; // Import Search icon

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  canvas_width: number | null;
  canvas_height: number | null;
  is_disabled: boolean; // Added is_disabled
  inventory: number | null; // Added inventory
  sku: string | null; // Added SKU
}

const ProductListingPage = () => {
  const { categoryId, brandId } = useParams<{ categoryId: string; brandId?: string }>();
  const [title, setTitle] = useState<string>('Products');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(''); // New state for search query
  const debounceTimeoutRef = useRef<number | null>(null); // Ref for debounce timeout

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      let query = supabase.from('products').select('id, name, description, image_url, price, canvas_width, canvas_height, is_disabled, inventory, sku');
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

      // Filter out disabled products for public view
      query = query.eq('is_disabled', false);

      // Apply search filter if searchQuery is not empty
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
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

    // Debounce the fetchProducts call
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchProducts();
    }, 300) as unknown as number; // Cast to number for clearTimeout

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [categoryId, brandId, searchQuery]); // Re-run effect when searchQuery changes

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center mb-6 justify-between"> {/* Added justify-between here */}
          <Link to={brandId ? `/categories/${categoryId}/brands` : '/'} className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-md border border-input bg-background shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="w-full">
                    <Link 
                      to={`/customize-cover/${product.id}`} 
                      className={`w-full h-auto py-2 px-4 text-base font-semibold transition-colors duration-200 flex items-center justify-between ${
                        product.is_disabled || (product.inventory !== null && product.inventory <= 0)
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-70'
                          : 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                      } rounded-md border border-input shadow-sm`}
                      onClick={(e) => {
                        if (product.is_disabled || (product.inventory !== null && product.inventory <= 0)) {
                          e.preventDefault(); // Prevent navigation if disabled or out of stock
                        }
                      }}
                    >
                      <span>{product.name}</span>
                      {product.sku && <span className="text-sm text-gray-400 ml-2">({product.sku})</span>} {/* Display SKU */}
                      {product.inventory !== null && product.inventory <= 0 && (
                        <span className="text-red-500 text-sm ml-2">Out of Stock</span>
                      )}
                    </Link>
                  </div>
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