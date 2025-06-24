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
import ImageUploadModal from '@/components/ImageUploadModal'; // Import the new ImageUploadModal

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
  value: string; // text content or image URL
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  rotation?: number;
  scale?: number;
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
  const [rotation, setRotation] = useState<number[]>([0]);
  const [scale, setScale] = useState<number[]>([1]);
  const designAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Modals state
  const [isAddTextModalOpen, setIsAddTextModalOpen] = useState(false);
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false); // State for new image upload modal

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
      rotation: rotation[0],
      scale: scale[0],
    };
    setDesignElements([...designElements, newElement]);
    setNewText('');
    setSelectedElementId(newElement.id);
    setIsAddTextModalOpen(false); // Close modal after adding
  };

  const addImageElement = (imageUrl: string) => {
    const newElement: DesignElement = {
      id: `image-${Date.now()}`,
      type: 'image',
      value: imageUrl,
      x: 50,
      y: 50,
      width: 150, // Default width
      height: 150, // Default height
      rotation: 0,
      scale: 1,
    };
    setDesignElements([...designElements, newElement]);
    setSelectedElementId(newElement.id);
    setIsImageUploadModalOpen(false); // Close modal after adding
  };

  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    setDesignElements(prev =>
      prev.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
  };

  const deleteElement = (id: string) => {
    setDesignElements(prev => prev.filter(el => el.id !== id));
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
    const designData = JSON.stringify(designElements);

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

  const selectedElement = designElements.find(el => el.id === selectedElementId);

  useEffect(() => {
    if (selectedElement) {
      if (selectedElement.type === 'text') {
        setFontSize([selectedElement.fontSize || 24]);
        setTextColor(selectedElement.color || '#000000');
      }
      setRotation([selectedElement.rotation || 0]);
      setScale([selectedElement.scale || 1]);
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
                if (!designElements.length) {
                  setIsImageUploadModalOpen(true); // Open image upload modal when empty area is clicked
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
                    transform: `rotate(${el.rotation || 0}deg) scale(${el.scale || 1})`,
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
                      onLoad={(e) => {
                        if (!el.width || !el.height) {
                          const img = e.target as HTMLImageElement;
                          updateElement(el.id, { width: img.naturalWidth, height: img.naturalHeight });
                        }
                      }}
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
                >
                  <PlusCircle className="h-12 w-12 mb-2" />
                  <p className="text-lg font-medium">Add Your Photo</p> {/* Changed text */}
                </div>
              )}
            </div>
          </div>

          {/* Right: Conditional Controls for Selected Element */}
          {selectedElement && (
            <div className="w-full md:w-1/3 space-y-4 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Selected Element</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedElement.type === 'text' && (
                    <>
                      <div>
                        <Label htmlFor="font-size">Font Size: {fontSize[0]}px</Label>
                        <Slider
                          id="font-size"
                          min={10}
                          max={100}
                          step={1}
                          value={fontSize}
                          onValueChange={(val) => {
                            setFontSize(val);
                            updateElement(selectedElement.id, { fontSize: val[0] });
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="text-color">Text Color</Label>
                        <Input
                          id="text-color"
                          type="color"
                          value={textColor}
                          onChange={(e) => {
                            setTextColor(e.target.value);
                            updateElement(selectedElement.id, { color: e.target.value });
                          }}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="rotation">Rotation: {rotation[0]}°</Label>
                    <Slider
                      id="rotation"
                      min={0}
                      max={360}
                      step={1}
                      value={rotation}
                      onValueChange={(val) => {
                        setRotation(val);
                        updateElement(selectedElement.id, { rotation: val[0] });
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scale">Scale: {scale[0].toFixed(2)}x</Label>
                    <Slider
                      id="scale"
                      min={0.1}
                      max={3}
                      step={0.1}
                      value={scale}
                      onValueChange={(val) => {
                        setScale(val);
                        updateElement(selectedElement.id, { scale: val[0] });
                      }}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => deleteElement(selectedElement.id)}
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Element
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-2 flex justify-around items-center border-t border-gray-200 dark:border-gray-700 z-10">
        <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={() => setIsAddTextModalOpen(true)}>
          <Text className="h-6 w-6" />
          <span className="text-xs mt-1">Add Text</span>
        </Button>
        <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={() => setIsImageUploadModalOpen(true)}>
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

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isImageUploadModalOpen}
        onClose={() => setIsImageUploadModalOpen(false)}
        onImageSelect={addImageElement}
      />
    </div>
  );
};

export default MobileCoverCustomizationPage;