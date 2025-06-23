import React, { useEffect, useState } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const Index = () => {
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-4">
        <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">Explore Our Products</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Choose a category to start customizing or browsing!
        </p>
      </div>

      {loading && (
        <p className="text-gray-600 dark:text-gray-300">Loading categories...</p>
      )}

      {error && (
        <p className="text-red-500">Error: {error}</p>
      )}

      {!loading && !error && (
        <>
          {categories.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">No categories found. Please add some from the admin panel.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl mx-auto">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={category.name.toLowerCase() === 'mobile cover'
                    ? `/categories/${category.id}/brands`
                    : `/categories/${category.id}/products`
                  }
                >
                  <Card className="h-full flex flex-col justify-between hover:shadow-lg transition-shadow duration-200">
                    <CardHeader>
                      <CardTitle className="text-xl">{category.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{category.description || 'No description.'}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
      <MadeWithDyad />
    </div>
  );
};

export default Index;