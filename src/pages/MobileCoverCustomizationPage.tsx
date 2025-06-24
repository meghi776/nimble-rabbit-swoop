import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Corrected: changed '=>' to 'from'
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  PlusCircle,
  Trash2,
  Text,
  Palette,
  LayoutTemplate,
  Image,
  ArrowLeft,
  Eye,
  Download,
  ShoppingCart,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/contexts/SessionContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  canvas_width: number;
  canvas_height: number;
  mockup_image_url?: string | null;
  price: number;
}

interface DesignElement {
  id: string;
  type: 'text' | 'image';
  value: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  textShadow?: boolean;
}

interface TouchState {
  mode: 'none' | 'dragging' | 'pinching';
  startX: number;
  startY: number;
  initialElementX: number;
  initialElementY: number;
  initialDistance?: number;
  initialElementWidth?: number;
  initialElementHeight?: number;
  initialMidX?: number;
  initialMidY?: number;
  activeElementId: string | null;
}

const MobileCoverCustomizationPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // States for text properties in footer
  const [currentTextContent, setCurrentTextContent] = useState('');
  const [currentFontSize, setCurrentFontSize] = useState<number[]>([24]);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentFontFamily, setCurrentFontFamily] = useState('Arial');
  const [currentTextShadowEnabled, setCurrentTextShadowEnabled] = useState(false);

  const designAreaRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useSession();

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');

  const touchState = useRef<TouchState>({
    mode: 'none',
    startX: 0,
    startY: 0,
    initialElementX: 0,
    initialElementY: 0,
    activeElementId: null,
  });

  useEffect(() => {
    const fetchProductAndMockup = async () => {
      setLoading(true);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, mockups(image_url, design_data)')
        .eq('id', productId)
        .single();

      if (productError) {
        console.error("Error fetching product:", productError);
        setError(productError.message);
        toast({ title: "Error", description: `Failed to load product: ${productError.message}`, variant: "destructive" });
      } else if (productData) {
        setProduct({
          ...productData,
          mockup_image_url: productData.mockups.length > 0 ? productData.mockups[0].image_url : null,
        });
        if (productData.mockups.length > 0 && productData.mockups[0].design_data) {
          try {
            setDesignElements(JSON.parse(productData.mockups[0].design_data as string));
          } catch (parseError) {
            console.error("Error parsing design data:", parseError);
            toast({ title: "Error", description: "Failed to parse existing design data.", variant: "destructive" });
          }
        }
      }
      setLoading(false);
    };

    if (productId) {
      fetchProductAndMockup();
    }
  }, [productId]);

  useEffect(() => {
    return () => {
      designElements.forEach(el => {
        if (el.type === 'image' && el.value.startsWith('blob:')) {
          URL.revokeObjectURL(el.value);
        }
      });
    };
  }, [designElements]);

  const addImageElement = (imageUrl: string) => {
    if (!product) {
      toast({ title: "Error", description: "Product details not loaded. Cannot add image.", variant: "destructive" });
      return;
    }
    const newElement: DesignElement = {
      id: `image-${Date.now()}`,
      type: 'image',
      value: imageUrl,
      x: 0,
      y: 0,
      width: product.canvas_width,
      height: product.canvas_height,
    };
    setDesignElements([...designElements, newElement]);
    setSelectedElementId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    setDesignElements(prev =>
      prev.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
  };

  const deleteElement = (id: string) => {
    setDesignElements(prev => {
      const elementToDelete = prev.find(el => el.id === id);
      if (elementToDelete && elementToDelete.type === 'image' && elementToDelete.value.startsWith('blob:')) {
        URL.revokeObjectURL(elementToDelete.value);
      }
      return prev.filter(el => el.id !== id);
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !designAreaRef.current) return;

    // If it's a text element, populate the footer controls
    if (element.type === 'text') {
      setCurrentTextContent(element.value);
      setCurrentFontSize([element.fontSize || 24]);
      setCurrentTextColor(element.color || '#000000');
      setCurrentFontFamily(element.fontFamily || 'Arial');
      setCurrentTextShadowEnabled(element.textShadow || false);
    }

    const designAreaRect = designAreaRef.current.getBoundingClientRect();
    const offsetX = e.clientX - (element.x + designAreaRect.left);
    const offsetY = e.clientY - (element.y + designAreaRect.top);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - designAreaRect.left - offsetX;
      const newY = moveEvent.clientY - designAreaRect.top - offsetY;
      updateElement(id, { x: newX, y: newY });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const element = designElements.find(el => el.id === id);
    if (!element) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width || 0;
    const startHeight = element.height || 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(20, startWidth + (moveEvent.clientX - startX));
      const newHeight = Math.max(20, startHeight + (moveEvent.clientY - startY));
      updateElement(id, { width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !designAreaRef.current || !product) return;

    // If it's a text element, populate the footer controls
    if (element.type === 'text') {
      setCurrentTextContent(element.value);
      setCurrentFontSize([element.fontSize || 24]);
      setCurrentTextColor(element.color || '#000000');
      setCurrentFontFamily(element.fontFamily || 'Arial');
      setCurrentTextShadowEnabled(element.textShadow || false);
    }

    const designAreaRect = designAreaRef.current.getBoundingClientRect();

    if (e.touches.length === 1) {
      touchState.current = {
        mode: 'dragging',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialElementX: element.x,
        initialElementY: element.y,
        activeElementId: id,
      };
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const initialDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const initialMidX = (touch1.clientX + touch2.clientX) / 2;
      const initialMidY = (touch1.clientY + touch2.clientY) / 2;

      touchState.current = {
        mode: 'pinching',
        startX: initialMidX,
        startY: initialMidY,
        initialElementX: element.x,
        initialElementY: element.y,
        initialDistance: initialDistance,
        initialElementWidth: element.width || product.canvas_width,
        initialElementHeight: element.height || product.canvas_height,
        initialMidX: initialMidX - designAreaRect.left,
        initialMidY: initialMidY - designAreaRect.top,
        activeElementId: id,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const { mode, startX, startY, initialElementX, initialElementY, initialDistance, initialElementWidth, initialElementHeight, initialMidX, initialMidY, activeElementId } = touchState.current;
    if (!activeElementId || !designAreaRef.current) return;

    const element = designElements.find(el => el.id === activeElementId);
    if (!element) return;

    const designAreaRect = designAreaRef.current.getBoundingClientRect();

    if (mode === 'dragging' && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      updateElement(activeElementId, {
        x: initialElementX + deltaX,
        y: initialElementY + deltaY,
      });
    } else if (mode === 'pinching' && e.touches.length === 2 && initialDistance !== undefined && initialElementWidth !== undefined && initialElementHeight !== undefined && initialMidX !== undefined && initialMidY !== undefined) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const scaleFactor = newDistance / initialDistance;

      const newWidth = Math.max(20, initialElementWidth * scaleFactor);
      const newHeight = Math.max(20, initialElementHeight * scaleFactor);

      const currentMidX = (touch1.clientX + touch2.clientX) / 2 - designAreaRect.left;
      const currentMidY = (touch1.clientY + touch2.clientY) / 2 - designAreaRect.top;

      const newX = currentMidX - (initialMidX - initialElementX) * scaleFactor;
      const newY = currentMidY - (initialMidY - initialElementY) * scaleFactor;

      updateElement(activeElementId, {
        width: newWidth,
        height: newHeight,
        x: newX,
        y: newY,
      });
    }
  };

  const handleTouchEnd = () => {
    touchState.current = {
      mode: 'none',
      startX: 0,
      startY: 0,
      initialElementX: 0,
      initialElementY: 0,
      activeElementId: null,
    };
  };

  const handleSaveDesign = async () => {
    if (!product) return;

    setLoading(true);
    const savableDesignElements = designElements.map(el => {
      if (el.type === 'image' && el.value.startsWith('blob:')) {
        toast({
          title: "Warning",
          description: "Temporary images (from your device) are not saved with the design. Please upload them to the server if you want them to persist.",
          variant: "destructive",
        });
        return null;
      }
      return el;
    }).filter(Boolean);

    const designData = JSON.stringify(savableDesignElements);

    const { data: existingMockup, error: fetchMockupError } = await supabase
      .from('mockups')
      .select('id')
      .eq('product_id', product.id)
      .limit(1);

    if (fetchMockupError) {
      console.error("Error checking existing mockup:", fetchMockupError);
      toast({ title: "Error", description: `Failed to save design: ${fetchMockupError.message}`, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (existingMockup && existingMockup.length > 0) {
      const { error: updateError } = await supabase
        .from('mockups')
        .update({ design_data: designData })
        .eq('id', existingMockup[0].id);

      if (updateError) {
        console.error("Error updating mockup design:", updateError);
        toast({ title: "Error", description: `Failed to update design: ${updateError.message}`, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Design saved successfully!" });
      }
    } else {
      const { error: insertError } = await supabase
        .from('mockups')
        .insert({
          product_id: product.id,
          image_url: product.mockup_image_url,
          name: `${product.name} Custom Design`,
          designer: 'Customer',
          design_data: designData,
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
        });

      if (insertError) {
        console.error("Error inserting new mockup with design:", insertError);
        toast({ title: "Error", description: `Failed to save design: ${insertError.message}`, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Design saved successfully!" });
      }
    }
    setLoading(false);
  };

  const handleImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    addImageElement(imageUrl);
    toast({ title: "Success", description: "Image added to design." });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedElement = designElements.find(el => el.id === selectedElementId);

  // Effect to update text properties states when a text element is selected
  useEffect(() => {
    if (selectedElement && selectedElement.type === 'text') {
      setCurrentTextContent(selectedElement.value);
      setCurrentFontSize([selectedElement.fontSize || 24]);
      setCurrentTextColor(selectedElement.color || '#000000');
      setCurrentFontFamily(selectedElement.fontFamily || 'Arial');
      setCurrentTextShadowEnabled(selectedElement.textShadow || false);
    } else {
      // Reset states if no text element is selected or a different type is selected
      setCurrentTextContent('');
      setCurrentFontSize([24]);
      setCurrentTextColor('#000000');
      setCurrentFontFamily('Arial');
      setCurrentTextShadowEnabled(false);
    }
  }, [selectedElement]);

  const handlePreviewClick = async () => {
    if (!canvasContentRef.current) {
      toast({ title: "Error", description: "Design area not found for preview.", variant: "destructive" });
      return;
    }

    setLoading(true);
    let originalMockupPointerEvents = '';
    const mockupImageElement = canvasContentRef.current.querySelector('img[alt="Phone Mockup Overlay"]');

    try {
      const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      if (selectedElementDiv) {
        selectedElementDiv.classList.remove('border-2', 'border-blue-500');
      }

      // Temporarily adjust pointer-events for capture
      if (mockupImageElement instanceof HTMLElement) {
        originalMockupPointerEvents = mockupImageElement.style.pointerEvents;
        mockupImageElement.style.pointerEvents = 'auto'; // Make it visible to html2canvas
      }

      const canvas = await html2canvas(canvasContentRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewImageUrl(dataUrl);
      setIsPreviewModalOpen(true);
    } catch (err) {
      console.error("Error generating preview:", err);
      toast({ title: "Error", description: "Failed to generate preview image.", variant: "destructive" });
    } finally {
      // Restore pointer-events
      if (mockupImageElement instanceof HTMLElement) {
        mockupImageElement.style.pointerEvents = originalMockupPointerEvents;
      }
      const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      if (selectedElementDiv) {
        selectedElementDiv.classList.add('border-2', 'border-blue-500');
      }
      setLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (previewImageUrl) {
      const link = document.createElement('a');
      link.href = previewImageUrl;
      link.download = `${product?.name || 'custom_design'}_preview.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Success", description: "Image downloaded successfully!" });
    } else {
      toast({ title: "Error", description: "No image to download. Please generate a preview first.", variant: "destructive" });
    }
  };

  const handleBuyNowClick = () => {
    console.log("handleBuyNowClick: Current user object:", user);
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to place an order.", variant: "destructive" });
      navigate('/login'); // Redirect to login if not authenticated
      return;
    }
    if (!product) {
      toast({ title: "Error", description: "Product not loaded. Cannot proceed with order.", variant: "destructive" });
      return;
    }
    setIsCheckoutModalOpen(true);
  };

  const handlePlaceOrder = async () => {
    if (!product || !user?.id) {
      console.error("handlePlaceOrder: Product or user information missing. Product:", product, "User:", user);
      toast({ title: "Error", description: "Product or user information missing.", variant: "destructive" });
      return;
    }
    if (!customerName.trim() || !customerAddress.trim() || !customerPhone.trim()) {
      toast({ title: "Validation Error", description: "Please fill in all customer details.", variant: "destructive" });
      return;
    }

    setLoading(true);
    let orderedDesignImageUrl: string | null = null;
    let originalMockupPointerEvents = '';
    const mockupImageElement = canvasContentRef.current?.querySelector('img[alt="Phone Mockup Overlay"]');

    try {
      // 1. Generate image of the customized product
      if (!canvasContentRef.current) {
        throw new Error("Design area not found for order image capture.");
      }

      const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      if (selectedElementDiv) {
        selectedElementDiv.classList.remove('border-2', 'border-blue-500');
      }

      // Temporarily adjust pointer-events for capture
      if (mockupImageElement instanceof HTMLElement) {
        originalMockupPointerEvents = mockupImageElement.style.pointerEvents;
        mockupImageElement.style.pointerEvents = 'auto'; // Make it visible to html2canvas
      }

      const canvas = await html2canvas(canvasContentRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const dataUrl = canvas.toDataURL('image/png');

      // Convert data URL to Blob
      const blob = await (await fetch(dataUrl)).blob();

      // 2. Upload the generated image to Supabase Storage
      const fileExt = 'png';
      const fileName = `${product.id}-${Date.now()}.${fileExt}`;
      const filePath = `orders/${fileName}`; // Store in an 'orders' subfolder

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-mockups') // Assuming a bucket named 'order-mockups'
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload order image: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('order-mockups')
        .getPublicUrl(filePath);

      orderedDesignImageUrl = publicUrlData.publicUrl;

      // 3. Save order details to the 'orders' table
      console.log("Attempting to insert order with user_id:", user.id); // Log user.id here
      const { error: orderInsertError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          product_id: product.id,
          customer_name: customerName,
          customer_address: customerAddress,
          customer_phone: customerPhone,
          payment_method: paymentMethod,
          total_price: product.price, // Use product's price for now
          ordered_design_image_url: orderedDesignImageUrl,
          ordered_design_data: designElements, // Save the design elements JSON
        });

      if (orderInsertError) {
        console.error("Supabase insert error:", orderInsertError); // Log the full error object
        throw new Error(`Failed to place order: ${orderInsertError.message}`);
      }

      toast({ title: "Success", description: "Your order has been placed successfully!" });
      setIsCheckoutModalOpen(false);
      navigate('/orders'); // Redirect to orders history page
    } catch (err: any) {
      console.error("Error placing order:", err);
      toast({ title: "Order Failed", description: err.message || "An unexpected error occurred while placing your order.", variant: "destructive" });
    } finally {
      // Restore pointer-events
      if (mockupImageElement instanceof HTMLElement) {
        mockupImageElement.style.pointerEvents = originalMockupPointerEvents;
      }
      const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      if (selectedElementDiv) {
        selectedElementDiv.classList.add('border-2', 'border-blue-500');
      }
      setLoading(false);
    }
  };

  const handleAddTextClick = () => {
    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      value: 'New Text', // Default text
      x: 50,
      y: 50,
      fontSize: 24,
      color: '#000000',
      fontFamily: 'Arial',
      textShadow: false,
    };
    setDesignElements([...designElements, newElement]);
    setSelectedElementId(newElement.id); // Select the newly added element
    setCurrentTextContent(newElement.value);
    setCurrentFontSize([newElement.fontSize || 24]);
    setCurrentTextColor(newElement.color || '#000000');
    setCurrentFontFamily(newElement.fontFamily || 'Arial');
    setCurrentTextShadowEnabled(newElement.textShadow || false);
    toast({ title: "Success", description: "New text element added." });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between py-2 px-4 bg-white dark:bg-gray-800 shadow-md">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {product?.name || 'Loading Product...'}
        </h1>
        <Button onClick={handlePreviewClick} variant="ghost" size="icon">
          <Eye className="h-6 w-6 text-blue-600" />
        </Button>
      </header>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      )}
      {error && (
        <div className="flex-1 flex items-center justify-center text-red-500">
          <p>Error: {error}</p>
        </div>
      )}

      {!loading && !error && product && (
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto pb-48"> {/* Increased padding-bottom */}
          <div
            ref={designAreaRef}
            className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center relative overflow-hidden p-4"
            style={{
              width: `${product.canvas_width}px`,
              height: `${product.canvas_height}px`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              touchAction: 'none',
            }}
          >
            <div
              ref={canvasContentRef}
              className="relative bg-white shadow-lg overflow-hidden"
              style={{
                width: `${product.canvas_width}px`,
                height: `${product.canvas_height}px`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                touchAction: 'none',
              }}
              onClick={(e) => {
                if (e.target === canvasContentRef.current) {
                  fileInputRef.current?.click();
                }
              }}
            >
              {/* Design elements (user's image, text) */}
              {designElements.map(el => (
                <div
                  key={el.id}
                  data-element-id={el.id}
                  className={`absolute cursor-grab ${selectedElementId === el.id ? 'border-2 border-blue-500' : ''}`}
                  style={{
                    left: el.x,
                    top: el.y,
                    transformOrigin: 'center center',
                    width: el.type === 'image' ? `${el.width}px` : 'auto',
                    height: el.type === 'image' ? `${el.height}px` : 'auto',
                    zIndex: 5, // Lower z-index for design elements
                    touchAction: 'none',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  onTouchStart={(e) => handleTouchStart(e, el.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {el.type === 'text' ? (
                    <span
                      style={{
                        fontSize: `${el.fontSize}px`,
                        color: el.color,
                        whiteSpace: 'nowrap',
                        fontFamily: el.fontFamily,
                        textShadow: el.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                      }}
                    >
                      {el.value}
                    </span>
                  ) : (
                    <img
                      src={el.value}
                      alt="design element"
                      className="w-full h-full object-contain"
                    />
                  )}
                  {selectedElementId === el.id && el.type === 'image' && (
                    <div
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize"
                      onMouseDown={(e) => handleResizeMouseDown(e, el.id)}
                    />
                  )}
                </div>
              ))}

              {/* Mockup overlay - always on top visually */}
              {product.mockup_image_url && (
                <img
                  src={product.mockup_image_url}
                  alt="Phone Mockup Overlay"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ zIndex: 10 }}
                />
              )}

              {!designElements.length && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer border-2 border-dashed border-gray-400 rounded-lg m-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PlusCircle className="h-12 w-12 mb-2" />
                  <p className="text-lg font-medium">Add Your Photo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileSelect}
        accept="image/*"
        className="hidden"
      />

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-2 flex flex-col border-t border-gray-200 dark:border-gray-700 z-10">
        {/* Main action buttons */}
        <div className="flex justify-around items-center w-full mb-2">
          <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={handleAddTextClick}>
            <Text className="h-6 w-6" />
            <span className="text-xs mt-1">Add Text</span>
          </Button>
          <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={() => fileInputRef.current?.click()}>
            <Image className="h-6 w-6" />
            <span className="text-xs mt-1">Your Photo</span>
          </Button>
          <Button variant="ghost" className="flex flex-col h-auto p-2">
            <Palette className="h-6 w-6" />
            <span className="text-xs mt-1">Back Color</span>
          </Button>
          <Button variant="ghost" className="flex flex-col h-auto p-2">
            <LayoutTemplate className="h-6 w-6" />
            <span className="text-xs mt-1">Readymade</span>
          </Button>
          <Button variant="default" className="flex flex-col h-auto p-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleBuyNowClick}>
            <ShoppingCart className="h-6 w-6" />
            <span className="text-xs mt-1">Buy Now</span>
          </Button>
        </div>

        {/* Conditional Text Properties Section */}
        {selectedElement && selectedElement.type === 'text' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-2 border-t border-gray-200 dark:border-gray-700">
            {/* Text Content */}
            <div className="col-span-full">
              <Label htmlFor="text-content" className="sr-only">Text Content</Label>
              <Textarea
                id="text-content"
                placeholder="Type your text here..."
                value={currentTextContent}
                onChange={(e) => {
                  setCurrentTextContent(e.target.value);
                  updateElement(selectedElement.id, { value: e.target.value });
                }}
                className="w-full text-sm"
              />
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-2">
              <Label htmlFor="font-size" className="text-xs whitespace-nowrap">Size: {currentFontSize[0]}</Label>
              <Slider
                id="font-size"
                min={10}
                max={100}
                step={1}
                value={currentFontSize}
                onValueChange={(val) => {
                  setCurrentFontSize(val);
                  updateElement(selectedElement.id, { fontSize: val[0] });
                }}
                className="flex-1"
              />
            </div>

            {/* Text Color */}
            <div className="flex items-center gap-2">
              <Label htmlFor="text-color" className="text-xs whitespace-nowrap">Color:</Label>
              <Input
                id="text-color"
                type="color"
                value={currentTextColor}
                onChange={(e) => {
                  setCurrentTextColor(e.target.value);
                  updateElement(selectedElement.id, { color: e.target.value });
                }}
                className="w-16 h-8 p-0 border-none"
              />
            </div>

            {/* Font Family */}
            <div className="flex items-center gap-2">
              <Label htmlFor="font-family" className="text-xs whitespace-nowrap">Font:</Label>
              <Select value={currentFontFamily} onValueChange={(val) => {
                setCurrentFontFamily(val);
                updateElement(selectedElement.id, { fontFamily: val });
              }}>
                <SelectTrigger id="font-family" className="h-8 text-xs">
                  <SelectValue placeholder="Select a font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="monospace">Monospace</SelectItem>
                  <SelectItem value="sans-serif">Sans-serif</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Shadow */}
            <div className="flex items-center space-x-2">
              <Switch
                id="text-shadow"
                checked={currentTextShadowEnabled}
                onCheckedChange={(checked) => {
                  setCurrentTextShadowEnabled(checked);
                  updateElement(selectedElement.id, { textShadow: checked });
                }}
              />
              <Label htmlFor="text-shadow" className="text-xs">Shadow</Label>
            </div>

            {/* Delete Button for selected element */}
            {selectedElementId && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-2 md:mt-0"
                onClick={() => {
                  deleteElement(selectedElementId);
                  setSelectedElementId(null); // Deselect after deleting
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Design Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-4">
            {previewImageUrl ? (
              <img src={previewImageUrl} alt="Design Preview" className="max-w-full h-auto border rounded-md" />
            ) : (
              <p>No preview available. Please try again.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>Close</Button>
            <Button onClick={handleDownloadImage} disabled={!previewImageUrl}>
              <Download className="mr-2 h-4 w-4" /> Download Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-name" className="text-right">
                Name
              </Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-address" className="text-right">
                Address
              </Label>
              <Textarea
                id="customer-address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="customer-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-method" className="text-right">
                Payment
              </Label>
              <Input
                id="payment-method"
                value="Cash on Delivery"
                readOnly
                className="col-span-3 bg-gray-100 dark:bg-gray-700"
              />
            </div>
            {product && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Total Price</Label>
                <span className="col-span-3 text-lg font-bold">${product.price?.toFixed(2)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileCoverCustomizationPage;