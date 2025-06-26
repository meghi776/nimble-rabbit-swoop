import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast'; // Import toast utilities
import { Link } from "react-router-dom"; // Ensure Link is imported

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
}

const ProductManagementPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState<string>('0');

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description, sort_order')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        showError("Failed to load categories.");
        setError(error.message);
      } else {
        setCategories(data || []);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  const handleAddCategory = () => {
    setCurrentCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setCategorySortOrder('0');
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setCurrentCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setCategorySortOrder(category.sort_order?.toString() || '0');
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this category?")) {
      return;
    }
    const toastId = showLoading("Deleting category...");
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting category:", error);
      showError(`Failed to delete category: ${error.message}`);
    } else {
      showSuccess("Category deleted successfully!");
      // Re-fetch categories after deletion
      const { data: categoriesData, error: fetchError } = await supabase
        .from('categories')
        .select('id, name, description, sort_order')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) {
        console.error("Error re-fetching categories:", fetchError);
        showError("Failed to refresh categories list.");
      } else {
        setCategories(categoriesData || []);
      }
    }
    dismissToast(toastId);
  };

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      showError("Category name cannot be empty.");
      return;
    }

    const parsedSortOrder = parseInt(categorySortOrder);
    if (isNaN(parsedSortOrder)) {
      showError("Sort order must be a valid number.");
      return;
    }

    const toastId = showLoading(currentCategory ? "Saving category changes..." : "Adding new category...");
    if (currentCategory) {
      // Update existing category
      const { error } = await supabase
        .from('categories')
        .update({ name: categoryName, description: categoryDescription, sort_order: parsedSortOrder })
        .eq('id', currentCategory.id);

      if (error) {
        console.error("Error updating category:", error);
        showError(`Failed to update category: ${error.message}`);
      } else {
        showSuccess("Category updated successfully!");
        setIsDialogOpen(false);
        // Re-fetch categories after update
        const { data: categoriesData, error: fetchError } = await supabase
          .from('categories')
          .select('id, name, description, sort_order')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (fetchError) {
          console.error("Error re-fetching categories:", fetchError);
          showError("Failed to refresh categories list.");
        } else {
          setCategories(categoriesData || []);
        }
      }
    } else {
      // Add new category
      const { error } = await supabase
        .from('categories')
        .insert({ name: categoryName, description: categoryDescription, sort_order: parsedSortOrder });

      if (error) {
        console.error("Error adding category:", error);
        showError(`Failed to add category: ${error.message}`);
      } else {
        showSuccess("Category added successfully!");
        setIsDialogOpen(false);
        // Re-fetch categories after addition
        const { data: categoriesData, error: fetchError } = await supabase
          .from('categories')
          .select('id, name, description, sort_order')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (fetchError) {
          console.error("Error re-fetching categories:", fetchError);
          showError("Failed to refresh categories list.");
        } else {
          setCategories(categoriesData || []);
        }
      }
    }
    dismissToast(toastId);
  };

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
                    <Link 
                      key={category.id} 
                      to={category.name.toLowerCase() === 'mobile cover' 
                        ? `/admin/categories/${category.id}/brands` 
                        : `/admin/categories/${category.id}/products`
                      }
                      className="block" // Ensure the link takes up the full block
                    >
                      <Card className="h-full flex flex-col justify-between p-4 cursor-pointer hover:shadow-lg transition-shadow duration-200">
                        <div>
                          <CardTitle className="text-lg mb-2">{category.name}</CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{category.description || 'No description.'}</p>
                        </div>
                        <Button className="w-full" variant={category.name.toLowerCase() === 'mobile cover' ? 'default' : 'secondary'}>
                          {category.name.toLowerCase() === 'mobile cover' ? 'Manage Brands' : 'Manage Products'}
                        </Button>
                      </Card>
                    </Link>
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