import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Palette, // For Back Color
  LayoutTemplate, // For Readymade
  Image, // For Your Photo
  ArrowLeft,
  Check,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  canvas_width: number;
  canvas_height: number;
  mockup_image_url?: string | null;
}

interface DesignElement {
  id: string;
  type: 'text' | 'image';
  value: string; // text content or image URL (can be blob URL for temporary images)
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  // Removed rotation?: number;
  // Removed scale?: number;
}

const MobileCoverCustomizationPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [fontSize, setFontSize] = useState<number[]>([24]);
  const [textColor, setTextColor] = useState('#000000');
  // Removed rotation and scale states
  const designAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input
  const { toast } = useToast();

  // Modals state
  const [isAddTextModalOpen, setIsAddTextModalOpen] = useState(false);

  useEffect(() => {
    const fetchProductAndMockup = async () => {
      setLoading(true);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, mockups(image_url, design_data)') // Select design_data as well
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
        // Load existing design data if available
        if (productData.mockups.length > 0 && productData.mockups[0].design_data) {
          try {
            // Note: Temporary blob URLs will not persist across page loads.
            // Only server-stored image URLs will load correctly from saved design_data.
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

  // Cleanup for temporary blob URLs when component unmounts or elements are removed
  useEffect(() => {
    return () => {
      designElements.forEach(el => {
        if (el.type === 'image' && el.value.startsWith('blob:')) {
          URL.revokeObjectURL(el.value);
        }
      });
    };
  }, [designElements]);


  const addTextElement = () => {
    if (!newText.trim()) {
      toast({ title: "Error", description: "Text cannot be empty.", variant: "destructive" });
      return;
    }
    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      value: newText,
      x: 50,
      y: 50,
      fontSize: fontSize[0],
      color: textColor,
      // Removed rotation and scale
    };
    setDesignElements([...designElements, newElement]);
    setNewText('');
    setSelectedElementId(newElement.id);
    setIsAddTextModalOpen(false); // Close modal after adding
  };

  const addImageElement = (imageUrl: string) => {
    if (!product) {
      toast({ title: "Error", description: "Product details not loaded. Cannot add image.", variant: "destructive" });
      return;
    }
    const newElement: DesignElement = {
      id: `image-${Date.now()}`,
      type: 'image',
      value: imageUrl,
      x: 0, // Position at top-left
      y: 0, // Position at top-left
      width: product.canvas_width, // Set width to canvas width
      height: product.canvas_height, // Set height to canvas height
      // Removed rotation and scale
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
        URL.revokeObjectURL(elementToDelete.value); // Revoke blob URL to free memory
      }
      return prev.filter(el => el.id !== id);
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const handleDrag = (e: React.MouseEvent, id: string) => {
    const element = designElements.find(el => el.id === id);
    if (!element || !designAreaRef.current) return;

    const designAreaRect = designAreaRef.current.getBoundingClientRect();
    const elementRect = e.currentTarget.getBoundingClientRect();

    const offsetX = e.clientX - elementRect.left;
    const offsetY = e.clientY - elementRect.top;

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

  const handleResize = (e: React.MouseEvent, id: string) => {
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

  const handleSaveDesign = async () => {
    if (!product) return;

    setLoading(true);
    // Filter out temporary blob URLs before saving to database
    // If you want to save temporary images, you would upload them here first.
    const savableDesignElements = designElements.map(el => {
      if (el.type === 'image' && el.value.startsWith('blob:')) {
        // For now, we'll just remove temporary images from the saved design.
        // In a real app, you'd upload them to Supabase storage here and replace the blob URL with the public URL.
        toast({
          title: "Warning",
          description: "Temporary images (from your device) are not saved with the design. Please upload them to the server if you want them to persist.",
          variant: "destructive",
        });
        return null; // Exclude temporary images from saved design
      }
      return el;
    }).filter(Boolean); // Remove nulls

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

    // Clear the file input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedElement = designElements.find(el => el.id === selectedElementId);

  useEffect(() => {
    if (selectedElement) {
      if (selectedElement.type === 'text') {
        setFontSize([selectedElement.fontSize || 24]);
        setTextColor(selectedElement.color || '#000000');
      }
      // Removed setting rotation and scale from here
    }
  }, [selectedElement]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md">
        <Link to={-1} className="text-gray-600 dark:text-gray-300">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {product?.name || 'Loading Product...'}
        </h1>
        <Button onClick={handleSaveDesign} variant="ghost" size="icon">
          <Check className="h-6 w-6 text-green-600" />
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
        <div className="flex-1 flex flex-col md:flex-row p-4 overflow-hidden">
          {/* Left: Design Area */}
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div
              ref={designAreaRef}
              className="relative bg-white shadow-lg overflow-hidden"
              style={{
                width: `${product.canvas_width}px`,
                height: `${product.canvas_height}px`,
                backgroundImage: product.mockup_image_url ? `url(${product.mockup_image_url})` : 'none',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
              onClick={() => {
                if (!designElements.length && fileInputRef.current) {
                  fileInputRef.current.click(); // Directly open file input
                }
              }}
            >
              {designElements.map(el => (
                <div
                  key={el.id}
                  className={`absolute cursor-grab ${selectedElementId === el.id ? 'border-2 border-blue-500' : ''}`}
                  style={{
                    left: el.x,
                    top: el.y,
                    // Removed transform: `rotate(${el.rotation || 0}deg) scale(${el.scale || 1})`,
                    transformOrigin: 'center center',
                    width: el.type === 'image' ? `${el.width}px` : 'auto',
                    height: el.type === 'image' ? `${el.height}px` : 'auto',
                  }}
                  onMouseDown={(e) => {
                    setSelectedElementId(el.id);
                    handleDrag(e, el.id);
                  }}
                >
                  {el.type === 'text' ? (
                    <span
                      style={{
                        fontSize: `${el.fontSize}px`,
                        color: el.color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {el.value}
                    </span>
                  ) : (
                    <img
                      src={el.value}
                      alt="design element"
                      className="w-full h-full object-contain"
                      // Removed onLoad handler
                    />
                  )}
                  {selectedElementId === el.id && el.type === 'image' && (
                    <div
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleResize(e, el.id);
                      }}
                    />
                  )}
                </div>
              ))}
              {!designElements.length && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer border-2 border-dashed border-gray-400 rounded-lg m-4"
                  onClick={() => fileInputRef.current?.click()} // Trigger file input on click
                >
                  <PlusCircle className="h-12 w-12 mb-2" />
                  <p className="text-lg font-medium">Add Your Photo</p> {/* Changed text */}
                </div>
              )}
            </div>
          </div>

          {/* Right: Conditional Controls for Selected Element */}
          {/* Removed the entire 'Edit Selected Element' card */}
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Bottom Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-2 flex justify-around items-center border-t border-gray-200 dark:border-gray-700 z-10">
        <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={() => setIsAddTextModalOpen(true)}>
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
      </div>

      {/* Add Text Modal */}
      <Dialog open={isAddTextModalOpen} onOpenChange={setIsAddTextModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="new-text">Enter Text</Label>
            <Textarea
              id="new-text"
              placeholder="Type your text here..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTextModalOpen(false)}>Cancel</Button>
            <Button onClick={addTextElement}>Add Text</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileCoverCustomizationPage;