import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Trash2, Text, Image as ImageIcon, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

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
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [fontSize, setFontSize] = useState<number[]>([24]);
  const [textColor, setTextColor] = useState('#000000');
  const [rotation, setRotation] = useState<number[]>([0]);
  const [scale, setScale] = useState<number[]>([1]);
  const designAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProductAndMockup = async () => {
      setLoading(true);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, mockups(image_url)')
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
  };

  const handleImageUpload = async () => {
    if (!newImageFile && !newImageUrl.trim()) {
      toast({ title: "Error", description: "Please select an image file or enter an image URL.", variant: "destructive" });
      return;
    }

    let imageUrlToUse = newImageUrl.trim();

    if (newImageFile) {
      setLoading(true);
      const fileExt = newImageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `design-images/${fileName}`;

      const { data, error } = await supabase.storage
        .from('mockups-bucket') // Using mockups-bucket for design images too, or create a new one
        .upload(filePath, newImageFile);

      if (error) {
        console.error("Error uploading image:", error);
        toast({ title: "Error", description: `Failed to upload image: ${error.message}`, variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('mockups-bucket')
        .getPublicUrl(filePath);

      imageUrlToUse = publicUrlData.publicUrl;
      setLoading(false);
    }

    if (imageUrlToUse) {
      const newElement: DesignElement = {
        id: `image-${Date.now()}`,
        type: 'image',
        value: imageUrlToUse,
        x: 50,
        y: 50,
        width: 100, // Default width
        height: 100, // Default height
        rotation: rotation[0],
        scale: scale[0],
      };
      setDesignElements([...designElements, newElement]);
      setNewImageFile(null);
      setNewImageUrl('');
      setSelectedElementId(newElement.id);
    }
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

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - designAreaRect.left - (element.width || 0) / 2;
      const newY = moveEvent.clientY - designAreaRect.top - (element.height || 0) / 2;

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

    // Check if a mockup entry already exists for this product
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
      // Update existing mockup with design_data
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
      // Create a new mockup entry if none exists (this shouldn't happen if product management is used)
      // This is a fallback, ideally mockup entry is created when product is created/mockup image is uploaded
      const { error: insertError } = await supabase
        .from('mockups')
        .insert({
          product_id: product.id,
          image_url: product.mockup_image_url, // Use existing mockup image URL
          name: `${product.name} Custom Design`,
          designer: 'Customer',
          design_data: designData,
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
    <div className="flex flex-col md:flex-row h-full p-4 gap-4">
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
        <>
          {/* Left Panel: Design Area */}
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center min-h-[300px] md:min-h-[500px] overflow-hidden" ref={designAreaRef}>
            <div
              className="relative bg-white shadow-lg overflow-hidden"
              style={{
                width: `${product.canvas_width}px`,
                height: `${product.canvas_height}px`,
                backgroundImage: product.mockup_image_url ? `url(${product.mockup_image_url})` : 'none',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
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
                        // Set initial dimensions for image elements if not already set
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
                        e.stopPropagation(); // Prevent dragging when resizing
                        handleResize(e, el.id);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Controls */}
          <div className="w-full md:w-1/3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  placeholder="Enter text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                />
                <Button onClick={addTextElement} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Text
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="image-file">Upload Image</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewImageFile(e.target.files ? e.target.files[0] : null)}
                />
                <Label htmlFor="image-url">Or Image URL</Label>
                <Input
                  id="image-url"
                  type="text"
                  placeholder="Enter image URL"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                />
                <Button onClick={handleImageUpload} className="w-full">
                  <ImageIcon className="mr-2 h-4 w-4" /> Add Image
                </Button>
              </CardContent>
            </Card>

            {selectedElement && (
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
            )}

            <Button onClick={handleSaveDesign} className="w-full">
              Save Design
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default MobileCoverCustomizationPage;