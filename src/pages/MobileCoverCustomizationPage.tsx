import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Palette,
  LayoutTemplate,
  Image,
  ArrowLeft,
  Eye,
  Download,
  ShoppingCart,
  XCircle, // Added for delete handle
  RotateCw, // Added for rotate handle
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
  rotation?: number; // Added rotation property
}

interface TouchState {
  mode: 'none' | 'dragging' | 'pinching' | 'resizing' | 'rotating';
  startX: number;
  startY: number;
  initialElementX: number;
  initialElementY: number;
  initialDistance?: number;
  initialElementWidth?: number;
  initialElementHeight?: number;
  initialFontSize?: number;
  initialMidX?: number;
  initialMidY?: number;
  initialAngle?: number; // Added for rotation
  initialRotation?: number; // Added for rotation
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
  
  // States for text properties (now directly in component, not modal)
  // currentTextContent is now only used for initial setting of the contentEditable div
  const [currentFontSize, setCurrentFontSize] = useState<number[]>([35]);
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
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const [isDemoOrderModalOpen, setIsDemoOrderModalOpen] = useState(false);
  const [demoOrderPrice, setDemoOrderPrice] = useState<string>('');
  const [demoOrderAddress, setDemoOrderAddress] = useState<string>('');

  const touchState = useRef<TouchState>({
    mode: 'none',
    startX: 0,
    startY: 0,
    initialElementX: 0,
    initialElementY: 0,
    activeElementId: null,
  });

