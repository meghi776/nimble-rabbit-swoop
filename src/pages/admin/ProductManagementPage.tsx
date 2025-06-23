import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PlusCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const ProductManagementPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description')
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        setError(error.message);
      } else {
        setCategories(data || []);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Product Management</h1>
      <Card className="mb-6">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Product Categories</CardTitle>
          <Link to="/admin/categories">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Manage Categories
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-gray-600 dark:text-gray-300">Loading categories...</p>
          )}

          {error && (
            <p className="text-red-500">Error: {error}</p>
          )}

          {!loading && !error && (
            <>
              {categories.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">No categories found. Click "Manage Categories" to add some.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="p-4 flex flex-col justify-between">
                      <div>
                        <CardTitle className="text-lg mb-2">{category.name}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{category.description || 'No description.'}</p>
                      </div>
                      {category.name.toLowerCase() === 'mobile cover' ? (
                        <Link to={`/admin/categories/${category.id}/brands`}>
                          <Button className="w-full">Manage Brands</Button>
                        </Link>
                      ) : (
                        <Link to={`/admin/categories/${category.id}/products`}> {/* Placeholder for product listing */}
                          <Button className="w-full" variant="secondary">Manage Products</Button>
                        </Link>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300">
            This section will eventually display a list of all products, possibly filterable by category.
          </p>
          {/* Product list table or other content will go here */}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductManagementPage;