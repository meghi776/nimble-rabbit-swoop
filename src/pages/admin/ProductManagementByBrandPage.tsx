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
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Edit, Trash2, ArrowLeft, Upload } from 'lucide-react';

interface Product {
  id: string;
  category_id: string;
  brand_id: string;
  name: string;
  description: string | null;
  image_url: string | null; // This is for the product's main image
  price: number | null;
  canvas_width: number | null;
  canvas_height: number | null;
  mockup_image_url?: string | null; // Added for display in table
}

interface Mockup {
  id: string;
  product_id: string;
  image_url: string | null;
  // Add other mockup fields if necessary, e.g., design_data
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
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null); // For product's main image
  const [mockupImageFile, setMockupImageFile] = useState<File | null>(null); // For mockup image
  const [currentMockupImageUrl, setCurrentMockupImageUrl] = useState<string | null>(null); // For existing mockup image
  const [canvasWidth, setCanvasWidth] = useState<string>('300');
  const [canvasHeight, setCanvasHeight] = useState<string>('600');
  const { toast } = useToast();

  const fetchProducts = async () => {
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
    const { data, error: productsError } = await supabase
      .from('products')
      .select('id, category_id, brand_id, name, description, image_url, price, canvas_width, canvas_height, mockups(image_url)') // Select mockups
      .eq('category_id', categoryId)
      .eq('brand_id', brandId)
      .order('name', { ascending: true });

    if (productsError) {
      console.error("Error fetching products:", productsError);
      setError(productsError.message);
      toast({ title: "Error", description: `Failed to load products: ${productsError.message}`, variant: "destructive" });
    } else {
      // Map the data to include the mockup image URL directly on the product object for easier rendering
      const productsWithMockups = data.map(p => ({
        ...p,
        mockup_image_url: p.mockups.length > 0 ? p.mockups[0].image_url : null // Assuming one mockup per product
      }));
      setProducts(productsWithMockups || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (categoryId && brandId) {
      fetchProducts();
    }
  }, [categoryId, brandId]);

  const handleAddProduct = () => {
    setCurrentProduct(null);
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductImageFile(null);
    setProductImageUrl(null);
    setMockupImageFile(null); // Clear mockup file input
    setCurrentMockupImageUrl(null); // Clear current mockup URL
    setCanvasWidth('300');
    setCanvasHeight('600');
    setIsDialogOpen(true);
  };

  const handleEditProduct = async (product: Product) => {
    setCurrentProduct(product);
    setProductName(product.name);
    setProductDescription(product.description || '');
    setProductPrice(product.price?.toString() || '');
    setProductImageFile(null); // Clear file input for edit
    setProductImageUrl(product.image_url);

    // Fetch existing mockup image for this product
    const { data: mockupData, error: mockupError } = await supabase
      .from('mockups')
      .select('image_url')
      .eq('product_id', product.id)
      .limit(1);

    if (mockupError) {
      console.error("Error fetching existing mockup:", mockupError);
      toast({ title: "Error", description: `Failed to load existing mockup: ${mockupError.message}`, variant: "destructive" });
      setCurrentMockupImageUrl(null);
    } else if (mockupData && mockupData.length > 0) {
      setCurrentMockupImageUrl(mockupData[0].image_url);
    } else {
      setCurrentMockupImageUrl(null);
    }

    setMockupImageFile(null); // Clear mockup file input
    setCanvasWidth(product.canvas_width?.toString() || '300');
    setCanvasHeight(product.canvas_height?.toString() || '600');
    setIsDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string, productImageUrl: string | null, mockupImageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this product and its associated mockup?")) {
      return;
    }

    setLoading(true);

    // Delete product's main image from storage if it exists
    if (productImageUrl) {
      const fileName = productImageUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('product-images')
          .remove([fileName]);
        if (storageError) {
          console.error("Error deleting product image from storage:", storageError);
          toast({
            title: "Error",
            description: `Failed to delete product image: ${storageError.message}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
    }

    // Delete mockup image from storage if it exists
    if (mockupImageUrl) {
      const fileName = mockupImageUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('mockups-bucket') // Assuming a new bucket for mockups
          .remove([fileName]);
        if (storageError) {
          console.error("Error deleting mockup image from storage:", storageError);
          toast({
            title: "Error",
            description: `Failed to delete mockup image: ${storageError.message}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
    }

    // Delete mockup entry from mockups table
    const { error: deleteMockupError } = await supabase
      .from('mockups')
      .delete()
      .eq('product_id', id);

    if (deleteMockupError) {
      console.error("Error deleting mockup entry:", deleteMockupError);
      toast({
        title: "Error",
        description: `Failed to delete mockup entry: ${deleteMockupError.message}`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Delete product from products table
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
    } else {
      toast({
        title: "Success",
        description: "Product and associated mockup deleted successfully.",
      });
      fetchProducts();
    }
    setLoading(false);
  };

  const handleFileUpload = async (file: File, bucketName: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`; // Add random string to prevent collisions
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (error) {
      console.error(`Error uploading image to ${bucketName}:`, error);
      toast({
        title: "Error",
        description: `Failed to upload image to ${bucketName}: ${error.message}`,
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

    setLoading(true);
    let newProductImageUrl = productImageUrl;
    let newMockupImageUrl = currentMockupImageUrl; // Start with existing mockup URL

    // 1. Upload product main image if new file is selected
    if (productImageFile) {
      newProductImageUrl = await handleFileUpload(productImageFile, 'product-images');
      if (!newProductImageUrl) {
        setLoading(false);
        return; // Image upload failed
      }
    }

    // 2. Upload mockup image if new file is selected
    if (mockupImageFile) {
      newMockupImageUrl = await handleFileUpload(mockupImageFile, 'mockups-bucket'); // Use new bucket
      if (!newMockupImageUrl) {
        setLoading(false);
        return; // Mockup image upload failed
      }
    }

    const productData = {
      category_id: categoryId,
      brand_id: brandId,
      name: productName,
      description: productDescription,
      image_url: newProductImageUrl, // This is for the product's main image
      price: parseFloat(productPrice),
      canvas_width: parseInt(canvasWidth),
      canvas_height: parseInt(canvasHeight),
    };

    let productIdToUse = currentProduct?.id;

    if (currentProduct) {
      // Update existing product
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', currentProduct.id)
        .select()
        .single(); // Use single() to get the updated product data

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
      toast({
        title: "Success",
        description: "Product updated successfully.",
      });
    } else {
      // Add new product
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single(); // Use single() to get the newly created product data

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
      toast({
        title: "Success",
        description: "Product added successfully.",
      });
    }

    // 3. Handle mockup entry in 'mockups' table
    if (productIdToUse && newMockupImageUrl) {
      const { data: existingMockup, error: fetchMockupError } = await supabase
        .from('mockups')
        .select('id')
        .eq('product_id', productIdToUse)
        .limit(1);

      if (fetchMockupError) {
        console.error("Error checking existing mockup:", fetchMockupError);
        toast({
          title: "Error",
          description: `Failed to check existing mockup: ${fetchMockupError.message}`,
          variant: "destructive",
        });
      } else if (existingMockup && existingMockup.length > 0) {
        // Update existing mockup
        const { error: updateMockupError } = await supabase
          .from('mockups')
          .update({ image_url: newMockupImageUrl })
          .eq('id', existingMockup[0].id);

        if (updateMockupError) {
          console.error("Error updating mockup:", updateMockupError);
          toast({
            title: "Error",
            description: `Failed to update mockup: ${updateMockupError.message}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Mockup updated successfully.",
          });
        }
      } else {
        // Insert new mockup
        const { error: insertMockupError } = await supabase
          .from('mockups')
          .insert({ product_id: productIdToUse, image_url: newMockupImageUrl, name: `${productName} Mockup`, designer: 'Auto' }); // Add default name/designer

        if (insertMockupError) {
          console.error("Error inserting mockup:", insertMockupError);
          toast({
            title: "Error",
            description: `Failed to add mockup: ${insertMockupError.message}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Mockup added successfully.",
          });
        }
      }
    } else if (productIdToUse && !newMockupImageUrl && currentMockupImageUrl) {
        // If mockup image was removed (cleared) during edit, delete the mockup entry
        const { error: deleteMockupError } = await supabase
            .from('mockups')
            .delete()
            .eq('product_id', productIdToUse);
        if (deleteMockupError) {
            console.error("Error deleting mockup entry:", deleteMockupError);
            toast({
                title: "Error",
                description: `Failed to delete mockup entry: ${deleteMockupError.message}`,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Info",
                description: "Mockup removed successfully.",
            });
        }
    }


    setIsDialogOpen(false);
    fetchProducts(); // Re-fetch all products to update the list
    setLoading(false);
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to={`/admin/categories/${categoryId}/brands`} className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Products for {brandName || 'Brand'} ({categoryName || 'Category'})
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Products List</CardTitle>
          <Button onClick={handleAddProduct}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Button>
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
                        <TableHead>Image</TableHead>
                        <TableHead>Mockup</TableHead> {/* New column for mockup */}
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
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded-md" />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">No Image</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.mockup_image_url ? ( // Display mockup image
                              <img src={product.mockup_image_url} alt={`${product.name} Mockup`} className="w-16 h-16 object-cover rounded-md" />
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
                              onClick={() => handleDeleteProduct(product.id, product.image_url, product.mockup_image_url)}
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
              <Label htmlFor="productImage" className="text-right">
                Product Image
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="productImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProductImageFile(e.target.files ? e.target.files[0] : null)}
                  className="col-span-3"
                />
                {productImageUrl && (
                  <img src={productImageUrl} alt="Current Product" className="w-16 h-16 object-cover rounded-md" />
                )}
              </div>
            </div>
            {/* NEW: Mockup Image Upload */}
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
                  className="col-span-3"
                />
                {currentMockupImageUrl && (
                  <img src={currentMockupImageUrl} alt="Current Mockup" className="w-16 h-16 object-cover rounded-md" />
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