import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  ShoppingCart,
  XCircle,
  RotateCw,
  Download,
  Save,
  FolderOpen,
  Wand2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/contexts/SessionContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { proxyImageUrl } from '@/utils/imageProxy';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useDemoOrderModal } from '@/contexts/DemoOrderModalContext';
import { uploadFileToSupabase, deleteFileFromSupabase } from '@/utils/supabaseStorage';
import CustomizerModals from '@/components/customizer/CustomizerModals';

interface Product {
  id: string;
  name: string;
  canvas_width: number;
  canvas_height: number;
  price: number;
  inventory: number | null;
  sku: string | null;
}

interface MockupData {
  image_url: string | null;
  mockup_x: number | null;
  mockup_y: number | null;
  mockup_width: number | null;
  mockup_height: number | null;
  mockup_rotation: number | null;
  design_data: any;
}

interface DesignElement {
  id: string;
  type: 'text' | 'image';
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  textShadow?: boolean;
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

const ProductCustomizerPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const [currentFontSize, setCurrentFontSize] = useState<number[]>([35]);
  const [currentTextColor, setCurrentTextColor] = useState<string>('#000000');
  const [currentFontFamily, setCurrentFontFamily] = useState<string>('Arial');
  const [currentTextShadowEnabled, setCurrentTextShadowEnabled] = useState<boolean>(false);
  const [blurredBackgroundImageUrl, setBlurredBackgroundImageUrl] = useState<string | null>(null);
  const [isBackColorPaletteOpen, setIsBackColorPaletteOpen] = useState(false);
  const [selectedCanvasColor, setSelectedCanvasColor] = useState<string | null>('#FFFFFF');

  const designAreaRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { user } = useSession();
  const { isDemoOrderModalOpen, setIsDemoOrderModalOpen, demoOrderPrice, setDemoOrderDetails, demoOrderAddress } = useDemoOrderModal();

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const [mockupOverlayData, setMockupOverlayData] = useState<MockupData | null>(null);

  const [scaleFactor, setScaleFactor] = useState(1);

  const touchState = useRef<TouchState>({
    mode: 'none',
    startX: 0,
    startY: 0,
    initialElementX: 0,
    initialElementY: 0,
    activeElementId: null,
  });

  const resizeState = useRef<Omit<TouchState, 'initialElementX' | 'initialElementY' | 'initialDistance' | 'initialMidX' | 'initialMidY'> & {
    handle: 'br';
    initialWidth: number;
    initialHeight: number;
    initialFontSize: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    activeElementId: null,
    handle: 'br',
    initialWidth: 0,
    initialHeight: 0,
    initialFontSize: 0,
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
  const textElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastCaretPosition = useRef<{ node: Node | null; offset: number } | null>(null);

  const [isSavedDesignsModalOpen, setIsSavedDesignsModalOpen] = useState(false);

  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (canvasContentRef.current && product) {
        const renderedWidth = canvasContentRef.current.offsetWidth;
        const renderedHeight = canvasContentRef.current.offsetHeight;

        const scaleX = renderedWidth / product.canvas_width;
        const scaleY = renderedHeight / product.canvas_height;
        const newScaleFactor = Math.min(scaleX, scaleY);

        setScaleFactor(newScaleFactor);
      }
    };

    updateCanvasDimensions();

    const observer = new ResizeObserver(updateCanvasDimensions);
    if (canvasContentRef.current) {
      observer.observe(canvasContentRef.current);
    }