  const predefinedColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FFA500', '#800080', '#008000', '#800000', '#000080', '#808000', '#800080', '#008080'
  ];

  const fontFamilies = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Playfair Display',
    'Merriweather', 'Dancing Script', 'Pacifico', 'Indie Flower', 'Bebas Neue',
    'Lobster', 'Permanent Marker', 'Shadows Into Light', 'Satisfy', 'Great Vibes',
    'Poppins', 'Raleway', 'Ubuntu', 'Lora'
  ];

  const selectedTextElement = selectedElementId ? designElements.find(el => el.id === selectedElementId && el.type === 'text') : null;

  // Ref to store the contentEditable span elements
  const textElementRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  // Ref to store the last known caret position
  const lastCaretPosition = useRef<{ node: Node | null; offset: number } | null>(null);

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
        setDemoOrderPrice(productData.price?.toFixed(2) || '0.00');
        setDemoOrderAddress('Demo Address, Demo City, Demo State, 00000');
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

  // Update text editing states when a text element is selected
  useEffect(() => {
    if (selectedTextElement) {
      setCurrentFontSize([selectedTextElement.fontSize || 35]);
      setCurrentTextColor(selectedTextElement.color || '#000000');
      setCurrentFontFamily(selectedTextElement.fontFamily || 'Arial');
      setCurrentTextShadowEnabled(selectedTextElement.textShadow || false);
    } else {
      // Reset text editing states when no text element is selected
      setCurrentFontSize([35]);
      setCurrentTextColor('#000000');
      setCurrentFontFamily('Arial');
      setCurrentTextShadowEnabled(false);
    }
  }, [selectedTextElement]);

  // Effect to restore caret position after text content updates
  useEffect(() => {
    if (selectedElementId && lastCaretPosition.current) {
      const element = designElements.find(el => el.id === selectedElementId);
      if (element && element.type === 'text') {
        const spanRef = textElementRefs.current.get(selectedElementId);
        if (spanRef) {
          const selection = window.getSelection();
          const range = document.createRange();

          // Find the text node within the span. For simple text, it's usually the first child.
          const textNode = spanRef.firstChild;

          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            // Ensure the offset is within the bounds of the new text length
            const newOffset = Math.min(lastCaretPosition.current.offset, textNode.length);
            range.setStart(textNode, newOffset);
            range.collapse(true); // Collapse to the start point

            selection?.removeAllRanges();
            selection?.addRange(range);
            spanRef.focus(); // Explicitly focus the element
          }
        }
      }
    }
  }, [designElements, selectedElementId]); // Re-run when designElements change (text content changes)

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

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setDesignElements(prev =>
      prev.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
  }, []);

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

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    const element = designElements.find(el => el.id === id);
    if (!element) return;

    const isTouchEvent = 'touches' in e;
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

    const startX = clientX;
    const startY = clientY;
    const startWidth = element.width || 0;
    const startHeight = element.height || 0;
    const startFontSize = element.fontSize || 35;

    // Set touchState for resizing if it's a touch event
    if (isTouchEvent) {
      touchState.current = {
        mode: 'resizing',
        startX: clientX,
        startY: clientY,
        initialElementX: element.x,
        initialElementY: element.y,
        initialElementWidth: element.width,
        initialElementHeight: element.height,
        initialFontSize: element.fontSize,
        activeElementId: id,
      };
    }

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      if (element.type === 'image') {
        const newWidth = Math.max(20, startWidth + (currentClientX - startX));
        const newHeight = Math.max(20, startHeight + (currentClientY - startY));
        updateElement(id, { width: newWidth, height: newHeight });
      } else if (element.type === 'text') {
        const scaleFactor = (currentClientY - startY) / 10; // Adjust sensitivity as needed
        const newFontSize = Math.max(10, startFontSize + scaleFactor); // Minimum font size 10
        updateElement(id, { fontSize: newFontSize });
      }
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      if (isTouchEvent) {
        touchState.current.mode = 'none'; // Reset touch mode
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false }); // passive: false for preventDefault
    document.addEventListener('touchend', onEnd);
  };

  const handleRotateStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    const element = designElements.find(el => el.id === id);
    if (!element || !designAreaRef.current) return;

    const isTouchEvent = 'touches' in e;
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

    const elementDiv = (e.currentTarget as HTMLElement).parentElement; // The draggable div
    if (!elementDiv) return;

    const elementRect = elementDiv.getBoundingClientRect();
    const designAreaRect = designAreaRef.current.getBoundingClientRect();

    // Calculate the center of the element relative to the design area
    const elementCenterX = element.x + elementRect.width / 2;
    const elementCenterY = element.y + elementRect.height / 2;

    // Calculate the initial angle from the element's center to the mouse click
    const initialAngle = Math.atan2(clientY - (designAreaRect.top + elementCenterY), clientX - (designAreaRect.left + elementCenterX));
    const initialRotation = element.rotation || 0;

    // Set touchState for rotating if it's a touch event
    if (isTouchEvent) {
      touchState.current = {
        mode: 'rotating',
        startX: clientX,
        startY: clientY,
        initialElementX: element.x,
        initialElementY: element.y,
        initialAngle: initialAngle,
        initialRotation: initialRotation,
        activeElementId: id,
      };
    }

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const currentAngle = Math.atan2(currentClientY - (designAreaRect.top + elementCenterY), currentClientX - (designAreaRect.left + elementCenterX));
      let newRotation = initialRotation + (currentAngle - initialAngle) * (180 / Math.PI);

      // Normalize rotation to be between 0 and 360
      newRotation = (newRotation % 360 + 360) % 360;

      updateElement(id, { rotation: newRotation });
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      if (isTouchEvent) {
        touchState.current.mode = 'none'; // Reset touch mode
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !designAreaRef.current) return;

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
      const initialMidX = (touch1.clientX + touch2.clientX) / 2 - designAreaRect.left;
      const initialMidY = (touch1.clientY + touch2.clientY) / 2 - designAreaRect.top;

      touchState.current = {
        mode: 'pinching',
        startX: 0, // Not used for pinching
        startY: 0, // Not used for pinching
        initialElementX: element.x,
        initialElementY: element.y,
        initialDistance: initialDistance,
        initialElementWidth: element.width,
        initialElementHeight: element.height,
        initialFontSize: element.fontSize,
        initialMidX: initialMidX,
        initialMidY: initialMidY,
        activeElementId: id,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling while dragging/resizing
    const { mode, startX, startY, initialElementX, initialElementY, initialDistance, initialElementWidth, initialElementHeight, initialFontSize, initialMidX, initialMidY, initialAngle, initialRotation, activeElementId } = touchState.current;
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
    } else if (mode === 'resizing' && e.touches.length === 1) {
      const currentClientX = e.touches[0].clientX;
      const currentClientY = e.touches[0].clientY;

      if (element.type === 'image' && initialElementWidth !== undefined && initialElementHeight !== undefined) {
        const newWidth = Math.max(20, initialElementWidth + (currentClientX - startX));
        const newHeight = Math.max(20, initialElementHeight + (currentClientY - startY));
        updateElement(activeElementId, { width: newWidth, height: newHeight });
      } else if (element.type === 'text' && initialFontSize !== undefined) {
        const scaleFactor = (currentClientY - startY) / 10; // Adjust sensitivity as needed
        const newFontSize = Math.max(10, initialFontSize + scaleFactor); // Minimum font size 10
        updateElement(activeElementId, { fontSize: newFontSize });
      }
    } else if (mode === 'rotating' && e.touches.length === 1 && initialAngle !== undefined && initialRotation !== undefined) {
      const elementDiv = document.querySelector(`[data-element-id="${activeElementId}"]`);
      if (!elementDiv) return;
      const elementRect = elementDiv.getBoundingClientRect();

      const elementCenterX = element.x + elementRect.width / 2;
      const elementCenterY = element.y + elementRect.height / 2;

      const currentAngle = Math.atan2(e.touches[0].clientY - (designAreaRect.top + elementCenterY), e.touches[0].clientX - (designAreaRect.left + elementCenterX));
      let newRotation = initialRotation + (currentAngle - initialAngle) * (180 / Math.PI);
      newRotation = (newRotation % 360 + 360) % 360;
      updateElement(activeElementId, { rotation: newRotation });
    }
    else if (mode === 'pinching' && e.touches.length === 2 && initialDistance !== undefined && initialMidX !== undefined && initialMidY !== undefined) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const scaleFactor = newDistance / initialDistance;

      const currentMidX = (touch1.clientX + touch2.clientX) / 2 - designAreaRect.left;
      const currentMidY = (touch1.clientY + touch2.clientY) / 2 - designAreaRect.top;

      const newX = currentMidX - (initialMidX - initialElementX) * scaleFactor;
      const newY = currentMidY - (initialMidY - initialElementY) * scaleFactor;

      if (element.type === 'image' && initialElementWidth !== undefined && initialElementHeight !== undefined) {
        const newWidth = Math.max(20, initialElementWidth * scaleFactor);
        const newHeight = Math.max(20, initialElementHeight * scaleFactor);
        updateElement(activeElementId, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        });
      } else if (element.type === 'text' && initialFontSize !== undefined) {
        const newFontSize = Math.max(10, initialFontSize * scaleFactor);
        updateElement(activeElementId, {
          fontSize: newFontSize,
          x: newX,
          y: newY,
        });
      }
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

      if (mockupImageElement instanceof HTMLElement) {
        originalMockupPointerEvents = mockupImageElement.style.pointerEvents;
        mockupImageElement.style.pointerEvents = 'auto';
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
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to place an order.", variant: "destructive" });
      navigate('/login');
      return;
    }
    if (!product) {
      toast({ title: "Error", description: "Product not loaded. Cannot proceed with order.", variant: "destructive" });
      return;
    }
    setIsCheckoutModalOpen(true);
  };

  const handlePlaceOrder = async (isDemo: boolean) => {
    if (!product || !user?.id) {
      toast({ title: "Error", description: "Product or user information missing.", variant: "destructive" });
      return;
    }

    const finalCustomerName = isDemo ? 'Demo User' : customerName;
    const finalCustomerAddress = isDemo ? demoOrderAddress : customerAddress;
    const finalCustomerPhone = isDemo ? '0000000000' : customerPhone;
    const finalPaymentMethod = isDemo ? 'Demo' : paymentMethod;
    const finalStatus = isDemo ? 'Demo' : 'Pending';
    const finalTotalPrice = isDemo ? parseFloat(demoOrderPrice) : product.price;
    const finalOrderType = isDemo ? 'demo' : 'normal';

    if (!isDemo && (!finalCustomerName.trim() || !finalCustomerAddress.trim() || !finalCustomerPhone.trim())) {
      toast({ title: "Validation Error", description: "Please fill in all customer details.", variant: "destructive" });
      return;
    }
    if (isDemo && (!finalCustomerAddress.trim() || isNaN(finalTotalPrice))) {
      toast({ title: "Validation Error", description: "Please provide a valid price and address for the demo order.", variant: "destructive" });
      return;
    }

    setIsPlacingOrder(true);
    let orderedDesignImageUrl: string | null = null;
    let originalMockupPointerEvents = '';
    const mockupImageElement = canvasContentRef.current?.querySelector('img[alt="Phone Mockup Overlay"]');

    try {
      if (!canvasContentRef.current) {
        throw new Error("Design area not found for order image capture.");
      }

      const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      if (selectedElementDiv) {
        selectedElementDiv.classList.remove('border-2', 'border-blue-500');
      }

      if (mockupImageElement instanceof HTMLElement) {
        originalMockupPointerEvents = mockupImageElement.style.pointerEvents;
        mockupImageElement.style.pointerEvents = 'auto';
      }

      const canvas = await html2canvas(canvasContentRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const dataUrl = canvas.toDataURL('image/png');

      const blob = await (await fetch(dataUrl)).blob();

      const fileExt = 'png';
      const fileName = `${product.id}-${Date.now()}.${fileExt}`;
      const filePath = `orders/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-mockups')
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

      const { error: orderInsertError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          product_id: product.id,
          customer_name: finalCustomerName,
          customer_address: finalCustomerAddress,
          customer_phone: finalCustomerPhone,
          payment_method: finalPaymentMethod,
          status: finalStatus,
          total_price: finalTotalPrice,
          ordered_design_image_url: orderedDesignImageUrl,
          ordered_design_data: designElements,
          type: finalOrderType,
        });

      if (orderInsertError) {
        console.error("Supabase insert error:", orderInsertError);
        throw new Error(`Failed to place order: ${orderInsertError.message}`);
      }

      toast({ title: "Success", description: isDemo ? "Demo order placed successfully!" : "Your order has been placed successfully!" });
      setIsCheckoutModalOpen(false);
      setIsDemoOrderModalOpen(false);
      
      if (isDemo) {
        navigate('/admin/demo-orders');
      } else {
        navigate('/orders');
      }

    } catch (err: any) {
      console.error("Error placing order:", err);
      toast({ title: "Order Failed", description: err.message || "An unexpected error occurred while placing your order.", variant: "destructive" });
    } finally {
      if (mockupImageElement instanceof HTMLElement) {
        mockupImageElement.style.pointerEvents = originalMockupPointerEvents;
      }
      const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      if (selectedElementDiv) {
        selectedElementDiv.classList.add('border-2', 'border-blue-500');
      }
      setIsPlacingOrder(false);
    }
  };

  const handleDemoOrderClick = () => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to place a demo order.", variant: "destructive" });
      navigate('/login');
      return;
    }
    if (!product) {
      toast({ title: "Error", description: "Product not loaded. Cannot place demo order.", variant: "destructive" });
      return;
    }
    setIsDemoOrderModalOpen(true);
  };

  const handleAddTextElement = () => {
    if (!product) {
      toast({ title: "Error", description: "Product details not loaded. Cannot add text.", variant: "destructive" });
      return;
    }
    const defaultText = "New Text";
    const defaultFontSize = 35;
    const defaultColor = '#000000';
    const defaultFontFamily = 'Arial';
    const defaultTextShadow = false;

    // Calculate center position
    const centerX = (product.canvas_width / 2);
    const centerY = (product.canvas_height / 2);

    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      value: defaultText,
      x: centerX, // Centered X
      y: centerY, // Centered Y
      fontSize: defaultFontSize,
      color: defaultColor,
      fontFamily: defaultFontFamily,
      textShadow: defaultTextShadow,
      rotation: 0, // Default rotation
    };
    setDesignElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id); // Select the newly added element
    toast({ title: "Success", description: "New text element added!" });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Deselect element if clicking on the canvas background
    if (e.target === canvasContentRef.current || e.target === designAreaRef.current) {
      setSelectedElementId(null);
    }
  };

  const handleTextContentInput = (e: React.FormEvent<HTMLSpanElement>, id: string) => {
    const target = e.currentTarget;
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // Only save if the caret is within the current target element
      if (target.contains(range.commonAncestorContainer)) {
        lastCaretPosition.current = {
          node: range.commonAncestorContainer,
          offset: range.startOffset,
        };
      }
    }

    const newText = target.innerText;
    updateElement(id, { value: newText });
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
        <div className="flex items-center space-x-2">
          <Button onClick={handlePreviewClick} variant="ghost" size="icon">
            <Eye className="h-6 w-6 text-blue-600" />
          </Button>
          <Button onClick={handleDemoOrderClick} disabled={loading || isPlacingOrder} className="bg-green-600 hover:bg-green-700 text-white">
            {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Demo Order
          </Button>
        </div>
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
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto pb-24">
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
            onClick={handleCanvasClick} // Handle clicks on the background
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
              onClick={handleCanvasClick} // Handle clicks on the background
            >
              {designElements.map(el => (
                <div
                  key={el.id}
                  data-element-id={el.id}
                  className={`absolute cursor-grab ${selectedElementId === el.id ? 'border-2 border-blue-500' : ''}`}
                  style={{
                    left: el.x,
                    top: el.y,
                    transform: `rotate(${el.rotation || 0}deg)`, // Apply rotation
                    transformOrigin: 'center center', // Rotate around its own center
                    width: el.type === 'image' ? `${el.width}px` : 'auto',
                    height: el.type === 'image' ? `${el.height}px` : 'auto',
                    zIndex: 5,
                    touchAction: 'none',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  onTouchStart={(e) => handleTouchStart(e, el.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {el.type === 'text' ? (
                    <span
                      ref={node => { // Assign ref to the span element
                        if (node) textElementRefs.current.set(el.id, node);
                        else textElementRefs.current.delete(el.id);
                      }}
                      contentEditable={selectedElementId === el.id} // Make editable when selected
                      onInput={(e) => handleTextContentInput(e, el.id)} // Update value on input
                      onBlur={() => {
                        // Optional: deselect or save on blur if needed
                        // setSelectedElementId(null); 
                      }}
                      suppressContentEditableWarning={true} // Suppress React warning
                      style={{
                        fontSize: `${el.fontSize}px`,
                        color: el.color,
                        whiteSpace: 'nowrap',
                        fontFamily: el.fontFamily,
                        textShadow: el.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                        outline: 'none', // Remove default outline
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
                  {selectedElementId === el.id && (
                    <>
                      {/* Resize handle for images */}
                      {el.type === 'image' && (
                        <div
                          className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize"
                          onMouseDown={(e) => handleResizeStart(e, el.id)}
                          onTouchStart={(e) => {
                            touchState.current = {
                              mode: 'resizing',
                              startX: e.touches[0].clientX,
                              startY: e.touches[0].clientY,
                              initialElementX: el.x,
                              initialElementY: el.y,
                              initialElementWidth: el.width,
                              initialElementHeight: el.height,
                              activeElementId: el.id,
                            };
                            handleResizeStart(e, el.id); // Call the existing logic
                          }}
                        />
                      )}
                      {/* Resize handle for text */}
                      {el.type === 'text' && (
                        <div
                          className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-nwse-resize"
                          onMouseDown={(e) => handleResizeStart(e, el.id)}
                          onTouchStart={(e) => {
                            touchState.current = {
                              mode: 'resizing',
                              startX: e.touches[0].clientX,
                              startY: e.touches[0].clientY,
                              initialElementX: el.x,
                              initialElementY: el.y,
                              initialFontSize: el.fontSize,
                              activeElementId: el.id,
                            };
                            handleResizeStart(e, el.id); // Call the existing logic
                          }}
                        >
                          <PlusCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                      {/* Delete handle */}
                      <div
                        className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center cursor-pointer"
                        onClick={() => deleteElement(el.id)}
                      >
                        <XCircle className="h-4 w-4 text-white" />
                      </div>
                      {/* Rotation handle */}
                      <div
                        className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center cursor-grab"
                        onMouseDown={(e) => handleRotateStart(e, el.id)}
                        onTouchStart={(e) => {
                          const elementDiv = (e.currentTarget as HTMLElement).parentElement;
                          if (!elementDiv || !designAreaRef.current) return;
                          const elementRect = elementDiv.getBoundingClientRect();
                          const designAreaRect = designAreaRef.current.getBoundingClientRect();
                          const elementCenterX = el.x + elementRect.width / 2;
                          const elementCenterY = el.y + elementRect.height / 2;
                          const initialAngle = Math.atan2(e.touches[0].clientY - (designAreaRect.top + elementCenterY), e.touches[0].clientX - (designAreaRect.left + elementCenterX));

                          touchState.current = {
                            mode: 'rotating',
                            startX: e.touches[0].clientX,
                            startY: e.touches[0].clientY,
                            initialElementX: el.x,
                            initialElementY: el.y,
                            initialAngle: initialAngle,
                            initialRotation: el.rotation,
                            activeElementId: el.id,
                          };
                          handleRotateStart(e, el.id); // Call the existing logic
                        }}
                      >
                        <RotateCw className="h-4 w-4 text-white" />
                      </div>
                    </>
                  )}
                </div>
              ))}

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

      {/* Dynamic Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-2 flex flex-wrap justify-around items-center border-t border-gray-200 dark:border-gray-700 z-10">
        {selectedTextElement ? (
          <div className="flex flex-col w-full items-center">
            {/* Font Family Horizontal List */}
            <div className="flex items-center justify-center w-full overflow-x-auto py-1 px-4 scrollbar-hide">
              {fontFamilies.map((font) => (
                <Button
                  key={font}
                  variant={currentFontFamily === font ? 'default' : 'ghost'}
                  size="sm"
                  className={`flex-shrink-0 mx-1 h-8 text-xs ${currentFontFamily === font ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  style={{ fontFamily: font }}
                  onClick={() => {
                    setCurrentFontFamily(font);
                    updateElement(selectedTextElement.id, { fontFamily: font });
                  }}
                >
                  {font}
                </Button>
              ))}
            </div>

            {/* Color Circles */}
            <div className="flex items-center justify-center gap-1 p-1 w-full overflow-x-auto scrollbar-hide">
                {predefinedColors.map((color) => (
                    <div
                        key={color}
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 flex-shrink-0 ${currentTextColor === color ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                            setCurrentTextColor(color);
                            updateElement(selectedTextElement.id, { color: color });
                        }}
                        title={color}
                    />
                ))}
            </div>
          </div>
        ) : (
          <>
            {/* General Design Tools */}
            <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={handleAddTextElement}>
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
          </>
        )}
        <Button onClick={handleBuyNowClick} disabled={loading || isPlacingOrder} className="flex flex-col h-auto p-2 bg-blue-600 hover:bg-blue-700 text-white">
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs mt-1">Buy Now</span>
        </Button>
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

      {/* Checkout Modal (kept for potential future use or if triggered elsewhere) */}
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
            <Button onClick={() => handlePlaceOrder(false)} disabled={isPlacingOrder}>
              {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demo Order Modal */}
      <Dialog open={isDemoOrderModalOpen} onOpenChange={setIsDemoOrderModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Place Demo Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="demo-price" className="text-right">
                Price
              </Label>
              <Input
                id="demo-price"
                type="number"
                value={demoOrderPrice}
                onChange={(e) => setDemoOrderPrice(e.target.value)}
                className="col-span-3"
                placeholder="e.g., 19.99"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="demo-address" className="text-right">
                Address
              </Label>
              <Textarea
                id="demo-address"
                value={demoOrderAddress}
                onChange={(e) => setDemoOrderAddress(e.target.value)}
                className="col-span-3"
                placeholder="e.g., 123 Demo St, Demo City"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDemoOrderModalOpen(false)}>Cancel</Button>
            <Button onClick={() => handlePlaceOrder(true)} disabled={isPlacingOrder}>
              {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Demo Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileCoverCustomizationPage;