import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

interface Brand {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  sort_order: number | null; // Added sort_order
}

const BrandManagementPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [brandSortOrder, setBrandSortOrder] = useState<string>('0'); // New state for sort order

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
        showError("Failed to load category details.");
        setError(categoryError.message);
        setLoading(false);
        return;
      }
      setCategoryName(categoryData?.name || 'Unknown Category');

      // Fetch brands for the category
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, category_id, name, description, sort_order') // Select sort_order
        .eq('category_id', categoryId)
        .order('sort_order', { ascending: true }) // Order by sort_order
        .order('name', { ascending: true }); // Secondary order by name

      if (brandsError) {
        console.error("Error fetching brands:", brandsError);
        showError("Failed to load brands.");
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

  const handleAddBrand = () => {
    setCurrentBrand(null);
    setBrandName('');
    setBrandDescription('');
    setBrandSortOrder('0'); // Default sort order for new brand
    setIsDialogOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setCurrentBrand(brand);
    setBrandName(brand.name);
    setBrandDescription(brand.description || '');
    setBrandSortOrder(brand.sort_order?.toString() || '0'); // Set current sort order
    setIsDialogOpen(true);
  };

  const handleDeleteBrand = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this brand?")) {
      return;
    }
    const toastId = showLoading("Deleting brand...");
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting brand:", error);
      showError(`Failed to delete brand: ${error.message}`);
    } else {
      showSuccess("Brand deleted successfully!");
      // Re-fetch brands after deletion
      const { data: brandsData, error: fetchError } = await supabase
        .from('brands')
        .select('id, category_id, name, description, sort_order') // Select sort_order
        .eq('category_id', categoryId)
        .order('sort_order', { ascending: true }) // Order by sort_order
        .order('name', { ascending: true }); // Secondary order by name

      if (fetchError) {
        console.error("Error re-fetching brands:", fetchError);
        showError("Failed to refresh brands list.");
      } else {
        setBrands(brandsData || []);
      }
    }
    dismissToast(toastId);
  };

  const handleSubmit = async () => {
    if (!brandName.trim()) {
      showError("Brand name cannot be empty.");
      return;
    }

    if (!categoryId) {
      showError("Category ID is missing.");
      return;
    }

    const parsedSortOrder = parseInt(brandSortOrder);
    if (isNaN(parsedSortOrder)) {
      showError("Sort order must be a valid number.");
      return;
    }

    const toastId = showLoading(currentBrand ? "Saving brand changes..." : "Adding new brand...");
    if (currentBrand) {
      // Update existing brand
      const { error } = await supabase
        .from('brands')
        .update({ name: brandName, description: brandDescription, sort_order: parsedSortOrder }) // Update sort_order
        .eq('id', currentBrand.id);

      if (error) {
        console.error("Error updating brand:", error);
        showError(`Failed to update brand: ${error.message}`);
      } else {
        showSuccess("Brand updated successfully!");
        setIsDialogOpen(false);
        // Re-fetch brands after update
        const { data: brandsData, error: fetchError } = await supabase
          .from('brands')
          .select('id, category_id, name, description, sort_order') // Select sort_order
          .eq('category_id', categoryId)
          .order('sort_order', { ascending: true }) // Order by sort_order
          .order('name', { ascending: true }); // Secondary order by name

        if (fetchError) {
          console.error("Error re-fetching brands:", fetchError);
          showError("Failed to refresh brands list.");
        } else {
          setBrands(brandsData || []);
        }
      }
    } else {
      // Add new brand
      const { error } = await supabase
        .from('brands')
        .insert({ category_id: categoryId, name: brandName, description: brandDescription, sort_order: parsedSortOrder }); // Insert sort_order

      if (error) {
        console.error("Error adding brand:", error);
        showError(`Failed to add brand: ${error.message}`);
      } else {
        showSuccess("Brand added successfully!");
        setIsDialogOpen(false);
        // Re-fetch brands after addition
        const { data: brandsData, error: fetchError } = await supabase
          .from('brands')
          .select('id, category_id, name, description, sort_order') // Select sort_order
          .eq('category_id', categoryId)
          .order('sort_order', { ascending: true }) // Order by sort_order
          .order('name', { ascending: true }); // Secondary order by name

        if (fetchError) {
          console.error("Error re-fetching brands:", fetchError);
          showError("Failed to refresh brands list.");
        } else {
          setBrands(brandsData || []);
        }
      }
    }
    dismissToast(toastId);
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to="/admin/products" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Brands for {categoryName || 'Category'}
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Brands List</CardTitle>
          <Button onClick={handleAddBrand}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Brand
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-gray-600 dark:text-gray-300">Loading brands...</p>
          )}

          {error && (
            <p className="text-red-500">Error: {error}</p>
          )}

          {!loading && !error && (
            <>
              {brands.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">No brands found for this category. Add one to get started!</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Sort Order</TableHead> {/* New TableHead for Sort Order */}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brands.map((brand) => (
                        <TableRow key={brand.id}>
                          <TableCell className="font-medium">
                            <Link to={`/admin/categories/${categoryId}/brands/${brand.id}/products`} className="text-blue-600 hover:underline">
                              {brand.name}
                            </Link>
                          </TableCell>
                          <TableCell>{brand.description || 'N/A'}</TableCell>
                          <TableCell>{brand.sort_order ?? 'N/A'}</TableCell> {/* Display sort_order */}
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditBrand(brand)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteBrand(brand.id)}
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
            <DialogTitle>{currentBrand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={brandDescription}
                onChange={(e) => setBrandDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sort-order" className="text-right">
                Sort Order
              </Label>
              <Input
                id="sort-order"
                type="number"
                value={brandSortOrder}
                onChange={(e) => setBrandSortOrder(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{currentBrand ? 'Save Changes' : 'Add Brand'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandManagementPage;