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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Edit, Trash2, ArrowLeft, Upload, Download, XCircle, Search } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import Papa from 'papaparse';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox

interface Product {
  id: string;
  category_id: string;
  brand_id: string;
  name: string;
  description: string | null;
  price: number | null;
  canvas_width: number | null;
  canvas_height: number | null;
  mockup_id: string | null; // ID of the associated mockup
  mockup_image_url: string | null; // URL of the associated mockup image
}

const ProductManagementByBrandPage = () => {
  const { categoryId, brandId } = useParams<{ categoryId: string; brandId: string }>();
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState<string>('');
  const [mockupImageFile, setMockupImageFile] = useState<File | null>(null); // For mockup image file upload
  const [currentMockupImageUrl, setCurrentMockupImageUrl] = useState<string | null>(null); // For displaying current mockup image
  const [canvasWidth, setCanvasWidth] = useState<string>('300');
  const [canvasHeight, setCanvasHeight] = useState<string>('600');
  const [searchQuery, setSearchQuery] = useState<string>(''); // New state for search query
  const debounceTimeoutRef = useRef<number | null>(null); // Ref for debounce timeout
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set()); // New state for bulk selection
  const { toast } = useToast();
  const { user } = useSession();
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if a URL is from Supabase storage
  const isSupabaseStorageUrl = (url: string | null, bucketName: string) => {
    if (!url) return false;
    const supabaseStorageBaseUrl = `https://smpjbedvyqensurarrym.supabase.co/storage/v1/object/public/${bucketName}/`;
    return url.startsWith(supabaseStorageBaseUrl);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    setSelectedProductIds(new Set()); // Clear selection on re-fetch

    // Fetch category name
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryId)
      .single();
    if (categoryError) {
      console.error("Error fetching category:", categoryError);
      setError(categoryError.message);
      toast({ title: "Error", description: `Failed to load category: ${categoryError.message}`, variant: "destructive" });
      setLoading(false);
      return;
    }
    setCategoryName(categoryData?.name || 'Unknown Category');

    // Fetch brand name
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('name')
      .eq('id', brandId)
      .single();
    if (brandError) {
      console.error("Error fetching brand:", brandError);
      setError(brandError.message);
      toast({ title: "Error", description: `Failed to load brand: ${brandError.message}`, variant: "destructive" });
      setLoading(false);
      return;
    }
    setBrandName(brandData?.name || 'Unknown Brand');

    // Fetch products and their associated mockups
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
        mockups(id, image_url)
      `)
      .eq('category_id', categoryId)
      .eq('brand_id', brandId);

    // Apply search filter if searchQuery is not empty
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    const { data, error: productsError } = await query.order('name', { ascending: true });

    if (productsError) {
      console.error("Error fetching products:", productsError);
      setError(productsError.message);
      toast({ title: "Error", description: `Failed to load products: ${productsError.message}`, variant: "destructive" });
    } else {
      setProducts(data.map(p => ({
        ...p,
        mockup_id: p.mockups?.[0]?.id || null,
        mockup_image_url: p.mockups?.[0]?.image_url || null,
      })) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (categoryId && brandId) {
      // Debounce the fetchProducts call
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        fetchProducts();
      }, 300) as unknown as number; // Cast to number for clearTimeout
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [categoryId, brandId, searchQuery]); // Re-run effect when searchQuery changes

  const handleAddProduct = () => {
    setCurrentProduct(null);
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setMockupImageFile(null);
    setCurrentMockupImageUrl(null);
    setCanvasWidth('300');
    setCanvasHeight('600');
    setIsDialogOpen(true);
  };

  const handleEditProduct = async (product: Product) => {
    setCurrentProduct(product);
    setProductName(product.name);
    setProductDescription(product.description || '');
    setProductPrice(product.price?.toString() || '');
    setMockupImageFile(null); // Clear file input for edit
    setCurrentMockupImageUrl(product.mockup_image_url);

    setCanvasWidth(product.canvas_width?.toString() || '300');
    setCanvasHeight(product.canvas_height?.toString() || '600');
    setIsDialogOpen(true);
  };

  const deleteSingleProduct = async (id: string, mockupId: string | null, mockupImageUrl: string | null) => {
    // 1. Delete mockup image from storage if it exists and is a Supabase URL
    if (mockupImageUrl && isSupabaseStorageUrl(mockupImageUrl, 'order-mockups')) {
      const fileName = mockupImageUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('order-mockups')
          .remove([`mockups/${fileName}`]); // Assuming mockups are stored in 'mockups/' subfolder
        if (storageError) {
          console.error("Error deleting mockup image from storage:", storageError);
          toast({
            title: "Error",
            description: `Failed to delete mockup image: ${storageError.message}`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    // 2. Delete mockup entry from mockups table
    if (mockupId) {
      const { error: deleteMockupError } = await supabase
        .from('mockups')
        .delete()
        .eq('id', mockupId);
      if (deleteMockupError) {
        console.error("Error deleting mockup entry:", deleteMockupError);
        toast({
          title: "Error",
          description: `Failed to delete associated mockup: ${deleteMockupError.message}`,
          variant: "destructive",
        });
        return false;
      }
    }

    // 3. Delete product from products table
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: `Failed to delete product: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleDeleteProduct = async (id: string, mockupId: string | null, mockupImageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this product and its associated mockup? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    const success = await deleteSingleProduct(id, mockupId, mockupImageUrl);
    if (success) {
      toast({
        title: "Success",
        description: "Product and associated mockup deleted successfully.",
      });
      fetchProducts();
    }
    setLoading(false);
  };

  const handleFileUpload = async (file: File, bucketName: string, subfolder: string = '') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = subfolder ? `${subfolder}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (error) {
      console.error(`Error uploading image to ${bucketName}/${subfolder}:`, error);
      toast({
        title: "Error",
        description: `Failed to upload image: ${error.message}`,
        variant: "destructive",
      });
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!productName.trim() || !productPrice.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name and price cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (!categoryId || !brandId) {
      toast({
        title: "Error",
        description: "Category ID or Brand ID is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please log in.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    let finalMockupImageUrl = currentMockupImageUrl;

    // 1. Handle Mockup Image Upload
    if (mockupImageFile) {
      finalMockupImageUrl = await handleFileUpload(mockupImageFile, 'order-mockups', 'mockups'); // Use 'order-mockups' bucket, 'mockups' subfolder
      if (!finalMockupImageUrl) {
        setLoading(false);
        return; // Image upload failed
      }
    } else if (!currentMockupImageUrl && !currentProduct) {
      // If adding a new product and no mockup image is provided
      toast({
        title: "Validation Error",
        description: "Please upload a mockup image for the new product.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    let productIdToUse = currentProduct?.id;

    // 2. Insert/Update Product
    if (currentProduct) {
      // Update existing product
      const { data, error } = await supabase
        .from('products')
        .update({
          name: productName,
          description: productDescription,
          price: parseFloat(productPrice),
          canvas_width: parseInt(canvasWidth),
          canvas_height: parseInt(canvasHeight),
        })
        .eq('id', currentProduct.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating product:", error);
        toast({
          title: "Error",
          description: `Failed to update product: ${error.message}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      productIdToUse = data.id;
    } else {
      // Add new product
      const { data, error } = await supabase
        .from('products')
        .insert({
          category_id: categoryId,
          brand_id: brandId,
          name: productName,
          description: productDescription,
          price: parseFloat(productPrice),
          canvas_width: parseInt(canvasWidth),
          canvas_height: parseInt(canvasHeight),
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding product:", error);
        toast({
          title: "Error",
          description: `Failed to add product: ${error.message}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      productIdToUse = data.id;
    }

    // 3. Insert/Update Mockup
    if (productIdToUse) {
      if (currentProduct?.mockup_id) {
        // Update existing mockup
        const { error: mockupUpdateError } = await supabase
          .from('mockups')
          .update({
            image_url: finalMockupImageUrl,
            name: `${productName} Mockup`,
            designer: 'Admin',
          })
          .eq('id', currentProduct.mockup_id);

        if (mockupUpdateError) {
          console.error("Error updating mockup:", mockupUpdateError);
          toast({
            title: "Error",
            description: `Failed to update mockup: ${mockupUpdateError.message}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else if (finalMockupImageUrl) {
        // Insert new mockup (for new product or existing product without mockup)
        const { error: mockupInsertError } = await supabase
          .from('mockups')
          .insert({
            product_id: productIdToUse,
            image_url: finalMockupImageUrl,
            name: `${productName} Mockup`,
            designer: 'Admin',
            user_id: user.id, // Associate with the admin user who created it
          });

        if (mockupInsertError) {
          console.error("Error inserting mockup:", mockupInsertError);
          toast({
            title: "Error",
            description: `Failed to add mockup: ${mockupInsertError.message}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
    }

    toast({
      title: "Success",
      description: `Product and mockup ${currentProduct ? 'updated' : 'added'} successfully.`,
    });
    setIsDialogOpen(false);
    fetchProducts();
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
      mockup_id: product.mockup_id || '',
      mockup_image_url: product.mockup_image_url || '',
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `products_${brandId}_${categoryId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Success", description: "Products exported successfully as CSV." });
  };

  const handleImportProducts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", description: "Please select a CSV file to import.", variant: "destructive" });
      return;
    }

    if (file.type !== 'text/csv') {
      toast({ title: "Invalid file type", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          console.error("CSV Parsing Errors:", results.errors);
          toast({
            title: "CSV Parsing Error",
            description: `Some rows could not be parsed. First error: ${results.errors[0].message}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const importedProducts = results.data as any[];
        let successfulImports = 0;
        let failedImports = 0;

        for (const row of importedProducts) {
          try {
            const productData = {
              id: row.id || undefined, // Use undefined for new inserts, existing ID for updates
              category_id: categoryId,
              brand_id: brandId,
              name: row.name,
              description: row.description || null,
              price: row.price ? parseFloat(row.price) : null,
              canvas_width: row.canvas_width ? parseInt(row.canvas_width) : 300,
              canvas_height: row.canvas_height ? parseInt(row.canvas_height) : 600,
              // mockup_id and mockup_image_url are not directly imported via CSV for simplicity
              // They would need separate logic for image uploads and mockup table management
            };

            // Validate required fields for import
            if (!productData.name) {
              console.warn(`Skipping row due to missing name: ${JSON.stringify(row)}`);
              failedImports++;
              continue;
            }

            const { error: upsertError } = await supabase
              .from('products')
              .upsert(productData, { onConflict: 'id' }); // Use onConflict to handle updates

            if (upsertError) {
              console.error("Error upserting product:", upsertError);
              failedImports++;
            } else {
              successfulImports++;
            }
          } catch (e) {
            console.error("Error processing imported row:", row, e);
            failedImports++;
          }
        }

        if (successfulImports > 0) {
          toast({
            title: "Import Complete",
            description: `${successfulImports} product(s) imported/updated successfully. ${failedImports > 0 ? `${failedImports} failed.` : ''}`,
          });
        } else {
          toast({
            title: "Import Failed",
            description: "No products were imported or updated. Please check the console for errors and ensure your CSV format is correct.",
            variant: "destructive",
          });
        }
        fetchProducts(); // Re-fetch products to update the list
        setLoading(false);
        if (importFileInputRef.current) {
          importFileInputRef.current.value = ''; // Clear the file input
        }
      },
      error: (err) => {
        console.error("CSV Parsing Error:", err);
        toast({
          title: "CSV Parsing Error",
          description: `Failed to parse CSV file: ${err.message}`,
          variant: "destructive",
        });
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
      toast({
        title: "No products selected",
        description: "Please select at least one product to delete.",
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedProductIds.size} selected products? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
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

    if (successfulDeletions > 0) {
      toast({
        title: "Deletion Complete",
        description: `${successfulDeletions} product(s) deleted successfully. ${failedDeletions > 0 ? `${failedDeletions} failed.` : ''}`,
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: "No products were deleted. Please check the console for errors.",
        variant: "destructive",
      });
    }

    fetchProducts(); // Re-fetch products to update the list
    setLoading(false);
  };

  const isAllSelected = products.length > 0 && selectedProductIds.size === products.length;
  const isIndeterminate = selectedProductIds.size > 0 && selectedProductIds.size < products.length;

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to={`/admin/categories/${categoryId}/brands`} className="mr-4">
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
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={loading}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedProductIds.size})
              </Button>
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
            <Button onClick={handleAddProduct}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
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
                          <Checkbox
                            checked={isAllSelected}
                            indeterminate={isIndeterminate}
                            onCheckedChange={handleSelectAllProducts}
                            aria-label="Select all products"
                          />
                        </TableHead>
                        <TableHead>Mockup Image</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Canvas (WxH)</TableHead>
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
                          <TableCell>{product.description || 'N/A'}</TableCell>
                          <TableCell>${product.price?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>{product.canvas_width || 'N/A'}x{product.canvas_height || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="canvasWidth" className="text-right">
                Canvas Width
              </Label>
              <Input
                id="canvasWidth"
                type="number"
                value={canvasWidth}
                onChange={(e) => setCanvasWidth(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="canvasHeight" className="text-right">
                Canvas Height
              </Label>
              <Input
                id="canvasHeight"
                type="number"
                value={canvasHeight}
                onChange={(e) => setCanvasHeight(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mockupImage" className="text-right">
                Mockup Image
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="mockupImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setMockupImageFile(e.target.files ? e.target.files[0] : null)}
                  className="flex-1"
                />
                {currentMockupImageUrl && (
                  <div className="relative">
                    <img src={currentMockupImageUrl} alt="Current Mockup" className="w-16 h-16 object-cover rounded-md" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white hover:bg-red-600"
                      onClick={() => {
                        setCurrentMockupImageUrl(null);
                        setMockupImageFile(null);
                      }}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{currentProduct ? 'Save Changes' : 'Add Product'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagementByBrandPage;