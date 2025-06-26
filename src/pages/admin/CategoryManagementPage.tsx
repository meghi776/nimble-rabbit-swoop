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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast'; // Import toast utilities

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, description')
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = () => {
    setCurrentCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setCurrentCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
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
      fetchCategories();
    }
    dismissToast(toastId);
  };

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      showError("Category name cannot be empty.");
      return;
    }

    const toastId = showLoading(currentCategory ? "Saving category changes..." : "Adding new category...");
    if (currentCategory) {
      // Update existing category
      const { error } = await supabase
        .from('categories')
        .update({ name: categoryName, description: categoryDescription })
        .eq('id', currentCategory.id);

      if (error) {
        console.error("Error updating category:", error);
        showError(`Failed to update category: ${error.message}`);
      } else {
        showSuccess("Category updated successfully!");
        setIsDialogOpen(false);
        fetchCategories();
      }
    } else {
      // Add new category
      const { error } = await supabase
        .from('categories')
        .insert({ name: categoryName, description: categoryDescription });

      if (error) {
        console.error("Error adding category:", error);
        showError(`Failed to add category: ${error.message}`);
      } else {
        showSuccess("Category added successfully!");
        setIsDialogOpen(false);
        fetchCategories();
      }
    }
    dismissToast(toastId);
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Category Management</h1>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Product Categories</CardTitle>
          <Button onClick={handleAddCategory}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Category
          </Button>
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
                <p className="text-gray-600 dark:text-gray-300">No categories found. Add one to get started!</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.description || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{currentCategory ? 'Save Changes' : 'Add Category'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManagementPage;