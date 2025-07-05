import React, { useEffect, useState, useRef } from 'react';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, ArrowLeft, Upload, Download, Search, ListChecks, MoveVertical } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import Papa from 'papaparse';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { deleteFileFromSupabase } from '@/utils/supabaseStorage';
import ImportMobileProductsButton from '@/components/admin/ImportMobileProductsButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Product {
  id: string;
  category_id: string;
  brand_id: string;
  name: string;
  description: string | null;
  price: number | null;
  canvas_width: number | null;
  canvas_height: number | null;
  mockup_id: string | null;
  mockup_image_url: string | null;
  is_disabled: boolean;
  inventory: number | null;
  sku: string | null;
  mockup_x: number | null;
  mockup_y: number | null;
  mockup_width: number | null;
  mockup_height: number | null;
  mockup_rotation: number | null;
}

const ProductManagementByBrandPage = () => {
  const { categoryId, brandId } = useParams<{ categoryId: string; brandId: string }>();
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debounceTimeoutRef = useRef<number | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const { user, session } = useSession();
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState({
    price: false,
    inventory: false,
    is_disabled: false,
    description: false,
    sku: false,
    mockup_x: false,
    mockup_y: false,
  });
  const [bulkEditValues, setBulkEditValues] = useState({
    price: '',
    inventory: '',
    is_disabled: 'false',
    description: '',
    sku: '',
    mockup_x: '',
    mockup_y: '',
  });

  const isSupabaseStorageUrl = (url: string | null, bucketName: string) => {
    if (!url) return false;
    const supabaseStorageBaseUrl = `https://smpjbedvyqensurarrym.supabase.co/storage/v1/object/public/${bucketName}/`;
    return url.startsWith(supabaseStorageBaseUrl);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    setSelectedProductIds(new Set());

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

    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('name')
      .eq('id', brandId)
      .single();
    if (brandError) {
      console.error("Error fetching brand:", brandError);
      showError("Failed to load brand details.");
      setError(brandError.message);
      setLoading(false);
      return;
    }
    setBrandName(brandData?.name || 'Unknown Brand');

    let query = supabase
      .from('products')
      .select(`
        id,
        category_id,
        brand_id,
        name,
        description,
        price,
        canvas_width,
        canvas_height,
        is_disabled,
        inventory,
        sku,
        mockups(id, image_url, mockup_x, mockup_y, mockup_width, mockup_height, mockup_rotation)
      `)
      .eq('category_id', categoryId)
      .eq('brand_id', brandId);

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    const { data, error: productsError } = await query.order('name', { ascending: true });

    if (productsError) {
      console.error("Error fetching products:", productsError);
      showError("Failed to load products.");
      setError(productsError.message);
    } else {
      setProducts(data.map(p => ({
        ...p,
        mockup_id: p.mockups?.[0]?.id || null,
        mockup_image_url: p.mockups?.[0]?.image_url || null,
        mockup_x: p.mockups?.[0]?.mockup_x ?? null,
        mockup_y: p.mockups?.[0]?.mockup_y ?? null,
        mockup_width: p.mockups?.[0]?.mockup_width ?? null,
        mockup_height: p.mockups?.[0]?.mockup_height ?? null,
        mockup_rotation: p.mockups?.[0]?.mockup_rotation ?? null,
      })) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (categoryId && brandId) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        fetchProducts();
      }, 300) as unknown as number;
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [categoryId, brandId, searchQuery]);

  const deleteSingleProduct = async (id: string, mockupId: string | null, mockupImageUrl: string | null) => {
    if (mockupImageUrl && isSupabaseStorageUrl(mockupImageUrl, 'order-mockups')) {
      const fileName = mockupImageUrl.split('/').pop();
      if (fileName) {
        await deleteFileFromSupabase(`mockups/${fileName}`, 'order-mockups');
      }
    }

    if (mockupId) {
      const { error: deleteMockupError } = await supabase
        .from('mockups')
        .delete()
        .eq('id', mockupId);
      if (deleteMockupError) {
        console.error("Error deleting mockup entry:", deleteMockupError);
        showError(`Failed to delete mockup entry: ${deleteMockupError.message}`);
        return false;
      }
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting product:", error);
      showError(`Failed to delete product: ${error.message}`);
      return false;
    }
    return true;
  };

  const handleDeleteProduct = async (id: string, mockupId: string | null, mockupImageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this product and its associated mockup? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    const toastId = showLoading("Deleting product...");
    const success = await deleteSingleProduct(id, mockupId, mockupImageUrl);
    if (success) {
      showSuccess("Product deleted successfully!");
      fetchProducts();
    } else {
      showError("Failed to delete product.");
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const handleToggleDisable = async (productId: string, currentStatus: boolean) => {
    setLoading(true);
    const toastId = showLoading(currentStatus ? "Disabling product..." : "Enabling product...");
    const { error } = await supabase
      .from('products')
      .update({ is_disabled: !currentStatus })
      .eq('id', productId);

    if (error) {
      console.error("Error toggling product status:", error);
      showError(`Failed to change product status: ${error.message}`);
    } else {
      showSuccess(`Product ${currentStatus ? 'disabled' : 'enabled'} successfully!`);
      fetchProducts();
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const handleExportProducts = () => {
    const dataToExport = products.map(product => ({
      id: product.id,
      category_id: product.category_id,
      brand_id: product.brand_id,
      name: product.name,
      description: product.description || '',
      price: product.price || 0,
      canvas_width: product.canvas_width || 0,
      canvas_height: product.canvas_height || 0,
      is_disabled: product.is_disabled,
      inventory: product.inventory || 0,
      sku: product.sku || '',
      mockup_id: product.mockup_id || '',
      mockup_image_url: product.mockup_image_url || '',
      mockup_x: product.mockup_x || 0,
      mockup_y: product.mockup_y || 0,
      mockup_width: product.mockup_width || '',
      mockup_height: product.mockup_height || '',
      mockup_rotation: product.mockup_rotation || 0,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `products_${brandId}_${categoryId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Products exported successfully!");
  };

  const handleImportProducts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      showError("No file selected. Please select a CSV file to import.");
      return;
    }

    if (file.type !== 'text/csv') {
      showError("Invalid file type. Please upload a CSV file.");
      return;
    }

    // Explicitly get the latest session before invoking
    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError) {
      console.error("ProductManagementByBrandPage: Error getting session before import invoke:", getSessionError);
      showError("Failed to get current session. Please try logging in again.");
      setLoading(false);
      return;
    }

    if (!currentSession || !currentSession.access_token || !user?.id) {
      showError("User not authenticated or session invalid. Please log in to import products.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const toastId = showLoading("Importing products...");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          console.error("CSV Parsing Errors:", results.errors);
          showError("CSV parsing failed. Check console for details.");
          dismissToast(toastId);
          setLoading(false);
          return;
        }

        const rowsToProcess = results.data.filter((row: any) => row.name);
        if (rowsToProcess.length === 0) {
          showError("No valid products found in the CSV to import.");
          dismissToast(toastId);
          setLoading(false);
          return;
        }

        let successfulImports = 0;
        let failedImports = 0;

        for (const row of rowsToProcess) {
          try {
            const productPayload = {
              id: row.id || undefined,
              category_id: categoryId,
              brand_id: brandId,
              name: row.name,
              description: row.description || null,
              price: row.price ? parseFloat(row.price) : null,
              canvas_width: row.canvas_width ? parseInt(row.canvas_width) : 300,
              canvas_height: row.canvas_height ? parseInt(row.canvas_height) : 600,
              is_disabled: row.is_disabled === 'TRUE' || row.is_disabled === 'true' || row.is_disabled === '1',
              inventory: row.inventory ? parseInt(row.inventory) : 0,
              sku: row.sku || null,
            };

            const { data: upsertedProduct, error: productUpsertError } = await supabase
              .from('products')
              .upsert(productPayload, { onConflict: 'id' })
              .select('id')
              .single();

            if (productUpsertError) {
              console.error(`Error upserting product ${row.name}:`, productUpsertError);
              failedImports++;
              continue;
            }

            const productId = upsertedProduct.id;

            if (row.mockup_image_url) {
              const mockupPayload = {
                id: row.mockup_id || undefined,
                product_id: productId,
                user_id: user.id,
                image_url: row.mockup_image_url,
                name: `${row.name} Mockup`,
                designer: 'Admin',
                mockup_x: row.mockup_x ? parseFloat(row.mockup_x) : 0,
                mockup_y: row.mockup_y ? parseFloat(row.mockup_y) : 0,
                mockup_width: row.mockup_width ? parseFloat(row.mockup_width) : null,
                mockup_height: row.mockup_height ? parseFloat(row.mockup_height) : null,
                mockup_rotation: row.mockup_rotation ? parseFloat(row.mockup_rotation) : 0,
                design_data: null,
              };

              const { error: mockupUpsertError } = await supabase
                .from('mockups')
                .upsert(mockupPayload, { onConflict: 'id' });

              if (mockupUpsertError) {
                console.error(`Error upserting mockup for product ${row.name}:`, mockupUpsertError);
              }
            }
            successfulImports++;

          } catch (e: any) {
            console.error(`Unexpected error processing row for product ${row.name}:`, e);
            failedImports++;
          }
        }

        if (failedImports === 0) {
          showSuccess(`Successfully imported ${successfulImports} products!`);
        } else if (successfulImports > 0) {
          showError(`${successfulImports} products imported, but ${failedImports} failed.`);
        } else {
          showError("Failed to import any products.");
        }

        fetchProducts();
        dismissToast(toastId);
        setLoading(false);
        if (importFileInputRef.current) {
          importFileInputRef.current.value = '';
        }
      },
      error: (err) => {
        console.error("CSV Parsing Error:", err);
        showError(`CSV parsing failed: ${err.message}`);
        dismissToast(toastId);
        setLoading(false);
      }
    });
  };

  const handleSelectProduct = (productId: string, isChecked: boolean) => {
    setSelectedProductIds(prev => {
      const newSelection = new Set(prev);
      if (isChecked) {
        newSelection.add(productId);
      } else {
        newSelection.delete(productId);
      }
      return newSelection;
    });
  };

  const handleSelectAllProducts = (isChecked: boolean) => {
    if (isChecked) {
      const allProductIds = new Set(products.map(product => product.id));
      setSelectedProductIds(allProductIds);
    } else {
      setSelectedProductIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) {
      showError("No products selected. Please select at least one product to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedProductIds.size} selected products? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    const toastId = showLoading(`Deleting ${selectedProductIds.size} products...`);
    let successfulDeletions = 0;
    let failedDeletions = 0;

    for (const productId of selectedProductIds) {
      const productToDelete = products.find(p => p.id === productId);
      if (productToDelete) {
        const success = await deleteSingleProduct(productId, productToDelete.mockup_id, productToDelete.mockup_image_url);
        if (success) {
          successfulDeletions++;
        } else {
          failedDeletions++;
        }
      }
    }

    fetchProducts();
    dismissToast(toastId);
    setLoading(false);
    if (failedDeletions === 0) {
      showSuccess(`${successfulDeletions} products deleted successfully!`);
    } else if (successfulDeletions > 0) {
      showError(`${successfulDeletions} products deleted, but ${failedDeletions} failed.`);
    } else {
      showError("Failed to delete any selected products.");
    }
  };

  const handleBulkEditSubmit = async () => {
    if (selectedProductIds.size === 0) {
      showError("No products selected for bulk edit.");
      return;
    }

    const updates: { [key: string]: any } = {};
    if (bulkEditFields.price) {
      const parsedPrice = parseFloat(bulkEditValues.price);
      if (isNaN(parsedPrice)) {
        showError("Invalid price value. Please enter a number.");
        return;
      }
      updates.price = parsedPrice;
    }
    if (bulkEditFields.inventory) {
      const parsedInventory = parseInt(bulkEditValues.inventory);
      if (isNaN(parsedInventory)) {
        showError("Invalid inventory value. Please enter an integer.");
        return;
      }
      updates.inventory = parsedInventory;
    }
    if (bulkEditFields.is_disabled) {
      updates.is_disabled = bulkEditValues.is_disabled === 'true';
    }
    if (bulkEditFields.description) {
      updates.description = bulkEditValues.description.trim() === '' ? null : bulkEditValues.description;
    }
    if (bulkEditFields.sku) {
      updates.sku = bulkEditValues.sku.trim() === '' ? null : bulkEditValues.sku;
    }
    if (bulkEditFields.mockup_x) {
      const parsedMockupX = parseFloat(bulkEditValues.mockup_x);
      if (isNaN(parsedMockupX)) {
        showError("Invalid Mockup X value. Please enter a number.");
        return;
      }
      updates.mockup_x = parsedMockupX;
    }
    if (bulkEditFields.mockup_y) {
      const parsedMockupY = parseFloat(bulkEditValues.mockup_y);
      if (isNaN(parsedMockupY)) {
        showError("Invalid Mockup Y value. Please enter a number.");
        return;
      }
      updates.mockup_y = parsedMockupY;
    }

    if (Object.keys(updates).length === 0) {
      showError("No fields selected for update or no valid values provided.");
      return;
    }

    // Explicitly get the latest session before invoking
    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError) {
      console.error("ProductManagementByBrandPage: Error getting session before bulk edit invoke:", getSessionError);
      showError("Failed to get current session. Please try logging in again.");
      setLoading(false);
      return;
    }

    if (!currentSession || !currentSession.access_token) {
      showError("Authentication required for bulk edit. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const toastId = showLoading(`Updating ${selectedProductIds.size} products...`);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('bulk-update-products', {
        body: JSON.stringify({ productIds: Array.from(selectedProductIds), updates }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      if (invokeError) {
        console.error("Edge Function Invoke Error (bulk-update-products):", invokeError);
        console.error("Invoke Error Context:", invokeError.context);

        let errorMessage = invokeError.message;

        if (invokeError.context?.data) {
          try {
            const parsedErrorBody = typeof invokeError.context.data === 'string'
              ? JSON.parse(invokeError.context.data)
              : invokeError.context.data;

            if (parsedErrorBody && typeof parsedErrorBody === 'object' && 'error' in parsedErrorBody) {
              errorMessage = parsedErrorBody.error;
            } else {
              errorMessage = `Edge Function responded with status ${invokeError.context?.status || 'unknown'}. Raw response: ${JSON.stringify(parsedErrorBody)}`;
            }
          } catch (parseErr) {
            console.error("Failed to parse error response body from Edge Function:", parseErr);
            errorMessage = `Edge Function responded with status ${invokeError.context?.status || 'unknown'}. Raw response: ${invokeError.context.data}`;
          }
        } else if (invokeError.context?.status) {
          errorMessage = `Edge Function returned status code: ${invokeError.context.status}`;
        }
        showError(`Failed to bulk update products: ${errorMessage}`);
      } else if (data) {
        showSuccess(`Successfully updated ${data.updatedProductCount} products and ${data.updatedMockupCount} mockups!`);
        setIsBulkEditModalOpen(false);
        setBulkEditFields({
          price: false, inventory: false, is_disabled: false, description: false, sku: false,
          mockup_x: false, mockup_y: false,
        });
        setBulkEditValues({
          price: '', inventory: '', is_disabled: 'false', description: '', sku: '',
          mockup_x: '', mockup_y: '',
        });
        fetchProducts();
      } else {
        showError("Unexpected response from server during bulk update.");
      }
    } catch (err: any) {
      console.error("Network or unexpected error during bulk update:", err);
      showError(err.message || "An unexpected error occurred during bulk update.");
    } finally {
      dismissToast(toastId);
      setLoading(false);
    }
  };

  const handleBulkUpdateY = async () => {
    if (!window.confirm("Are you sure you want to set Mockup Y to -20 for ALL products? This will affect every mockup in the database.")) {
      return;
    }

    // Explicitly get the latest session before invoking
    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError) {
      console.error("ProductManagementByBrandPage: Error getting session before bulk update Y invoke:", getSessionError);
      showError("Failed to get current session. Please try logging in again.");
      return;
    }

    if (!currentSession || !currentSession.access_token) {
      showError("Authentication required. Please log in again.");
      return;
    }

    setIsUpdatingAll(true);
    const toastId = showLoading("Updating all mockups...");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('bulk-update-mockup-y', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      showSuccess(`Successfully updated ${data.updatedCount} mockups!`);
      fetchProducts();

    } catch (err: any) {
      console.error("Error bulk updating mockups:", err);
      showError(`Failed to update mockups: ${err.message}`);
    } finally {
      dismissToast(toastId);
      setIsUpdatingAll(false);
    }
  };

  const isAllSelected = products.length > 0 && selectedProductIds.size === products.length;
  const isIndeterminate = selectedProductIds.size > 0 && selectedProductIds.size < products.length;

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to={`/admin/products`} className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex-grow">
          Products for {brandName || 'Brand'} ({categoryName || 'Category'})
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Products List</CardTitle>
          <div className="flex space-x-2 items-center">
            {selectedProductIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsBulkEditModalOpen(true)}
                  disabled={loading}
                >
                  <ListChecks className="mr-2 h-4 w-4" /> Bulk Edit ({selectedProductIds.size})
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedProductIds.size})
                </Button>
              </>
            )}
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-md border border-input bg-background shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <Button onClick={handleBulkUpdateY} variant="secondary" disabled={loading || isUpdatingAll}>
              <MoveVertical className="mr-2 h-4 w-4" /> Set All Y to -20
            </Button>
            <Button onClick={handleExportProducts} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Input
              type="file"
              accept=".csv"
              ref={importFileInputRef}
              onChange={handleImportProducts}
              className="hidden"
            />
            <Button onClick={() => importFileInputRef.current?.click()} variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <ImportMobileProductsButton onImportComplete={fetchProducts} />
            <Link to={`/admin/categories/${categoryId}/brands/${brandId}/products/new`}>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-gray-600 dark:text-gray-300">Loading products...</p>
          )}

          {error && (
            <p className="text-red-500">Error: {error}</p>
          )}

          {!loading && !error && (
            <>
              {products.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">No products found for this brand. Add one to get started!</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]">
                          {/* @ts-ignore */}
                          <Checkbox
                            checked={isAllSelected}
                            indeterminate={isIndeterminate}
                            onCheckedChange={handleSelectAllProducts}
                            aria-label="Select all products"
                          />
                        </TableHead>
                        <TableHead>Mockup Image</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Canvas (WxH)</TableHead>
                        <TableHead>Inventory</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProductIds.has(product.id)}
                              onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                              aria-label={`Select product ${product.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            {product.mockup_image_url ? (
                              <img src={product.mockup_image_url} alt={product.name} className="w-16 h-16 object-cover rounded-md" />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">No Mockup</div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.sku || 'N/A'}</TableCell>
                          <TableCell>{product.description || 'N/A'}</TableCell>
                          <TableCell>₹{product.price?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>{product.canvas_width || 'N/A'}x{product.canvas_height || 'N/A'}</TableCell>
                          <TableCell>{product.inventory ?? 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`product-status-${product.id}`}
                                checked={!product.is_disabled}
                                onCheckedChange={() => handleToggleDisable(product.id, product.is_disabled)}
                              />
                              <Label htmlFor={`product-status-${product.id}`}>
                                {product.is_disabled ? 'Disabled' : 'Enabled'}
                              </Label>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/admin/categories/${categoryId}/brands/${brandId}/products/${product.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mr-2"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id, product.mockup_id, product.mockup_image_url)}
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

      <Dialog open={isBulkEditModalOpen} onOpenChange={setIsBulkEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Edit Products ({selectedProductIds.size} selected)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">Select fields to update and enter new values. Only selected fields will be applied.</p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-edit-price"
                checked={bulkEditFields.price}
                onCheckedChange={(checked) => setBulkEditFields(prev => ({ ...prev, price: checked as boolean }))}
              />
              <Label htmlFor="bulk-edit-price" className="flex-1">Price</Label>
              <Input
                type="number"
                value={bulkEditValues.price}
                onChange={(e) => setBulkEditValues(prev => ({ ...prev, price: e.target.value }))}
                disabled={!bulkEditFields.price}
                className="w-3/4"
                placeholder="e.g., 999.00"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-edit-inventory"
                checked={bulkEditFields.inventory}
                onCheckedChange={(checked) => setBulkEditFields(prev => ({ ...prev, inventory: checked as boolean }))}
              />
              <Label htmlFor="bulk-edit-inventory" className="flex-1">Inventory</Label>
              <Input
                type="number"
                value={bulkEditValues.inventory}
                onChange={(e) => setBulkEditValues(prev => ({ ...prev, inventory: e.target.value }))}
                disabled={!bulkEditFields.inventory}
                className="w-3/4"
                placeholder="e.g., 100"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-edit-status"
                checked={bulkEditFields.is_disabled}
                onCheckedChange={(checked) => setBulkEditFields(prev => ({ ...prev, is_disabled: checked as boolean }))}
              />
              <Label htmlFor="bulk-edit-status" className="flex-1">Status</Label>
              <Select
                value={bulkEditValues.is_disabled}
                onValueChange={(value) => setBulkEditValues(prev => ({ ...prev, is_disabled: value }))}
                disabled={!bulkEditFields.is_disabled}
              >
                <SelectTrigger className="w-3/4">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Enabled</SelectItem>
                  <SelectItem value="true">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-edit-description"
                checked={bulkEditFields.description}
                onCheckedChange={(checked) => setBulkEditFields(prev => ({ ...prev, description: checked as boolean }))}
              />
              <Label htmlFor="bulk-edit-description" className="flex-1">Description</Label>
              <Textarea
                value={bulkEditValues.description}
                onChange={(e) => setBulkEditValues(prev => ({ ...prev, description: e.target.value }))}
                disabled={!bulkEditFields.description}
                className="w-3/4"
                placeholder="New description (leave empty to clear)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-edit-sku"
                checked={bulkEditFields.sku}
                onCheckedChange={(checked) => setBulkEditFields(prev => ({ ...prev, sku: checked as boolean }))}
              />
              <Label htmlFor="bulk-edit-sku" className="flex-1">SKU</Label>
              <Input
                type="text"
                value={bulkEditValues.sku}
                onChange={(e) => setBulkEditValues(prev => ({ ...prev, sku: e.target.value }))}
                disabled={!bulkEditFields.sku}
                className="w-3/4"
                placeholder="New SKU (leave empty to clear)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-edit-mockup-x"
                checked={bulkEditFields.mockup_x}
                onCheckedChange={(checked) => setBulkEditFields(prev => ({ ...prev, mockup_x: checked as boolean }))}
              />
              <Label htmlFor="bulk-edit-mockup-x" className="flex-1">Mockup X</Label>
              <Input
                type="number"
                value={bulkEditValues.mockup_x}
                onChange={(e) => setBulkEditValues(prev => ({ ...prev, mockup_x: e.target.value }))}
                disabled={!bulkEditFields.mockup_x}
                className="w-3/4"
                placeholder="e.g., 0"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-edit-mockup-y"
                checked={bulkEditFields.mockup_y}
                onCheckedChange={(checked) => setBulkEditFields(prev => ({ ...prev, mockup_y: checked as boolean }))}
              />
              <Label htmlFor="bulk-edit-mockup-y" className="flex-1">Mockup Y</Label>
              <Input
                type="number"
                value={bulkEditValues.mockup_y}
                onChange={(e) => setBulkEditValues(prev => ({ ...prev, mockup_y: e.target.value }))}
                disabled={!bulkEditFields.mockup_y}
                className="w-3/4"
                placeholder="e.g., 0"
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkEditSubmit} disabled={loading}>
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagementByBrandPage;