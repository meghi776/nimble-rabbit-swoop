import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { Smartphone, Package } from 'lucide-react'; // Import icons

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null; // Added sort_order
}

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileCoverCategory, setMobileCoverCategory] = useState<Category | null>(null);
  const [otherCategories, setOtherCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("Index.tsx: Component Rendered. Current loading state:", loading); // Log on every render

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true); // Set loading to true at the start of fetch
      setError(null);
      console.log("Index.tsx: Starting fetchCategories...");
      try {
        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('id, name, description, sort_order') // Select sort_order
          .order('sort_order', { ascending: true }) // Order by sort_order first
          .order('name', { ascending: true }); // Then by name

        console.log("Index.tsx: Supabase response - data:", data, "error:", fetchError); // Detailed log of Supabase response

        if (fetchError) {
          console.error("Index.tsx: Error fetching categories:", fetchError);
          setError(fetchError.message);
          setCategories([]); // Ensure categories is empty on error
          setMobileCoverCategory(null);
          setOtherCategories([]);
        } else {
          const fetchedCategories = data || []; // Ensure it's an array even if data is null/undefined
          console.log("Index.tsx: Categories fetched successfully. Count:", fetchedCategories.length);
          
          // The specific logic for "Mobile Cover" is now less critical if sort_order is used,
          // but keeping it for explicit placement if its sort_order is set to be first.
          const mobileCover = fetchedCategories.find(cat => cat.name.toLowerCase() === 'mobile cover');
          const others = fetchedCategories.filter(cat => cat.name.toLowerCase() !== 'mobile cover');
          
          setMobileCoverCategory(mobileCover || null);
          setOtherCategories(others);
          setCategories(fetchedCategories); // Keep all categories for rendering
        }
      } catch (e: any) {
        console.error("Index.tsx: Unexpected error during fetchCategories:", e);
        setError(e.message || "An unexpected error occurred.");
        setCategories([]); // Ensure categories is empty on unexpected error
        setMobileCoverCategory(null);
        setOtherCategories([]);
      } finally {
        console.log("Index.tsx: Before setting loading to false. Current loading state:", loading);
        setLoading(false); // Always set loading to false when fetch is complete (success or error)
        console.log("Index.tsx: setLoading(false) called.");
      }
    };

    fetchCategories();
  }, []); // Empty dependency array means this runs once on mount

  // Add a useEffect to log the final state of loading and error
  useEffect(() => {
    console.log("Index.tsx: Final state - loading:", loading, "error:", error, "categories count:", categories.length);
  }, [loading, error, categories.length]);


  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-950 min-h-screen"> {/* Re-added min-h-screen */}
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl mx-auto animate-in fade-in-0 duration-500">
              {/* Render categories based on the fetched and sorted 'categories' state */}
              {categories.map((category) => (
                <React.Fragment key={category.id}>
                  {category.name.toLowerCase() === 'mobile cover' ? (
                    <Link
                      to={`/categories/${category.id}/brands`}
                      className="block"
                    >
                      <Card className="h-full flex flex-col justify-between p-6 rounded-2xl border border-white/30 bg-white/20 dark:bg-black/20 backdrop-blur-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 hover:bg-white/30 dark:hover:bg-black/30 cursor-pointer">
                        <CardHeader className="pb-4 flex flex-col items-center text-center">
                          <Smartphone className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-3" />
                          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">{category.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{category.description || 'Design and personalize your mobile covers.'}</p>
                          <span className="inline-block bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md">
                            Start Designing
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ) : (
                    <Card className="h-full flex flex-col justify-between p-6 rounded-2xl border border-white/20 bg-gray-500/10 dark:bg-gray-700/20 backdrop-blur-md shadow-md cursor-not-allowed">
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
                  )}
                </React.Fragment>
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