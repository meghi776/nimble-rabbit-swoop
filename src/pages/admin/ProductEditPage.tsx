import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, XCircle, ArrowLeft } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { Switch } from '@/components/ui/switch';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { uploadFileToSupabase, deleteFileFromSupabase } from '@/utils/supabaseStorage';

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

const ProductEditPage = () => {
  const { categoryId, brandId, productId } = useParams<{ categoryId: string; brandId: string; productId?: string }>();
  const navigate = useNavigate();
  const { user } = useSession();

  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState<string>('');
  const [mockupImageFile, setMockupImageFile] = useState<File | null>(null);
  const [currentMockupImageUrl, setCurrentMockupImageUrl] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<string>('300');
  const [canvasHeight, setCanvasHeight] = useState<string>('600');
  const [isProductDisabled, setIsProductDisabled] = useState(false);
  const [productInventory, setProductInventory] = useState<string>('0');
  const [productSku, setProductSku] = useState('');
  const [mockupX, setMockupX] = useState<string>('0');
  const [mockupY, setMockupY] = useState<string>('0');
  const [mockupWidth, setMockupWidth] = useState<string>('');
  const [mockupHeight, setMockupHeight] = useState<string>('');
  const [mockupRotation, setMockupRotation] = useState<string>('0');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!productId;

  useEffect(() => {
    const fetchProductData = async () => {
      if (!isEditing || !productId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('products')
        .select(`
          *,
          mockups(id, image_url, mockup_x, mockup_y, mockup_width, mockup_height, mockup_rotation)
        `)
        .eq('id', productId)
        .single();

      if (fetchError) {
        console.error("Error fetching product for edit:", fetchError);
        showError("Failed to load product details for editing.");
        setError(fetchError.message);
      } else if (data) {
        setProductName(data.name);
        setProductDescription(data.description || '');
        setProductPrice(data.price?.toString() || '');
        setCurrentMockupImageUrl(data.mockups?.[0]?.image_url || null);
        setCanvasWidth(data.canvas_width?.toString() || '300');
        setCanvasHeight(data.canvas_height?.toString() || '600');
        setIsProductDisabled(data.is_disabled);
        setProductInventory(data.inventory?.toString() || '0');
        setProductSku(data.sku || '');
        setMockupX(data.mockups?.[0]?.mockup_x?.toString() || '0');
        setMockupY(data.mockups?.[0]?.mockup_y?.toString() || '0');
        setMockupWidth(data.mockups?.[0]?.mockup_width?.toString() || '');
        setMockupHeight(data.mockups?.[0]?.mockup_height?.toString() || '');
        setMockupRotation(data.mockups?.[0]?.mockup_rotation?.toString() || '0');
      }
      setLoading(false);
    };

    fetchProductData();
  }, [isEditing, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !brandId) {
      showError("Category ID or Brand ID is missing from URL.");
      return;
    }
    if (!user?.id) {
      showError("User not authenticated. Please log in.");
      return;
    }
    if (!productName.trim() || !productPrice.trim()) {
      showError("Product name and price are required.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading(isEditing ? "Saving product changes..." : "Adding new product...");
    let finalMockupImageUrl = currentMockupImageUrl;

    try {
      // 1. Handle Mockup Image Upload/Deletion
      if (mockupImageFile) {
        // If a new file is selected, upload it
        finalMockupImageUrl = await uploadFileToSupabase(mockupImageFile, 'order-mockups', 'mockups');
        if (!finalMockupImageUrl) {
          throw new Error("Failed to upload new mockup image.");
        }
        // If there was an old image and a new one is uploaded, delete the old one
        if (currentMockupImageUrl && currentMockupImageUrl !== finalMockupImageUrl) {
          const oldFileName = currentMockupImageUrl.split('/').pop();
          if (oldFileName) {
            await deleteFileFromSupabase(`mockups/${oldFileName}`, 'order-mockups');
          }
        }
      } else if (currentMockupImageUrl === null && isEditing) {
        // If editing and user explicitly removed the image, delete from storage
        const oldFileName = products.find(p => p.id === productId)?.mockup_image_url?.split('/').pop();
        if (oldFileName) {
          await deleteFileFromSupabase(`mockups/${oldFileName}`, 'order-mockups');
        }
      } else if (!currentMockupImageUrl && !isEditing) {
        // If adding a new product and no mockup image is provided
        throw new Error("Please upload a mockup image for the new product.");
      }

      let productIdToUse = productId;
      let mockupIdToUse = products.find(p => p.id === productId)?.mockup_id || null;

      // 2. Insert/Update Product
      if (isEditing) {
        const { data, error: updateError } = await supabase
          .from('products')
          .update({
            name: productName,
            description: productDescription,
            price: parseFloat(productPrice),
            canvas_width: parseInt(canvasWidth),
            canvas_height: parseInt(canvasHeight),
            is_disabled: isProductDisabled,
            inventory: parseInt(productInventory),
            sku: productSku.trim() === '' ? null : productSku.trim(),
          })
          .eq('id', productId)
          .select()
          .single();

        if (updateError) throw new Error(`Failed to update product: ${updateError.message}`);
        productIdToUse = data.id;
      } else {
        const { data, error: insertError } = await supabase
          .from('products')
          .insert({
            category_id: categoryId,
            brand_id: brandId,
            name: productName,
            description: productDescription,
            price: parseFloat(productPrice),
            canvas_width: parseInt(canvasWidth),
            canvas_height: parseInt(canvasHeight),
            is_disabled: isProductDisabled,
            inventory: parseInt(productInventory),
            sku: productSku.trim() === '' ? null : productSku.trim(),
          })
          .select()
          .single();

        if (insertError) throw new Error(`Failed to add product: ${insertError.message}`);
        productIdToUse = data.id;
      }

      // 3. Insert/Update Mockup
      if (productIdToUse && finalMockupImageUrl) {
        const mockupData = {
          image_url: finalMockupImageUrl,
          name: `${productName} Mockup`,
          designer: 'Admin',
          user_id: user.id,
          product_id: productIdToUse,
          mockup_x: parseFloat(mockupX),
          mockup_y: parseFloat(mockupY),
          mockup_width: mockupWidth ? parseFloat(mockupWidth) : null,
          mockup_height: mockupHeight ? parseFloat(mockupHeight) : null,
          mockup_rotation: parseFloat(mockupRotation),
        };

        if (mockupIdToUse) {
          const { error: mockupUpdateError } = await supabase
            .from('mockups')
            .update(mockupData)
            .eq('id', mockupIdToUse);
          if (mockupUpdateError) throw new Error(`Failed to update mockup: ${mockupUpdateError.message}`);
        } else {
          const { data: newMockup, error: mockupInsertError } = await supabase
            .from('mockups')
            .insert(mockupData)
            .select('id')
            .single();
          if (mockupInsertError) throw new Error(`Failed to insert mockup: ${mockupInsertError.message}`);
          mockupIdToUse = newMockup.id;
        }
      } else if (productIdToUse && !finalMockupImageUrl && mockupIdToUse) {
        // If product exists, but mockup image was removed, delete the mockup entry
        const { error: deleteMockupError } = await supabase
          .from('mockups')
          .delete()
          .eq('id', mockupIdToUse);
        if (deleteMockupError) throw new Error(`Failed to delete mockup entry: ${deleteMockupError.message}`);
      }

      showSuccess(isEditing ? "Product updated successfully!" : "Product added successfully!");
      navigate(`/admin/categories/${categoryId}/brands/${brandId}/products`);

    } catch (err: any) {
      console.error("Error during product save:", err);
      showError(err.message || "An unexpected error occurred while saving the product.");
    } finally {
      dismissToast(toastId);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to={`/admin/categories/${categoryId}/brands/${brandId}/products`} className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" value={productName} onChange={(e) => setProductName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={productSku} onChange={(e) => setProductSku(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="inventory">Inventory</Label>
              <Input id="inventory" type="number" value={productInventory} onChange={(e) => setProductInventory(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="product-status"
                checked={!isProductDisabled}
                onCheckedChange={(checked) => setIsProductDisabled(!checked)}
              />
              <Label htmlFor="product-status">
                {isProductDisabled ? 'Disabled' : 'Enabled'}
              </Label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="canvasWidth">Canvas Width</Label>
              <Input id="canvasWidth" type="number" value={canvasWidth} onChange={(e) => setCanvasWidth(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="canvasHeight">Canvas Height</Label>
              <Input id="canvasHeight" type="number" value={canvasHeight} onChange={(e) => setCanvasHeight(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="mockupImage">Mockup Image</Label>
              <Input
                id="mockupImage"
                type="file"
                accept="image/*"
                onChange={(e) => setMockupImageFile(e.target.files ? e.target.files[0] : null)}
              />
              {currentMockupImageUrl && (
                <div className="relative mt-2 w-32 h-32">
                  <img src={currentMockupImageUrl} alt="Current Mockup" className="w-full h-full object-cover rounded-md border" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                    onClick={() => {
                      setCurrentMockupImageUrl(null);
                      setMockupImageFile(null);
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mockupX">Mockup X</Label>
                <Input id="mockupX" type="number" value={mockupX} onChange={(e) => setMockupX(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="mockupY">Mockup Y</Label>
                <Input id="mockupY" type="number" value={mockupY} onChange={(e) => setMockupY(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="mockupWidth">Mockup Width (Optional)</Label>
                <Input id="mockupWidth" type="number" value={mockupWidth} onChange={(e) => setMockupWidth(e.target.value)} placeholder="Leave empty for auto" />
              </div>
              <div>
                <Label htmlFor="mockupHeight">Mockup Height (Optional)</Label>
                <Input id="mockupHeight" type="number" value={mockupHeight} onChange={(e) => setMockupHeight(e.target.value)} placeholder="Leave empty for auto" />
              </div>
            </div>
            <div>
              <Label htmlFor="mockupRotation">Mockup Rotation</Label>
              <Input id="mockupRotation" type="number" value={mockupRotation} onChange={(e) => setMockupRotation(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => navigate(`/admin/categories/${categoryId}/brands/${brandId}/products`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductEditPage;