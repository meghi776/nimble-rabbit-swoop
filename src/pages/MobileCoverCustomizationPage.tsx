import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Import Link
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
import { useDemoOrderModal } from '@/contexts/DemoOrderModalContext'; // Import useDemoOrderModal
import QRCode from 'qrcode.react'; // Changed import to directly import QRCode

interface Product {
  id: string;
  name: string;
  canvas_width: number;
  canvas_height: number;
  price: number;
  inventory: number | null; // Added inventory
  sku: string | null; // Added SKU
}

interface MockupData {
  image_url: string | null;
  mockup_x: number | null;
  mockup_y: number | null;
  mockup_width: number | null;
  mockup_height: number | null;
  mockup_rotation: number | null;
  design_data: any; // Assuming design_data can be any JSON
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
  initialElementY: 0;
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
  const [loading, setLoading] = true;
  const [error, setError] = useState<string | null>(null);
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const [currentFontSize, setCurrentFontSize] = useState<number[]>([35]);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentFontFamily, setCurrentFontFamily] = useState('Arial');
  const [currentTextShadowEnabled, setCurrentTextShadowEnabled] = useState(false);
  const [blurredBackgroundImageUrl, setBlurredBackgroundImageUrl] = useState<string | null>(null); // New state for blurred background
  const [isBackColorPaletteOpen, setIsBackColorPaletteOpen] = useState(false); // State to control palette visibility
  const [selectedCanvasColor, setSelectedCanvasColor] = useState<string | null>('#FFFFFF'); // State for solid canvas background color - Changed to white

  const designAreaRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { user } = useSession();
  const { isDemoOrderModalOpen, setIsDemoOrderModalOpen, demoOrderPrice, setDemoOrderDetails, demoOrderAddress } = useDemoOrderModal(); // Use context

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState(''); // Changed to useState
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // New state for the mockup overlay image URL and its properties
  const [mockupOverlayData, setMockupOverlayData] = useState<MockupData | null>(null);

  // Responsive canvas states
  const [scaleFactor, setScaleFactor] = useState(1); // Only scaleFactor is needed now

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
  // Removed selectedImageElement as it's no longer needed for the delete button

  const textElementRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // Changed to HTMLDivElement
  const lastCaretPosition = useRef<{ node: Node | null; offset: number } | null>(null);

  // UPI details (placeholder - in a real app, this would come from a secure backend/env variables)
  const UPI_VPA = 'your_upi_id@bank'; // Replace with your actual UPI ID
  const UPI_PAYEE_NAME = 'Your Business Name'; // Replace with your business name

  // Effect to calculate scale factor based on the rendered size of the canvas content
  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (canvasContentRef.current && product) {
        const renderedWidth = canvasContentRef.current.offsetWidth;
        const renderedHeight = canvasContentRef.current.offsetHeight;

        // Calculate scale factor based on the actual rendered dimensions of the canvasContentRef
        // relative to the product's original canvas dimensions.
        const scaleX = renderedWidth / product.canvas_width;
        const scaleY = renderedHeight / product.canvas_height;
        const newScaleFactor = Math.min(scaleX, scaleY); // Use the smaller scale to ensure content fits

        setScaleFactor(newScaleFactor);
      }
    };

    // Initial calculation
    updateCanvasDimensions();

    // Set up ResizeObserver for dynamic scaling
    const observer = new ResizeObserver(updateCanvasDimensions);
    if (canvasContentRef.current) {
      observer.observe(canvasContentRef.current);
    }

    return () => {
      if (canvasContentRef.current) {
        observer.unobserve(canvasContentRef.current);
      }
    };
  }, [product]); // Depend on product to re-calculate when product data is loaded/changes

  useEffect(() => {
    const fetchProductAndMockup = async () => {
      setLoading(true);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          mockups(image_url, mockup_x, mockup_y, mockup_width, mockup_height, mockup_rotation, design_data)
        `)
        .eq('id', productId)
        .single();

      if (productError) {
        console.error("Error fetching product:", productError);
        showError("Failed to load product details.");
        setError(productError.message);
      } else if (productData) {
        console.log("Fetched productData:", productData); // Log product data
        console.log("Mockups data from productData:", productData?.mockups); // Log mockups data

        const mockup = productData.mockups.length > 0 ? productData.mockups[0] : null;
        const proxiedMockupUrl = mockup?.image_url ? proxyImageUrl(mockup.image_url) : null;
        
        setMockupOverlayData({
          image_url: proxiedMockupUrl,
          mockup_x: mockup?.mockup_x ?? 0, // Default to 0 if null
          mockup_y: mockup?.mockup_y ?? 0, // Default to 0 if null
          mockup_width: mockup?.mockup_width ?? productData.canvas_width, // Default to canvas width if null
          mockup_height: mockup?.mockup_height ?? productData.canvas_height, // Default to canvas height if null
          mockup_rotation: mockup?.mockup_rotation ?? 0, // Default to 0 if null
          design_data: mockup?.design_data || null,
        });

        console.log("Mockup Overlay Data:", {
          image_url: proxiedMockupUrl,
          mockup_x: mockup?.mockup_x ?? 0,
          mockup_y: mockup?.mockup_y ?? 0,
          mockup_width: mockup?.mockup_width ?? productData.canvas_width,
          mockup_height: mockup?.mockup_height ?? productData.canvas_height,
          mockup_rotation: mockup?.mockup_rotation ?? 0,
        });

        setProduct({
          id: productData.id,
          name: productData.name,
          canvas_width: productData.canvas_width || 300, // Use product's canvas width
          canvas_height: productData.canvas_height || 600, // Use product's canvas height
          price: productData.price,
          inventory: productData.inventory, // Set inventory
          sku: productData.sku, // Set SKU
        });

        if (mockup?.design_data) {
          try {
            // Ensure loaded design elements conform to the new interface (add default width/height if missing)
            const loadedElements: DesignElement[] = JSON.parse(mockup.design_data as string).map((el: any) => ({
              ...el,
              width: el.width || (el.type === 'text' ? 200 : productData.canvas_width || 300), // Default width for text/image
              height: el.height || (el.type === 'text' ? 40 : productData.canvas_height || 600), // Default height for text/image
            }));
            setDesignElements(loadedElements);
          } catch (parseError) {
            console.error("Error parsing design data:", parseError);
            showError("Failed to load existing design data.");
          }
        }
        // Set demo order details in context when product loads
        setDemoOrderDetails(productData.price?.toFixed(2) || '0.00', 'Demo Address, Demo City, Demo State, 00000');
      }
      setLoading(false);
    };

    if (productId) {
      fetchProductAndMockup();
    }
  }, [productId, setDemoOrderDetails]); // Add setDemoOrderDetails to dependencies

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
        const divRef = textElementRefs.current.get(el.id);
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

  const addImageElement = async (file: File, id: string) => {
    if (!product) return; // Ensure product is loaded

    const img = new window.Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;

      // Calculate dimensions to cover the entire canvas while maintaining aspect ratio
      const canvasAspectRatio = product.canvas_width / product.canvas_height;
      const imageAspectRatio = originalWidth / originalHeight;

      let newWidth, newHeight;

      if (imageAspectRatio > canvasAspectRatio) {
        // Image is wider than canvas, scale by height to cover
        newHeight = product.canvas_height;
        newWidth = newHeight * imageAspectRatio;
      } else {
        // Image is taller than canvas, scale by width to cover
        newWidth = product.canvas_width;
        newHeight = newWidth / imageAspectRatio;
      }

      // Center the image
      const newX = (product.canvas_width - newWidth) / 2;
      const newY = (product.canvas_height - newHeight) / 2;

      const newElement: DesignElement = {
        id: id,
        type: 'image',
        value: img.src, // Use blob URL initially
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        rotation: 0,
      };
      setDesignElements(prev => [...prev, newElement]);
      setSelectedElementId(newElement.id);
    };

    img.onerror = () => {
      showError("Failed to load image for preview.");
      URL.revokeObjectURL(img.src);
    };
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
    if (!canvasContentRef.current) return { x: 0, y: 0 }; // Use canvasContentRef for coordinates
    const canvasRect = canvasContentRef.current.getBoundingClientRect();
    return {
      x: (clientX - canvasRect.left) / scaleFactor,
      y: (clientY - canvasRect.top) / scaleFactor,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !canvasContentRef.current) return; // Use canvasContentRef

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
    if (!element || !canvasContentRef.current) return; // Use canvasContentRef

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
    if (!activeElementId || !canvasContentRef.current) return; // Use canvasContentRef

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
      showError("Design area or product data not found.");
      return null;
    }

    let originalMockupDisplay = ''; // Changed from pointerEvents to display
    const mockupImageElement = canvasContentRef.current.querySelector('img[alt="Phone Mockup Overlay"]');
    const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);

    // Store original overflow styles for text elements
    const textElementsToRestore: { element: HTMLElement; originalOverflow: string }[] = [];
    designElements.forEach(el => {
      if (el.type === 'text') {
        const textDiv = textElementRefs.current.get(el.id);
        if (textDiv) {
          textElementsToRestore.push({ element: textDiv, originalOverflow: textDiv.style.overflow });
          textDiv.style.overflow = 'visible'; // Temporarily make overflow visible
        }
      }
    });

    try {
      // Pre-load mockup image to ensure it's in cache and rendered
      if (mockupOverlayData?.image_url) {
        await new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(true);
          img.onerror = (e) => {
            console.error("Error loading mockup image for html2canvas:", e);
            // Do not reject, allow html2canvas to proceed even if this image fails
            resolve(false); 
          };
          img.src = proxyImageUrl(mockupOverlayData.image_url);
        });
      }

      // Temporarily remove border from selected element for screenshot
      if (selectedElementDiv) {
        selectedElementDiv.classList.remove('border-2', 'border-blue-500');
      }

      // Temporarily hide mockup for capture
      if (mockupImageElement instanceof HTMLElement) {
        originalMockupDisplay = mockupImageElement.style.display; // Store display property
        mockupImageElement.style.display = 'none'; // Hide the mockup
      }

      console.log("Attempting to capture canvas with html2canvas...");
      const canvas = await html2canvas(canvasContentRef.current, {
        useCORS: true,
        allowTaint: true, // Allow tainting, but it will prevent toDataURL if not truly CORS-compliant
        backgroundColor: null, // Let CSS background color be captured
        // Set a high fixed scale for better quality
        // The scale property in html2canvas is a multiplier for the rendered size.
        // To get a high-resolution image that matches the product's original canvas dimensions,
        // we should set the scale such that the rendered canvas matches the target dimensions.
        // If product.canvas_width and product.canvas_height are the target dimensions,
        // and canvasContentRef.current.offsetWidth/Height are the *current* rendered dimensions,
        // then the scale should be target_dimension / current_rendered_dimension.
        // Setting `scale: 3` is a good general practice for higher quality.
        scale: 3, 
        width: product.canvas_width, 
        height: product.canvas_height,
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
        mockupImageElement.style.display = originalMockupDisplay; // Restore display property
      }
      if (selectedElementDiv) {
        selectedElementDiv.classList.add('border-2', 'border-blue-500');
      }
      // Restore original overflow styles for text elements
      textElementsToRestore.forEach(({ element, originalOverflow }) => {
        element.style.overflow = originalOverflow;
      });
    }
  };

  const handleImageFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const newElementId = `image-${Date.now()}`;

    // 1. Add the element to state with a temporary URL and calculated dimensions
    await addImageElement(file, newElementId);

    // Clear the file input immediately
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Corrected line
    }

    // 2. Start the actual upload in the background
    try {
      const uploadedUrl = await handleFileUpload(file, 'order-mockups', 'user-uploads');
      if (uploadedUrl) {
        // 3. Update the element with the permanent URL once upload is complete
        setDesignElements(prev =>
          prev.map(el => (el.id === newElementId ? { ...el, value: uploadedUrl } : el))
        );
        // The temporary URL created by addImageElement will be automatically revoked by the browser
        // when the blob is no longer referenced, or explicitly if needed.
      } else {
        // If upload fails, remove the element or show a persistent error
        setDesignElements(prev => prev.filter(el => el.id !== newElementId));
        showError("Could not upload image to server. Please try again.");
      }
    } catch (err: any) {
      console.error("Error during image upload:", err);
      setDesignElements(prev => prev.filter(el => el.id !== newElementId));
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
    const finalPaymentMethod = isDemo ? 'Demo' : paymentMethod; // Use selected payment method
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
          body: { productId: product.id, quantity: 1 }, // Simplified body
        });

        if (decrementError) {
          console.error("--- Edge Function Invoke Error Details (decrement-product-inventory) ---");
          console.error("Full invokeError object:", JSON.stringify(decrementError, null, 2));
          console.error("invokeError.context?.data (raw):", decrementError.context?.data);
          console.error("invokeError.context?.status:", decrementError.context?.status);
          console.error("--------------------------------------------------------------------");

          let errorMessage = decrementError.message; // Default to generic message

          if (decrementError.context?.data) {
            try {
              const parsedErrorBody = typeof decrementError.context.data === 'string'
                ? JSON.parse(decrementError.context.data)
                : decrementError.context.data;

              if (parsedErrorBody && typeof parsedErrorBody === 'object' && 'error' in parsedErrorBody) {
                errorMessage = parsedErrorBody.error;
              } else {
                // If data exists but isn't a simple { error: "message" }
                errorMessage = `Edge Function responded with status ${decrementError.context?.status || 'unknown'}. Raw response: ${JSON.stringify(parsedErrorBody)}`;
              }
            } catch (parseErr) {
              console.error("Failed to parse error response body from Edge Function:", parseErr);
              errorMessage = `Edge Function responded with status ${decrementError.context?.status || 'unknown'}. Raw response: ${decrementError.context.data}`;
            }
          } else if (decrementError.context?.status) {
            errorMessage = `Edge Function returned status code: ${decrementError.context.status}`;
          }
          throw new Error(`Failed to update inventory: ${errorMessage}`);
        } else if (decrementData && (decrementData as any).error) {
          // This handles cases where function returns 200 but with an error payload
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
      // Prioritize specific error message from Edge Function if available
      let displayErrorMessage = err.message || "An unexpected error occurred while placing your order.";
      if (err.message && err.message.includes("Failed to update inventory:") && err.message.includes("Not enough stock available.")) {
        displayErrorMessage = "Failed to place order: Not enough stock available.";
      }
      showError(displayErrorMessage);
    } finally {
      setIsPlacingOrder(false);
      dismissToast(toastId);
    }
  }, [product, user, customerName, customerAddress, customerPhone, paymentMethod, demoOrderPrice, demoOrderAddress, designElements, navigate, setIsDemoOrderModalOpen]);

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

  // Removed handleDemoOrderClick as it's now triggered from the header

  const handleAddTextElement = () => {
    if (!product) return; // Ensure product is loaded

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
    const firstImageElement = designElements.find(el => el.type === 'image');
    if (!firstImageElement) {
      showError("Please add an image to the canvas first to use as a blurred background.");
      return;
    }
    if (!product) {
      showError("Product data not loaded. Cannot apply blur.");
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

  // Generate UPI QR code data string
  const generateUpiQrData = () => {
    if (!product || !product.price) return '';
    const amount = product.price.toFixed(2);
    const transactionId = `ORDER_${Date.now()}`; // Unique transaction ID
    return `upi://pay?pa=${UPI_VPA}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${amount}&cu=INR&tid=${transactionId}`;
  };

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 flex-1">
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
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto pb-65">
          {/* Removed Header section for the customization page */}
          <div
            ref={designAreaRef}
            className="flex-1 flex items-center justify-center relative overflow-hidden px-4"
            style={{
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              touchAction: 'none',
            }}
            onClick={handleCanvasClick}
          >
            <div
              ref={canvasContentRef}
              className="relative shadow-lg overflow-hidden w-full h-full"
              style={{
                aspectRatio: `${product.canvas_width} / ${product.canvas_height}`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                touchAction: 'none',
                backgroundColor: selectedCanvasColor || '#FFFFFF',
                backgroundImage: blurredBackgroundImageUrl ? `url(${blurredBackgroundImageUrl})` : 'none',
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
                    width: `${el.width * scaleFactor}px`,
                    height: `${el.height * scaleFactor}px`,
                    zIndex: 5,
                    touchAction: 'none',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  onTouchStart={(e) => handleTouchStart(e, el.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {el.type === 'text' ? (
                    <div
                      ref={node => {
                        if (node) textElementRefs.current.set(el.id, node);
                        else textElementRefs.current.delete(el.id);
                      }}
                      contentEditable={selectedElementId === el.id}
                      onInput={(e) => handleTextContentInput(e, el.id)}
                      onBlur={() => {
                      }}
                      suppressContentEditableWarning={true}
                      className="outline-none w-full h-full flex items-center justify-center"
                      style={{
                        fontSize: `${(el.fontSize || 35) * scaleFactor}px`,
                        color: el.color,
                        fontFamily: el.fontFamily,
                        textShadow: el.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                        wordBreak: 'break-word',
                        overflow: 'hidden', // Keep hidden for display in editor
                      }}
                    >
                      {el.value}
                    </div>
                  ) : (
                    <img
                      src={proxyImageUrl(el.value)}
                      alt="design element"
                      className="w-full h-full object-contain"
                      crossOrigin="anonymous"
                    />
                  )}
                  {/* Removed resize, delete, and rotate handles */}
                </div>
              ))}

              {mockupOverlayData?.image_url && (
                <img
                  key={mockupOverlayData.image_url}
                  src={mockupOverlayData.image_url}
                  alt="Phone Mockup Overlay"
                  className="absolute object-contain pointer-events-none"
                  style={{
                    left: (mockupOverlayData.mockup_x ?? 0) * scaleFactor,
                    top: (mockupOverlayData.mockup_y ?? 0) * scaleFactor,
                    width: `${(mockupOverlayData.mockup_width ?? product.canvas_width) * scaleFactor}px`,
                    height: `${(mockupOverlayData.mockup_height ?? product.canvas_height) * scaleFactor}px`,
                    transform: `rotate(${mockupOverlayData.mockup_rotation || 0}deg)`,
                    transformOrigin: 'center center',
                    zIndex: 10,
                  }}
                  crossOrigin="anonymous"
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

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-1 flex flex-wrap justify-around items-center border-t border-gray-200 dark:border-gray-700 z-10">
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
              <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={handleBlurBackground}>
                <Palette className="h-5 w-5" />
                <span className="text-xs">Blur Background</span>
              </Button>
              {blurredBackgroundImageUrl && (
                <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={handleClearBlur}>
                  <XCircle className="h-5 w-5" />
                  <span className="text-xs">Clear Blur</span>
                </Button>
              )}
              <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={handleClearBackground}>
                <XCircle className="h-5 w-5" />
                  <span className="text-xs">Clear Background</span>
              </Button>
            </div>
            <Button variant="ghost" className="flex flex-col h-auto p-1 mt-2 transition-transform duration-200 hover:scale-105" onClick={() => setIsBackColorPaletteOpen(false)}>
              <XCircle className="h-5 w-5" />
              <span className="text-xs">Close</span>
            </Button>
          </div>
        ) : (
          <>
            <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={handleAddTextElement}>
              <Text className="h-5 w-5" />
              <span className="text-xs">Add Text</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={() => fileInputRef.current?.click()}>
              <Image className="h-5 w-5" />
              <span className="text-xs">Your Photo</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={() => { setSelectedElementId(null); setIsBackColorPaletteOpen(true); }}>
              <Palette className="h-5 w-5" />
              <span className="text-xs">Back Color</span>
            </Button>
            {/* Removed Delete Image button from here */}
            <Button variant="default" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105 animate-pulse-highlight" onClick={handleBuyNowClick} disabled={isBuyNowDisabled}>
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs">Buy Now</span>
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
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COD">Cash on Delivery</SelectItem>
                  <SelectItem value="UPI">UPI Scanner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === 'UPI' && product && (
              <div className="col-span-4 flex flex-col items-center justify-center p-4 border rounded-md bg-gray-50 dark:bg-gray-700">
                <p className="text-lg font-semibold mb-2">Scan to Pay</p>
                <QRCode value={generateUpiQrData()} size={200} level="H" includeMargin={true} />
                <p className="text-sm text-muted-foreground mt-2">Amount: ₹{product.price?.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  (This is a demo QR. Payment will not be automatically confirmed.)
                </p>
              </div>
            )}
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
                onChange={(e) => setDemoOrderDetails(e.target.value, demoOrderAddress)}
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
                onChange={(e) => setDemoOrderDetails(demoOrderPrice, e.target.value)}
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