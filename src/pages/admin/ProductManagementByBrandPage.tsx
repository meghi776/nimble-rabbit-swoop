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
import { PlusCircle, Edit, Trash2, ArrowLeft, Upload, XCircle } from 'lucide-react'; // Added XCircle for clear button
import { useSession } from '@/contexts/SessionContext'; // Import useSession

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
  const [canvasWidth, setCanvasWidth] = useState<string>('300');
  const [canvasHeight, setCanvasHeight] = useState<string>('600');
  const { toast } = useToast();
  const { user } = useSession(); // Get the current user from session

  // Helper to check if a URL is from Supabase storage
  const isSupabaseStorageUrl = (url: string | null, bucketName: string) => {
    if (!url) return false;
    const supabaseStorageBaseUrl = `https://smpjbedvyqensurarrym.supabase.co/storage/v1/object/public/${bucketName}/`;
    return url.startsWith(supabaseStorageBaseUrl);
  };

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

    // Fetch products (removed mockups join)
    const { data, error: productsError } = await supabase
      .from('products')
      .select('id, category_id, brand_id, name, description, image_url, price, canvas_width, canvas_height')
      .eq('category_id', categoryId)
      .eq('brand_id', brandId)
      .order('name', { ascending: true });

    if (productsError) {
      console.error("Error fetching products:", productsError);
      setError(productsError.message);
      toast({ title: "Error", description: `Failed to load products: ${productsError.message}`, variant: "destructive" });
    } else {
      setProducts(data || []);
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

    setCanvasWidth(product.canvas_width?.toString() || '300');
    setCanvasHeight(product.canvas_height?.toString() || '600');
    setIsDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string, productImageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    setLoading(true);

    // Delete product's main image from storage if it exists and is a Supabase URL
    if (productImageUrl && isSupabaseStorageUrl(productImageUrl, 'product-images')) {
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
        description: "Product deleted successfully.",
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
    let finalProductImageUrl = productImageUrl;

    // 1. Handle Product Main Image
    if (productImageFile) {
      finalProductImageUrl = await handleFileUpload(productImageFile, 'product-images');
      if (!finalProductImageUrl) {
        setLoading(false);
        return; // Image upload failed
      }
    }

    const productData = {
      category_id: categoryId,
      brand_id: brandId,
      name: productName,
      description: productDescription,
      image_url: finalProductImageUrl, // This is for the product's main image
      price: parseFloat(productPrice),
      canvas_width: parseInt(canvasWidth),
      canvas_height: parseInt(canvasHeight),
    };

    if (currentProduct) {
      // Update existing product
      const { data, error } = await supabase
        .from('products')
        .update(productData)
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
      toast({
        title: "Success",
        description: "Product added successfully.",
      });
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
                              onClick={() => handleDeleteProduct(product.id, product.image_url)}
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
                  className="flex-1"
                />
                {productImageUrl && (
                  <img src={productImageUrl} alt="Current Product" className="w-16 h-16 object-cover rounded-md" />
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