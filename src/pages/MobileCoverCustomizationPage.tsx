import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Image, // This 'Image' is the Lucide icon component
  ArrowLeft,
  ShoppingCart,
  XCircle,
  RotateCw,
  Download,
} from 'lucide-react';
import html2canvas from 'html2canvas'; // Corrected import for html2canvas
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/contexts/SessionContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { proxyImageUrl } from '@/utils/imageProxy';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast'; // Import toast utilities

interface Product {
  id: string;
  name: string;
  canvas_width: number;
  canvas_height: number;
  price: number;
  inventory: number | null; // Added inventory
  sku: string | null; // Added SKU
}

interface DesignElement {
  id: string;
  type: 'text' | 'image';
  value: string;
  x: number;
  y: number;
  width: number; // Made mandatory
  height: number; // Made mandatory
  fontSize?: number; // Only for text
  color?: string; // Only for text
  fontFamily?: string; // Only for text
  textShadow?: boolean; // Only for text
  rotation?: number;
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
  initialAngle?: number;
  initialRotation?: number;
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
  
  const [currentFontSize, setCurrentFontSize] = useState<number[]>([35]);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentFontFamily, setCurrentFontFamily] = useState('Arial');
  const [currentTextShadowEnabled, setCurrentTextShadowEnabled] = useState(false);
  const [blurredBackgroundImageUrl, setBlurredBackgroundImageUrl] = useState<string | null>(null); // New state for blurred background
  const [isBackColorPaletteOpen, setIsBackColorPaletteOpen] = useState(false); // State to control palette visibility
  const [selectedCanvasColor, setSelectedCanvasColor] = useState<string | null>(null); // State for solid canvas background color

  const designAreaRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { user } = useSession();

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const [isDemoOrderModalOpen, setIsDemoOrderModalOpen] = useState(false);
  const [demoOrderPrice, setDemoOrderPrice] = useState<string>('');
  const [demoOrderAddress, setDemoOrderAddress] = useState<string>('');

  // New state for the mockup overlay image URL
  const [mockupOverlayImageUrl, setMockupOverlayImageUrl] = useState<string | null>(null);

  // Responsive canvas states
  const [actualCanvasWidth, setActualCanvasWidth] = useState(0);
  const [actualCanvasHeight, setActualCanvasHeight] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1);

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

  const textElementRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // Changed to HTMLDivElement
  const lastCaretPosition = useRef<{ node: Node | null; offset: number } | null>(null);

  // Effect to calculate scale factor based on container size
  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (designAreaRef.current && product) {
        const containerWidth = designAreaRef.current.offsetWidth;
        const newScaleFactor = containerWidth / product.canvas_width;
        const newActualCanvasWidth = product.canvas_width * newScaleFactor;
        const newActualCanvasHeight = product.canvas_height * newScaleFactor;

        setActualCanvasWidth(newActualCanvasWidth);
        setActualCanvasHeight(newActualCanvasHeight);
        setScaleFactor(newScaleFactor);
      }
    };

    // Initial calculation
    updateCanvasDimensions();

    // Set up ResizeObserver for dynamic scaling
    const observer = new ResizeObserver(updateCanvasDimensions);
    if (designAreaRef.current) {
      observer.observe(designAreaRef.current);
    }

    return () => {
      if (designAreaRef.current) {
        observer.unobserve(designAreaRef.current);
      }
    };
  }, [product]); // Re-run if product (and thus original canvas dimensions) changes

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
        showError("Failed to load product details.");
        setError(productError.message);
      } else if (productData) {
        console.log("Fetched productData:", productData); // Log product data
        console.log("Mockups data from productData:", productData?.mockups); // Log mockups data

        const proxiedMockupUrl = productData.mockups.length > 0 && productData.mockups[0].image_url
          ? proxyImageUrl(productData.mockups[0].image_url)
          : null;
        
        setMockupOverlayImageUrl(proxiedMockupUrl); // Set the new state for mockup image
        console.log("Mockup Overlay Image URL:", proxiedMockupUrl); // Log the final URL

        setProduct({
          id: productData.id,
          name: productData.name,
          canvas_width: productData.canvas_width,
          canvas_height: productData.canvas_height,
          price: productData.price,
          inventory: productData.inventory, // Set inventory
          sku: productData.sku, // Set SKU
        });

        if (productData.mockups.length > 0 && productData.mockups[0].design_data) {
          try {
            // Ensure loaded design elements conform to the new interface (add default width/height if missing)
            const loadedElements: DesignElement[] = JSON.parse(productData.mockups[0].design_data as string).map((el: any) => ({
              ...el,
              width: el.width || (el.type === 'text' ? 200 : productData.canvas_width), // Default width for text/image
              height: el.height || (el.type === 'text' ? 40 : productData.canvas_height), // Default height for text/image
            }));
            setDesignElements(loadedElements);
          } catch (parseError) {
            console.error("Error parsing design data:", parseError);
            showError("Failed to load existing design data.");
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
    // This cleanup is still relevant for any blob URLs that might exist from previous interactions
    // or if an upload fails and a blob URL is temporarily used.
    return () => {
      designElements.forEach(el => {
        if (el.type === 'image' && el.value.startsWith('blob:')) {
          URL.revokeObjectURL(el.value);
        }
      });
    };
  }, [designElements]);

  useEffect(() => {
    if (selectedTextElement) {
      setCurrentFontSize([selectedTextElement.fontSize || 35]);
      setCurrentTextColor(selectedTextElement.color || '#000000');
      setCurrentFontFamily(selectedTextElement.fontFamily || 'Arial');
      setCurrentTextShadowEnabled(selectedTextElement.textShadow || false);
    } else {
      setCurrentFontSize([35]);
      setCurrentTextColor('#000000');
      setCurrentFontFamily('Arial');
      setCurrentTextShadowEnabled(false);
    }
  }, [selectedTextElement, setCurrentFontSize, setCurrentTextColor, setCurrentFontFamily, setCurrentTextShadowEnabled]);

  useEffect(() => {
    if (selectedElementId && lastCaretPosition.current) {
      const element = designElements.find(el => el.id === selectedElementId);
      if (element && element.type === 'text') {
        const divRef = textElementRefs.current.get(selectedElementId);
        if (divRef) {
          const selection = window.getSelection();
          const range = document.createRange();

          // Find the actual text node within the contentEditable div
          const textNode = divRef.firstChild;

          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const newOffset = Math.min(lastCaretPosition.current.offset, textNode.length);
            range.setStart(textNode, newOffset);
            range.collapse(true);

            selection?.removeAllRanges();
            selection?.addRange(range);
            divRef.focus();
          }
        }
      }
    }
  }, [designElements, selectedElementId]);

  const addImageElement = (imageUrl: string, id: string) => {
    if (!product) {
      showError("Product details not loaded. Cannot add image.");
      return;
    }
    // Define a reasonable initial size for the image element (e.g., 99% of the smaller canvas dimension)
    const initialSize = Math.min(product.canvas_width, product.canvas_height) * 0.99;
    const newWidth = initialSize;
    const newHeight = initialSize;

    // Center the image initially
    const newX = (product.canvas_width - newWidth) / 2;
    const newY = (product.canvas_height - newHeight) / 2;

    const newElement: DesignElement = {
      id: id,
      type: 'image',
      value: imageUrl,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: 0,
    };
    setDesignElements(prev => [...prev, newElement]);
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
        URL.revokeObjectURL(el.value);
      }
      return prev.filter(el => el.id !== id);
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const getUnscaledCoords = (clientX: number, clientY: number) => {
    if (!designAreaRef.current) return { x: 0, y: 0 };
    const designAreaRect = designAreaRef.current.getBoundingClientRect();
    return {
      x: (clientX - designAreaRect.left) / scaleFactor,
      y: (clientY - designAreaRect.top) / scaleFactor,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !designAreaRef.current || !product) return;

    const { x: unscaledClientX, y: unscaledClientY } = getUnscaledCoords(e.clientX, e.clientY);
    const offsetX = unscaledClientX - element.x;
    const offsetY = unscaledClientY - element.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const { x: currentUnscaledX, y: currentUnscaledY } = getUnscaledCoords(moveEvent.clientX, moveEvent.clientY);
      let newX = currentUnscaledX - offsetX;
      let newY = currentUnscaledY - offsetY;

      updateElement(id, { x: newX, y: newY });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    if (!isMobile) return; // Only for mobile
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !designAreaRef.current || !product) return;

    if (e.touches.length === 1) {
      touchState.current = {
        mode: 'dragging',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialElementX: element.x,
        initialElementY: element.y,
        activeElementId: id,
      };
    } else if (e.touches.length === 2 && element.type === 'image') { // Only allow pinching for image elements
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const { x: unscaledTouch1X, y: unscaledTouch1Y } = getUnscaledCoords(touch1.clientX, touch1.clientY);
      const { x: unscaledTouch2X, y: unscaledTouch2Y } = getUnscaledCoords(touch2.clientX, touch2.clientY);

      const initialDistance = Math.sqrt(
        Math.pow(unscaledTouch2X - unscaledTouch1X, 2) +
        Math.pow(unscaledTouch2Y - unscaledTouch1Y, 2)
      );
      const initialMidX = (unscaledTouch1X + unscaledTouch2X) / 2;
      const initialMidY = (unscaledTouch1Y + unscaledTouch2Y) / 2;

      touchState.current = {
        mode: 'pinching',
        startX: 0, // Not used in pinch mode
        startY: 0, // Not used in pinch mode
        initialElementX: element.x,
        initialElementY: element.y,
        initialDistance: initialDistance,
        initialElementWidth: element.width, // Correctly reference element's current width
        initialElementHeight: element.height, // Correctly reference element's current height
        initialFontSize: element.fontSize, // Keep for text, though not used for image pinch
        initialMidX: initialMidX,
        initialMidY: initialMidY,
        activeElementId: id,
      };
    } else {
      // If two touches but not an image, or more than two touches, reset mode
      touchState.current.mode = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return; // Only for mobile
    e.preventDefault();
    const { mode, startX, startY, initialElementX, initialElementY, initialDistance, initialElementWidth, initialElementHeight, activeElementId, initialMidX, initialMidY } = touchState.current;
    if (!activeElementId || !designAreaRef.current || !product) return;

    const element = designElements.find(el => el.id === activeElementId);
    if (!element) return;

    if (mode === 'dragging' && e.touches.length === 1) {
      const { x: currentUnscaledX, y: currentUnscaledY } = getUnscaledCoords(e.touches[0].clientX, e.touches[0].clientY);
      const { x: initialUnscaledX, y: initialUnscaledY } = getUnscaledCoords(startX, startY);

      let newX = initialElementX + (currentUnscaledX - initialUnscaledX);
      let newY = initialElementY + (currentUnscaledY - initialUnscaledY);

      updateElement(activeElementId, {
        x: newX,
        y: newY,
      });
    } else if (mode === 'pinching' && e.touches.length === 2 && element.type === 'image' && initialDistance !== undefined && initialMidX !== undefined && initialMidY !== undefined) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const { x: unscaledTouch1X, y: unscaledTouch1Y } = getUnscaledCoords(touch1.clientX, touch1.clientY);
      const { x: unscaledTouch2X, y: unscaledTouch2Y } = getUnscaledCoords(touch2.clientX, touch2.clientY);

      const newDistance = Math.sqrt(
        Math.pow(unscaledTouch2X - unscaledTouch1X, 2) +
        Math.pow(unscaledTouch2Y - unscaledTouch1Y, 2)
      );
      const scaleFactorChange = newDistance / initialDistance;

      const currentMidX = (unscaledTouch1X + unscaledTouch2X) / 2;
      const currentMidY = (unscaledTouch1Y + unscaledTouch2Y) / 2;

      let newX = currentMidX - (initialMidX - initialElementX) * scaleFactorChange;
      let newY = currentMidY - (initialMidY - initialElementY) * scaleFactorChange;

      let newWidth = Math.max(20, (initialElementWidth || element.width) * scaleFactorChange);
      let newHeight = Math.max(20, (initialElementHeight || element.height) * scaleFactorChange);
      
      updateElement(activeElementId, {
        width: newWidth,
        height: newHeight,
        x: newX,
        y: newY,
      });
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return; // Only for mobile
    touchState.current = {
      mode: 'none',
      startX: 0,
      startY: 0,
      initialElementX: 0,
      initialElementY: 0,
      activeElementId: null,
    };
  };

  const handleFileUpload = async (file: File | Blob, bucketName: string, subfolder: string = '') => {
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'png'; // Get extension for File, default to png for Blob
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = subfolder ? `${subfolder}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: file instanceof File ? file.type : 'image/png', // Use file.type for File, default for Blob
        upsert: false,
      });

    if (error) {
      console.error(`Error uploading image to ${bucketName}/${subfolder}:`, error);
      showError(`Error uploading image: ${error.message}`);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const captureDesignForOrder = async () => { // Renamed function
    if (!canvasContentRef.current || !product) {
      showError("Design area not found or product not loaded.");
      return null;
    }

    let originalMockupPointerEvents = '';
    const mockupImageElement = canvasContentRef.current.querySelector('img[alt="Phone Mockup Overlay"]');
    const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);

    try {
      // Pre-load mockup image to ensure it's in cache and rendered
      if (mockupOverlayImageUrl) {
        await new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(true);
          img.onerror = (e) => {
            console.error("Error loading mockup image for html2canvas:", e);
            // Do not reject, allow html2canvas to proceed even if this image fails
            resolve(false); 
          };
          img.src = proxyImageUrl(mockupOverlayImageUrl);
        });
      }

      // Temporarily remove border from selected element for screenshot
      if (selectedElementDiv) {
        selectedElementDiv.classList.remove('border-2', 'border-blue-500');
      }

      // Temporarily hide mockup for capture
      if (mockupImageElement instanceof HTMLElement) {
        originalMockupPointerEvents = mockupImageElement.style.display; // Store display property
        mockupImageElement.style.display = 'none'; // Hide the mockup
      }

      console.log("Attempting to capture canvas with html2canvas...");
      const canvas = await html2canvas(canvasContentRef.current, {
        useCORS: true,
        allowTaint: true, // Allow tainting, but it will prevent toDataURL if not truly CORS-compliant
        backgroundColor: null, // Let CSS background color be captured
        // Set a high fixed scale for better quality
        scale: 3, // Capture at 3x resolution
        // Explicitly set the target width and height to the product's original dimensions
        width: product.canvas_width,
        height: product.canvas_height,
        // The x and y coordinates of the area to render.
        // Since canvasContentRef is already the target area, these should be 0.
        x: 0,
        y: 0,
      });
      console.log("html2canvas capture successful.");

      const dataUrl = canvas.toDataURL('image/png');
      console.log("Canvas toDataURL successful.");
      return dataUrl;

    } catch (err: any) {
      console.error("Detailed Error capturing design for order:", err);
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      if (err.stack) {
        console.error("Error stack:", err.stack);
      }
      // Check for specific html2canvas error messages related to tainting
      if (err.message && err.message.includes("Tainted canvases may not be exported")) {
        showError("Capture Failed: The design contains images from another domain that are not configured for CORS. Please ensure Supabase Storage CORS settings are correct (Allowed Origins: *, Allowed Methods: GET).");
      } else {
        showError(`Capture Failed: ${err.message || "An unexpected error occurred while generating image."}`);
      }
      return null;
    } finally {
      // Restore original styles
      if (mockupImageElement instanceof HTMLElement) {
        mockupImageElement.style.display = originalMockupPointerEvents; // Restore display property
      }
      if (selectedElementDiv) {
        selectedElementDiv.classList.add('border-2', 'border-blue-500');
      }
    }
  };

  const handleImageFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Create a temporary blob URL for immediate display
    const tempImageUrl = URL.createObjectURL(file);
    const newElementId = `image-${Date.now()}`;

    // 2. Add the element to state with the temporary URL
    if (!product) {
      showError("Product details not loaded. Cannot add image.");
      return;
    }
    addImageElement(tempImageUrl, newElementId); // Use the new addImageElement function
    showLoading("Your image is being uploaded...");

    // Clear the file input immediately
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 3. Start the actual upload in the background
    try {
      const uploadedUrl = await handleFileUpload(file, 'order-mockups', 'user-uploads');
      if (uploadedUrl) {
        // 4. Update the element with the permanent URL once upload is complete
        setDesignElements(prev =>
          prev.map(el => (el.id === newElementId ? { ...el, value: uploadedUrl } : el))
        );
        URL.revokeObjectURL(tempImageUrl); // Revoke the temporary URL
        showSuccess("Image uploaded successfully!");
      } else {
        // If upload fails, remove the element or show a persistent error
        setDesignElements(prev => prev.filter(el => el.id !== newElementId));
        URL.revokeObjectURL(tempImageUrl);
        showError("Could not upload image to server. Please try again.");
      }
    } catch (err: any) {
      console.error("Error during image upload:", err);
      setDesignElements(prev => prev.filter(el => el.id !== newElementId));
      URL.revokeObjectURL(tempImageUrl);
      showError(`An error occurred during upload: ${err.message}`);
    }
  };

  const handlePlaceOrder = useCallback(async (isDemo: boolean) => {
    if (!product || !user?.id) {
      showError("Product or user information missing.");
      return;
    }

    const finalCustomerName = isDemo ? 'Demo User' : customerName;
    const finalCustomerAddress = isDemo ? demoOrderAddress : customerAddress;
    const finalCustomerPhone = isDemo ? '0000000000' : customerPhone;
    const finalPaymentMethod = isDemo ? 'Demo' : 'COD';
    const finalStatus = isDemo ? 'Demo' : 'Pending';
    const finalTotalPrice = isDemo ? parseFloat(demoOrderPrice) : product.price;
    const finalOrderType = isDemo ? 'demo' : 'normal';

    if (!isDemo && (!finalCustomerName.trim() || !finalCustomerAddress.trim() || !finalCustomerPhone.trim())) {
      showError("Please fill in all customer details.");
      return;
    }
    if (isDemo && (!finalCustomerAddress.trim() || isNaN(finalTotalPrice))) {
      showError("Please provide a valid price and address for the demo order.");
      return;
    }

    setIsPlacingOrder(true);
    const toastId = showLoading(isDemo ? "Placing demo order..." : "Placing your order...");
    let orderedDesignImageUrl: string | null = null;
    
    try {
      // Check and decrement inventory for normal orders
      if (!isDemo) {
        if (product.inventory !== null && product.inventory <= 0) {
          throw new Error("Product is out of stock.");
        }
        const { data: decrementData, error: decrementError } = await supabase.functions.invoke('decrement-product-inventory', {
          body: JSON.stringify({ productId: product.id, quantity: 1 }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (decrementError) {
          console.error("Edge Function Invoke Error (decrement-product-inventory):", decrementError);
          let errorMessage = decrementError.message;
          if (decrementError.context?.data) {
            try {
              const parsedError = JSON.parse(decrementError.context.data);
              if (parsedError.error) {
                errorMessage = parsedError.error;
              }
            } catch (e) {
              // Fallback if context.data is not JSON
            }
          }
          throw new Error(`Failed to update inventory: ${errorMessage}`);
        } else if (decrementData && (decrementData as any).error) {
          throw new Error(`Failed to update inventory: ${(decrementData as any).error}`);
        }
        // Update local product state with new inventory
        setProduct(prev => prev ? { ...prev, inventory: (prev.inventory || 0) - 1 } : null);
      }

      // Capture design WITHOUT the mockup for the actual order image
      orderedDesignImageUrl = await captureDesignForOrder(); 
      if (!orderedDesignImageUrl) {
        throw new Error("Failed to capture design for order.");
      }

      const blob = await (await fetch(orderedDesignImageUrl)).blob();

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
        throw new Error(`Failed to upload order image: ${uploadData.path || uploadError.message}`);
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
          ordered_design_data: designElements, // Store the design elements here
          type: finalOrderType,
        });

      if (orderInsertError) {
        console.error("Supabase insert error:", orderInsertError);
        throw new Error(`Failed to place order: ${orderInsertError.message}`);
      }

      showSuccess(isDemo ? "Demo order placed successfully!" : "Order placed successfully!");
      setIsCheckoutModalOpen(false);
      setIsDemoOrderModalOpen(false);
      
      if (isDemo) {
        navigate('/admin/demo-orders');
      } else {
        navigate('/orders');
      }

    } catch (err: any) {
      console.error("Error placing order:", err);
      showError(err.message || "An unexpected error occurred while placing your order.");
    } finally {
      setIsPlacingOrder(false);
      dismissToast(toastId);
    }
  }, [product, user, customerName, customerAddress, customerPhone, demoOrderPrice, demoOrderAddress, designElements, navigate]);

  const handleBuyNowClick = useCallback(() => {
    if (!user) {
      showError("Please log in to place an order.");
      navigate('/login');
      return;
    }
    if (!product) {
      showError("Product not loaded. Cannot proceed with order.");
      return;
    }
    if (product.inventory !== null && product.inventory <= 0) {
      showError("This product is currently out of stock.");
      return;
    }
    setIsCheckoutModalOpen(true);
  }, [user, product, navigate]);

  const handleDemoOrderClick = useCallback(() => {
    if (!user) {
      showError("Please log in to place a demo order.");
      navigate('/login');
      return;
    }
    if (!product) {
      showError("Product not loaded. Cannot place demo order.");
      return;
    }
    setIsDemoOrderModalOpen(true);
  }, [user, product, navigate]);

  const handleAddTextElement = () => {
    if (!product) {
      showError("Product details not loaded. Cannot add text.");
      return;
    }
    const defaultText = "New Text";
    const defaultFontSize = 35;
    const defaultColor = '#000000';
    const defaultFontFamily = 'Arial';
    const defaultTextShadow = false;

    const centerX = (product.canvas_width / 2);
    const centerY = (product.canvas_height / 2);

    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      value: defaultText,
      x: centerX - 100, // Adjusted initial position to be more centered
      y: centerY - 20,
      width: 200, // Default width for text box
      height: 40, // Default height for text box
      fontSize: defaultFontSize,
      color: defaultColor,
      fontFamily: defaultFontFamily,
      textShadow: defaultTextShadow,
      rotation: 0,
    };
    setDesignElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    showSuccess("New text element added!");
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasContentRef.current || e.target === designAreaRef.current) {
      setSelectedElementId(null);
      setIsBackColorPaletteOpen(false); // Close palette when clicking canvas
    }
  };

  const handleTextContentInput = (e: React.FormEvent<HTMLDivElement>, id: string) => { // Changed to HTMLDivElement
    const target = e.currentTarget;
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
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

  const handleBlurBackground = () => {
    if (!product) {
      showError("Product details not loaded. Cannot apply blur.");
      return;
    }

    const firstImageElement = designElements.find(el => el.type === 'image');
    if (!firstImageElement) {
      showError("Please add an image to the canvas first to use as a blurred background.");
      return;
    }

    const toastId = showLoading("Applying blur effect...");

    const img = new window.Image();
    img.crossOrigin = 'Anonymous'; // Essential for CORS
    img.src = proxyImageUrl(firstImageElement.value);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        showError("Failed to get canvas context.");
        dismissToast(toastId);
        return;
      }

      // Set canvas dimensions to match the product's original canvas dimensions
      canvas.width = product.canvas_width;
      canvas.height = product.canvas_height;

      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Apply blur filter
      ctx.filter = 'blur(10px)'; // You can adjust the blur radius here
      ctx.drawImage(canvas, 0, 0); // Redraw to apply filter

      const blurredDataUrl = canvas.toDataURL('image/png');
      setBlurredBackgroundImageUrl(blurredDataUrl);
      setSelectedCanvasColor(null); // Clear solid color when blur is applied
      showSuccess("Blur effect applied!");
      dismissToast(toastId);
    };

    img.onerror = (e) => {
      console.error("Error loading image for blur:", e);
      showError("Failed to load image for blur effect. Ensure image is accessible and CORS is configured.");
      dismissToast(toastId);
    };
  };

  const handleClearBlur = () => {
    setBlurredBackgroundImageUrl(null);
    showSuccess("Blurred background cleared.");
  };

  const handleSelectCanvasColor = (color: string) => {
    setSelectedCanvasColor(color);
    setBlurredBackgroundImageUrl(null); // Clear blurred background when solid color is selected
    showSuccess(`Canvas background set to ${color}.`);
  };

  const handleClearBackground = () => {
    setSelectedCanvasColor(null);
    setBlurredBackgroundImageUrl(null);
    showSuccess("Canvas background cleared.");
  };

  const isBuyNowDisabled = loading || isPlacingOrder || (product && product.inventory !== null && product.inventory <= 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between py-2 px-4 bg-white dark:bg-gray-800 shadow-md">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {product?.name || 'Loading Product...'}
          {product?.sku && <span className="text-sm text-gray-400 ml-2">({product.sku})</span>} {/* Display SKU */}
          {product && product.inventory !== null && product.inventory <= 0 && (
            <span className="text-red-500 text-sm ml-2">(Out of Stock)</span>
          )}
        </h1>
        <div className="flex items-center space-x-2">
          <Button onClick={handleBuyNowClick} disabled={isBuyNowDisabled}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Buy Now
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
            className="flex-1 flex items-center justify-center relative overflow-hidden"
            style={{
              // Use max-width and height auto to make it responsive
              maxWidth: '100%',
              height: 'auto',
              aspectRatio: `${product.canvas_width} / ${product.canvas_height}`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              touchAction: 'none',
            }}
            onClick={handleCanvasClick}
          >
            <div
              ref={canvasContentRef}
              className="relative shadow-lg overflow-hidden"
              style={{
                width: `${actualCanvasWidth}px`,
                height: `${actualCanvasHeight}px`,
                backgroundSize: 'cover', // Changed to cover for background image
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                touchAction: 'none',
                backgroundColor: selectedCanvasColor || '#FFFFFF', // Apply selected solid color, default to white
                backgroundImage: blurredBackgroundImageUrl ? `url(${blurredBackgroundImageUrl})` : 'none', // Apply blurred image
              }}
              onClick={handleCanvasClick}
            >
              {designElements.map(el => (
                <div
                  key={el.id}
                  data-element-id={el.id}
                  className={`absolute cursor-grab ${selectedElementId === el.id ? 'border-2 border-blue-500' : ''}`}
                  style={{
                    left: el.x * scaleFactor,
                    top: el.y * scaleFactor,
                    transform: `rotate(${el.rotation || 0}deg)`,
                    transformOrigin: 'center center',
                    width: `${el.width * scaleFactor}px`, // Use scaled width
                    height: `${el.height * scaleFactor}px`, // Use scaled height
                    zIndex: 5,
                    touchAction: 'none',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  onTouchStart={(e) => handleTouchStart(e, el.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {el.type === 'text' ? (
                    <div // Changed to div
                      ref={node => {
                        if (node) textElementRefs.current.set(el.id, node);
                        else textElementRefs.current.delete(el.id);
                      }}
                      contentEditable={selectedElementId === el.id}
                      onInput={(e) => handleTextContentInput(e, el.id)}
                      onBlur={() => {
                      }}
                      suppressContentEditableWarning={true}
                      className="outline-none w-full h-full flex items-center justify-center" // Added w-full h-full and flex properties
                      style={{
                        fontSize: `${(el.fontSize || 35) * scaleFactor}px`, // Scaled font size
                        color: el.color,
                        fontFamily: el.fontFamily,
                        textShadow: el.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                        wordBreak: 'break-word', // Allow text to wrap
                        overflow: 'hidden', // Hide overflow if text exceeds bounds
                      }}
                    >
                      {el.value}
                    </div>
                  ) : (
                    <img
                      src={proxyImageUrl(el.value)} // Always use proxyImageUrl for consistency
                      alt="design element"
                      className="w-full h-full object-contain"
                      crossOrigin="anonymous" // Added for CORS compatibility with html2canvas
                    />
                  )}
                  {/* Removed resize, delete, and rotate handles */}
                </div>
              ))}

              {mockupOverlayImageUrl && ( // Use the new state variable here
                <img
                  key={mockupOverlayImageUrl}
                  src={mockupOverlayImageUrl}
                  alt="Phone Mockup Overlay"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ zIndex: 10 }}
                  crossOrigin="anonymous" // Added for CORS compatibility with html2canvas
                />
              )}

              {!designElements.length && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer"
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

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-2 flex flex-wrap justify-around items-center border-t border-gray-200 dark:border-gray-700 z-10">
        {selectedElementId && designElements.find(el => el.id === selectedElementId)?.type === 'text' ? (
          <div className="flex flex-col w-full items-center">
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
                    updateElement(selectedElementId, { fontFamily: font });
                  }}
                >
                  {font}
                </Button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-1 p-1 w-full overflow-x-auto scrollbar-hide">
                {predefinedColors.map((color) => (
                    <div
                        key={color}
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 flex-shrink-0 ${currentTextColor === color ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                            setCurrentTextColor(color);
                            updateElement(selectedElementId, { color: color });
                        }}
                        title={color}
                    />
                ))}
            </div>
          </div>
        ) : isBackColorPaletteOpen ? (
          <div className="flex flex-col w-full items-center">
            <div className="flex items-center justify-center gap-1 p-1 w-full overflow-x-auto scrollbar-hide">
              {predefinedColors.map((color) => (
                <div
                  key={color}
                  className={`w-8 h-8 rounded-full cursor-pointer border-2 flex-shrink-0 ${selectedCanvasColor === color ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleSelectCanvasColor(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center justify-center w-full py-1 px-4">
              <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={handleBlurBackground}>
                <Palette className="h-6 w-6" />
                <span className="text-xs mt-1">Blur Background</span>
              </Button>
              {blurredBackgroundImageUrl && (
                <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={handleClearBlur}>
                  <XCircle className="h-6 w-6" />
                  <span className="text-xs mt-1">Clear Blur</span>
                </Button>
              )}
              <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={handleClearBackground}>
                <XCircle className="h-6 w-6" />
                <span className="text-xs mt-1">Clear Background</span>
              </Button>
            </div>
            <Button variant="ghost" className="flex flex-col h-auto p-2 mt-2" onClick={() => setIsBackColorPaletteOpen(false)}>
              <XCircle className="h-6 w-6" />
              <span className="text-xs mt-1">Close</span>
            </Button>
          </div>
        ) : (
          <>
            <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={handleAddTextElement}>
              <Text className="h-6 w-6" />
              <span className="text-xs mt-1">Add Text</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={() => fileInputRef.current?.click()}>
              <Image className="h-6 w-6" />
              <span className="text-xs mt-1">Your Photo</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-auto p-2" onClick={() => { setSelectedElementId(null); setIsBackColorPaletteOpen(true); }}>
              <Palette className="h-6 w-6" />
              <span className="text-xs mt-1">Back Color</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-auto p-2">
              <LayoutTemplate className="h-6 w-6" />
              <span className="text-xs mt-1">Readymade</span>
            </Button>
          </>
        )}
      </div>

      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>Please provide your details to complete the order.</DialogDescription>
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

      <Dialog open={isDemoOrderModalOpen} onOpenChange={setIsDemoOrderModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Place Demo Order</DialogTitle>
            <DialogDescription>Enter details for your demo order. This will not be a real purchase.</DialogDescription>
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