    return () => {
      if (canvasContentRef.current) {
        observer.unobserve(canvasContentRef.current);
      }
    };
  }, [product]);

  const loadDesign = useCallback((design: { elements: DesignElement[]; color: string | null; blurredBg: string | null }) => {
    setDesignElements(design.elements);
    setSelectedCanvasColor(design.color);
    setBlurredBackgroundImageUrl(design.blurredBg);
  }, []);

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
        console.log("Fetched productData:", productData);
        console.log("Mockups data from productData:", productData?.mockups);

        const mockup = productData.mockups.length > 0 ? productData.mockups[0] : null;
        const proxiedMockupUrl = mockup?.image_url ? proxyImageUrl(mockup.image_url) : null;
        
        setMockupOverlayData({
          image_url: proxiedMockupUrl,
          mockup_x: mockup?.mockup_x ?? 0,
          mockup_y: mockup?.mockup_y ?? 0,
          mockup_width: mockup?.mockup_width ?? productData.canvas_width,
          mockup_height: mockup?.mockup_height ?? productData.canvas_height,
          mockup_rotation: mockup?.mockup_rotation ?? 0,
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
          canvas_width: productData.canvas_width || 300,
          canvas_height: productData.canvas_height || 600,
          price: productData.price,
          inventory: productData.inventory,
          sku: productData.sku,
        });

        try {
          const localStorageKey = `product-${productId}-designs`;
          const storedDesigns = localStorage.getItem(localStorageKey);
          if (storedDesigns) {
            const parsedDesigns = JSON.parse(storedDesigns);
            if (parsedDesigns.length > 0) {
              const mostRecentDesign = parsedDesigns.sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
              loadDesign({
                elements: mostRecentDesign.designElements,
                color: mostRecentDesign.selectedCanvasColor,
                blurredBg: mostRecentDesign.blurredBackgroundImageUrl,
              });
              showSuccess("Previously saved design loaded automatically!");
            } else if (mockup?.design_data) {
              const loadedElements: DesignElement[] = JSON.parse(mockup.design_data as string).map((el: any) => ({
                ...el,
                width: el.width || (el.type === 'text' ? 200 : productData.canvas_width || 300),
                height: el.height || (el.type === 'text' ? 40 : productData.canvas_height || 600),
              }));
              setDesignElements(loadedElements);
            }
          } else if (mockup?.design_data) {
            const loadedElements: DesignElement[] = JSON.parse(mockup.design_data as string).map((el: any) => ({
              ...el,
              width: el.width || (el.type === 'text' ? 200 : productData.canvas_width || 300),
              height: el.height || (el.type === 'text' ? 40 : productData.canvas_height || 600),
            }));
            setDesignElements(loadedElements);
          }
        } catch (parseError) {
          console.error("Error parsing local or database design data:", parseError);
          showError("Failed to load existing design data. It might be corrupted.");
        }
        setDemoOrderDetails(productData.price?.toFixed(2) || '0.00', 'Demo Address, Demo City, Demo State, 00000');
      }
      setLoading(false);
    };

    if (productId) {
      fetchProductAndMockup();
    }
  }, [productId, setDemoOrderDetails, loadDesign]);

  useEffect(() => {
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
        const divRef = textElementRefs.current.get(element.id);
        if (divRef) {
          const selection = window.getSelection();
          const range = document.createRange();

          const textNode = divRef.firstChild;

          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const newOffset = Math.min(lastCaretPosition.current.offset, (textNode as Text).length);
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

  const getUnscaledCoords = (clientX: number, clientY: number) => {
    if (!canvasContentRef.current) return { x: 0, y: 0 };
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
    if (!element || !canvasContentRef.current) return;

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
    if (!isMobile) return;
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !canvasContentRef.current) return;

    if (e.touches.length === 1) {
      touchState.current = {
        mode: 'dragging',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialElementX: element.x,
        initialElementY: element.y,
        activeElementId: id,
      };
    } else if (e.touches.length === 2 && element.type === 'image') {
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
        startX: 0,
        startY: 0,
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
    } else {
      touchState.current.mode = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    e.preventDefault();
    const { mode, startX, startY, initialElementX, initialElementY, initialDistance, initialElementWidth, initialElementHeight, activeElementId, initialMidX, initialMidY } = touchState.current;
    if (!activeElementId || !canvasContentRef.current) return;

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
    if (!isMobile) return;
    touchState.current = {
      mode: 'none',
      startX: 0,
      startY: 0,
      initialElementX: 0,
      initialElementY: 0,
      activeElementId: null,
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, id: string, handle: 'br') => {
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !canvasContentRef.current) return;

    const { x: unscaledClientX, y: unscaledClientY } = getUnscaledCoords(e.clientX, e.clientY);

    resizeState.current = {
      mode: 'resizing',
      handle: handle,
      startX: unscaledClientX,
      startY: unscaledClientY,
      initialWidth: element.width,
      initialHeight: element.height,
      initialFontSize: element.fontSize || 35,
      activeElementId: id,
    };

    document.addEventListener('mousemove', onResizeMouseMove);
    document.addEventListener('mouseup', onResizeMouseUp);
  };

  const handleResizeTouchStart = (e: React.TouchEvent, id: string, handle: 'br') => {
    if (!isMobile || e.touches.length !== 1) return;
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !canvasContentRef.current) return;

    const { x: unscaledClientX, y: unscaledClientY } = getUnscaledCoords(e.touches[0].clientX, e.touches[0].clientY);

    resizeState.current = {
      mode: 'resizing',
      handle: handle,
      startX: unscaledClientX,
      startY: unscaledClientY,
      initialWidth: element.width,
      initialHeight: element.height,
      initialFontSize: element.fontSize || 35,
      activeElementId: id,
    };

    document.addEventListener('touchmove', onResizeTouchMove, { passive: false });
    document.addEventListener('touchend', onResizeTouchEnd);
  };

  const onResizeMouseMove = (moveEvent: MouseEvent) => {
    const { mode, handle, startX, startY, initialWidth, initialHeight, initialFontSize, activeElementId } = resizeState.current;
    if (mode !== 'resizing' || !activeElementId || !canvasContentRef.current) return;

    const element = designElements.find(el => el.id === activeElementId);
    if (!element) return;

    const { x: currentUnscaledX, y: currentUnscaledY } = getUnscaledCoords(moveEvent.clientX, moveEvent.clientY);

    const deltaX = currentUnscaledX - startX;
    const deltaY = currentUnscaledY - startY;

    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newFontSize = initialFontSize;

    if (handle === 'br') {
      newWidth = Math.max(20, initialWidth + deltaX);
      newHeight = Math.max(20, initialHeight + deltaY);

      if (initialHeight > 0) {
        const heightScaleFactor = newHeight / initialHeight;
        newFontSize = Math.max(10, Math.min(100, initialFontSize * heightScaleFactor));
      }
    }

    updateElement(activeElementId, {
      width: newWidth,
      height: newHeight,
      fontSize: newFontSize,
    });
  };

  const onResizeTouchMove = (moveEvent: TouchEvent) => {
    if (moveEvent.touches.length !== 1) return;
    moveEvent.preventDefault();
    const { mode, handle, startX, startY, initialWidth, initialHeight, initialFontSize, activeElementId } = resizeState.current;
    if (mode !== 'resizing' || !activeElementId || !canvasContentRef.current) return;

    const element = designElements.find(el => el.id === activeElementId);
    if (!element) return;

    const { x: currentUnscaledX, y: currentUnscaledY } = getUnscaledCoords(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);

    const deltaX = currentUnscaledX - startX;
    const deltaY = currentUnscaledY - startY;

    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newFontSize = initialFontSize;

    if (handle === 'br') {
      newWidth = Math.max(20, initialWidth + deltaX);
      newHeight = Math.max(20, initialHeight + deltaY);

      if (initialHeight > 0) {
        const heightScaleFactor = newHeight / initialHeight;
        newFontSize = Math.max(10, Math.min(100, initialFontSize * heightScaleFactor));
      }
    }

    updateElement(activeElementId, {
      width: newWidth,
      height: newHeight,
      fontSize: newFontSize,
    });
  };

  const onResizeMouseUp = () => {
    document.removeEventListener('mousemove', onResizeMouseMove);
    document.removeEventListener('mouseup', onResizeMouseUp);
    resizeState.current.mode = 'none';
    resizeState.current.activeElementId = null;
  };

  const onResizeTouchEnd = () => {
    document.removeEventListener('touchmove', onResizeTouchMove);
    document.removeEventListener('touchend', onResizeTouchEnd);
    resizeState.current.mode = 'none';
    resizeState.current.activeElementId = null;
  };

  const captureDesignForOrder = async () => {
    if (!canvasContentRef.current || !product) {
      showError("Design area or product data not found.");
      return null;
    }

    let originalMockupDisplay = '';
    const mockupImageElement = canvasContentRef.current.querySelector('img[alt="Phone Mockup Overlay"]');
    const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);

    const textElementsToRestore: { element: HTMLElement; originalOverflow: string }[] = [];
    designElements.forEach(el => {
      if (el.type === 'text') {
        const textDiv = textElementRefs.current.get(el.id);
        if (textDiv) {
          textElementsToRestore.push({ element: textDiv, originalOverflow: textDiv.style.overflow });
          textDiv.style.overflow = 'visible';
        }
      }
    });

    try {
      if (mockupOverlayData?.image_url) {
        await new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(true);
          img.onerror = (e) => {
            console.error("Error loading mockup image for html2canvas:", e);
            resolve(false); 
          };
          img.src = proxyImageUrl(mockupOverlayData.image_url);
        });
      }

      if (selectedElementDiv) {
        selectedElementDiv.classList.remove('border-2', 'border-blue-500');
      }

      if (mockupImageElement instanceof HTMLElement) {
        originalMockupDisplay = mockupImageElement.style.display;
        mockupImageElement.style.display = 'none';
      }

      console.log("Attempting to capture canvas with html2canvas...");
      const canvas = await html2canvas(canvasContentRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
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
      if (err.message && err.message.includes("Tainted canvases may not be exported")) {
        showError("Capture Failed: The design contains images from another domain that are not configured for CORS. Please ensure Supabase Storage CORS settings are correct (Allowed Origins: *, Allowed Methods: GET).");
      } else {
        showError(`Capture Failed: ${err.message || "An unexpected error occurred while generating image."}`);
      }
      return null;
    } finally {
      if (mockupImageElement instanceof HTMLElement) {
        mockupImageElement.style.display = originalMockupDisplay;
      }
      if (selectedElementDiv) {
        selectedElementDiv.classList.add('border-2', 'border-blue-500');
      }
      textElementsToRestore.forEach(({ element, originalOverflow }) => {
        element.style.overflow = originalOverflow;
      });
    }
  };

  const handlePlaceOrder = useCallback(async (isDemo: boolean) => {
    if (!product || !user?.id) {
      showError("Product or user information missing.");
      return;
    }

    const hasImageElement = designElements.some(el => el.type === 'image');
    if (!hasImageElement) {
      showError("Please add at least one image to your design before placing an order.");
      return;
    }

    const imagesStillUploading = designElements.some(el => el.type === 'image' && el.value.startsWith('blob:'));
    if (imagesStillUploading) {
      showError("Please wait for all images to finish uploading before placing your order.");
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
    
    // Explicitly get the latest session before invoking
    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError) {
      console.error("ProductCustomizerPage: Error getting session before invoke:", getSessionError);
      showError("Failed to get current session. Please try logging in again.");
      setIsPlacingOrder(false);
      dismissToast(toastId);
      return;
    }

    if (!currentSession || !currentSession.access_token) {
      console.log("ProductCustomizerPage: No active session found, redirecting to login.");
      showError("Your session has expired or is invalid. Please log in again.");
      navigate('/login');
      setIsPlacingOrder(false);
      dismissToast(toastId);
      return;
    }

    try {
      if (!isDemo) {
        if (product.inventory !== null && product.inventory <= 0) {
          throw new Error("Product is out of stock.");
        }
        const { data: decrementData, error: decrementError } = await supabase.functions.invoke('decrement-product-inventory', {
          body: { productId: product.id, quantity: 1 },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`, // Use the fresh token
          },
        });

        if (decrementError) {
          console.error("--- Edge Function Invoke Error Details (decrement-product-inventory) ---");
          console.error("Full invokeError object:", JSON.stringify(decrementError, null, 2));
          console.error("invokeError.context?.data (raw):", decrementError.context?.data);
          console.error("invokeError.context?.status:", decrementError.context?.status);
          console.error("--------------------------------------------------------------------");

          let errorMessage = decrementError.message;

          if (decrementError.context?.data) {
            try {
              const parsedErrorBody = typeof decrementError.context.data === 'string'
                ? JSON.parse(decrementError.context.data)
                : decrementError.context.data;

              if (parsedErrorBody && typeof parsedErrorBody === 'object' && 'error' in parsedErrorBody) {
                errorMessage = parsedErrorBody.error;
              } else {
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
          throw new Error(`Failed to update inventory: ${(decrementData as any).error}`);
        }
        setProduct(prev => prev ? { ...prev, inventory: (prev.inventory || 0) - 1 } : null);
      }

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
          ordered_design_data: designElements,
          type: finalOrderType,
        });

      if (orderInsertError) {
        console.error("Supabase insert error:", orderInsertError);
        throw new Error(`Failed to place order: ${orderInsertError.message}`);
      }

      showSuccess(isDemo ? "Demo order placed successfully!" : "Your order placed successfully");
      setIsCheckoutModalOpen(false);
      setIsDemoOrderModalOpen(false);
      
      if (isDemo) {
        navigate('/admin/demo-orders');
      } else {
        navigate('/');
      }

    } catch (err: any) {
      console.error("Error placing order:", err);
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

  const handleImageFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!product) {
      showError("Product data not loaded. Cannot add image.");
      return;
    }

    const newElementId = `image-${Date.now()}`;
    const tempUrl = URL.createObjectURL(file);

    const img = new window.Image();
    img.src = tempUrl;

    img.onload = () => {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;

      const canvasAspectRatio = product.canvas_width / product.canvas_height;
      const imageAspectRatio = originalWidth / originalHeight;

      let newWidth, newHeight;

      if (imageAspectRatio > canvasAspectRatio) {
        newHeight = product.canvas_height;
        newWidth = newHeight * imageAspectRatio;
      } else {
        newWidth = product.canvas_width;
        newHeight = newWidth / imageAspectRatio;
      }

      const newX = (product.canvas_width - newWidth) / 2;
      const newY = (product.canvas_height - newHeight) / 2;

      const newElement: DesignElement = {
        id: newElementId,
        type: 'image',
        value: tempUrl,
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
      showError("Failed to load selected image for preview.");
      URL.revokeObjectURL(tempUrl);
    };

    uploadFileToSupabase(file, 'order-mockups', 'user-uploads')
      .then(uploadedUrl => {
        if (uploadedUrl) {
          setDesignElements(prev =>
            prev.map(el =>
              el.id === newElementId ? { ...el, value: uploadedUrl } : el
            )
          );
          URL.revokeObjectURL(tempUrl);
          showSuccess("Image uploaded successfully!");
        } else {
          setDesignElements(prev => prev.filter(el => el.id !== newElementId));
          URL.revokeObjectURL(tempUrl);
          showError("Failed to upload image. Please try again.");
        }
      })
      .catch(err => {
        console.error("Error during background image upload:", err);
        setDesignElements(prev => prev.filter(el => el.id !== newElementId));
        URL.revokeObjectURL(tempUrl);
        showError(`An error occurred during upload: ${err.message}`);
      })
      .finally(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
  };

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
    const hasImageElement = designElements.some(el => el.type === 'image');
    if (!hasImageElement) {
      showError("Please add at least one image to your design before placing an order.");
      return;
    }
    const imagesStillUploading = designElements.some(el => el.type === 'image' && el.value.startsWith('blob:'));
    if (imagesStillUploading) {
      showError("Please wait for all images to finish uploading before placing your order.");
      return;
    }
    setIsCheckoutModalOpen(true);
  }, [user, product, navigate, designElements]);

  const handleAddTextElement = () => {
    if (!product) return;

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
      x: centerX - 100,
      y: centerY - 20,
      width: 200,
      height: 40,
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
      setIsBackColorPaletteOpen(false);
    }
  };

  const handleTextContentInput = (e: React.FormEvent<HTMLDivElement>, id: string) => {
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
    img.crossOrigin = 'Anonymous';
    img.src = proxyImageUrl(firstImageElement.value);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        showError("Failed to get canvas context.");
        dismissToast(toastId);
        return;
      }

      canvas.width = product.canvas_width;
      canvas.height = product.canvas_height;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      ctx.filter = 'blur(10px)';
      ctx.drawImage(canvas, 0, 0);

      const blurredDataUrl = canvas.toDataURL('image/png');
      setBlurredBackgroundImageUrl(blurredDataUrl);
      setSelectedCanvasColor(null);
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
    setBlurredBackgroundImageUrl(null);
    showSuccess(`Canvas background set to ${color}.`);
  };

  const handleClearBackground = () => {
    setSelectedCanvasColor(null);
    setBlurredBackgroundImageUrl(null);
    showSuccess("Canvas background cleared.");
  };

  const isBuyNowDisabled = loading || isPlacingOrder || (product && product.inventory !== null && product.inventory <= 0) || designElements.filter(el => el.type === 'image').length === 0 || designElements.some(el => el.type === 'image' && el.value.startsWith('blob:'));

  return (
    <>
      <main className="flex flex-col bg-gray-50 dark:bg-gray-900 flex-1">
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
                      <>
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
                            overflow: 'hidden',
                          }}
                        >
                          {el.value}
                        </div>
                        {selectedElementId === el.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600 z-20"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement(el.id);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>

                            <div
                              className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-20"
                              onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'br')}
                              onTouchStart={(e) => handleResizeTouchStart(e, el.id, 'br')}
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <img
                        src={proxyImageUrl(el.value)}
                        alt="design element"
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                      />
                    )}
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

        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-1 flex flex-wrap justify-center items-center gap-1 border-t border-gray-200 dark:border-gray-700 z-10">
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
                  <Button variant="destructive" size="icon" onClick={() => deleteElement(selectedElementId)}>
                      <Trash2 className="h-4 w-4" />
                  </Button>
              </div>
            </div>
          ) : isBackColorPaletteOpen ? (
            <div className="flex flex-col w-full items-center">
              <div className="flex items-center justify-center gap-1 px-4 py-1 w-full overflow-x-auto scrollbar-hide">
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
              <div className="flex items-center justify-center w-full py-1 px-4 space-x-1">
                <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={handleBlurBackground}>
                  <Wand2 className="h-5 w-5" />
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
                    <span className="text-xs">Clear All</span>
                </Button>
                <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={() => setIsBackColorPaletteOpen(false)}>
                  <XCircle className="h-5 w-5" />
                  <span className="text-xs">Close</span>
                </Button>
              </div>
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
              {selectedElementId && (
                <Button
                  variant="destructive"
                  className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105"
                  onClick={() => deleteElement(selectedElementId)}
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="text-xs">Delete</span>
                </Button>
              )}
              <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={() => setIsSavedDesignsModalOpen(true)}>
                <Save className="h-5 w-5" />
                <span className="text-xs">Save/Load</span>
              </Button>
              <Button variant="default" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105 animate-pulse-highlight" onClick={handleBuyNowClick} disabled={isBuyNowDisabled}>
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs">Buy Now</span>
              </Button>
            </>
          )}
        </div>

        <CustomizerModals
          product={product}
          isCheckoutModalOpen={isCheckoutModalOpen}
          setIsCheckoutModalOpen={setIsCheckoutModalOpen}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerAddress={customerAddress}
          setCustomerAddress={setCustomerAddress}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          isPlacingOrder={isPlacingOrder}
          handlePlaceOrder={handlePlaceOrder}
          isDemoOrderModalOpen={isDemoOrderModalOpen}
          setIsDemoOrderModalOpen={setIsDemoOrderModalOpen}
          demoOrderPrice={demoOrderPrice}
          demoOrderAddress={demoOrderAddress}
          setDemoOrderDetails={setDemoOrderDetails}
          isSavedDesignsModalOpen={isSavedDesignsModalOpen}
          setIsSavedDesignsModalOpen={setIsSavedDesignsModalOpen}
          currentDesignElements={designElements}
          currentSelectedCanvasColor={selectedCanvasColor}
          currentBlurredBackgroundImageUrl={blurredBackgroundImageUrl}
          onLoadDesign={loadDesign}
          canvasContentRef={canvasContentRef}
        />
      </main>
    </>
  );
};

export default ProductCustomizerPage;