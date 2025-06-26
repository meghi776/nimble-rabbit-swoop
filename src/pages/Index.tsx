import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { Smartphone, Package } from 'lucide-react'; // Import icons

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileCoverCategory, setMobileCoverCategory] = useState<Category | null>(null);
  const [otherCategories, setOtherCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      console.log("Index.tsx: Starting fetchCategories..."); // Added log
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description')
        .order('name', { ascending: true });

      if (error) {
        console.error("Index.tsx: Error fetching categories:", error);
        setError(error.message);
      } else {
        console.log("Index.tsx: Categories fetched successfully:", data); // Added log
        const fetchedCategories = data || [];
        const mobileCover = fetchedCategories.find(cat => cat.name.toLowerCase() === 'mobile cover');
        const others = fetchedCategories.filter(cat => cat.name.toLowerCase() !== 'mobile cover');
        
        setMobileCoverCategory(mobileCover || null);
        setOtherCategories(others);
        setCategories(fetchedCategories); // Keep all categories in state if needed elsewhere
      }
      setLoading(false);
      console.log("Index.tsx: setLoading(false) called."); // Added log
    };

    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-950">
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
              {mobileCoverCategory && (
                <Link
                  key={mobileCoverCategory.id}
                  to={`/categories/${mobileCoverCategory.id}/brands`}
                  className="block"
                >
                  <Card className="h-full flex flex-col justify-between p-6 bg-white dark:bg-gray-800 shadow-xl rounded-xl border-2 border-blue-500 hover:border-blue-700 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                    <CardHeader className="pb-4 flex flex-col items-center text-center">
                      <Smartphone className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-3" />
                      <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">{mobileCoverCategory.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{mobileCoverCategory.description || 'Design and personalize your mobile covers.'}</p>
                      <span className="inline-block bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md">
                        Start Designing
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              )}
              {otherCategories.map((category) => (
                <Card key={category.id} className="h-full flex flex-col justify-between p-6 bg-gray-200 dark:bg-gray-700 shadow-md rounded-xl border-2 border-gray-300 dark:border-gray-600 opacity-80 cursor-not-allowed">
                  <CardHeader className="pb-4 flex flex-col items-center text-center">
                    <Package className="h-12 w-12 text-gray-500 dark:text-gray-400 mb-3" />
                    <CardTitle className="text-2xl font-bold text-gray-700 dark:text-gray-200">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{category.description || 'Exciting products coming soon!'}</p>
                    <span className="inline-block bg-yellow-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md">
                      Coming Soon!
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      <div className="p-4 text-center mt-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} All rights reserved by Puppala Mohan
        </p>
      </div>
    </div>
  );
};

export default Index;