import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, FolderOpen, Trash2, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { format } from 'date-fns';
import html2canvas from 'html2canvas'; // Import html2canvas

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

interface SavedDesign {
  id: string;
  name: string;
  designElements: DesignElement[];
  selectedCanvasColor: string | null;
  blurredBackgroundImageUrl: string | null;
  timestamp: number;
  thumbnailUrl: string | null; // New field for thumbnail
}

interface SavedDesignsModalProps {
  productId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentDesignElements: DesignElement[];
  currentSelectedCanvasColor: string | null;
  currentBlurredBackgroundImageUrl: string | null;
  onLoadDesign: (design: { elements: DesignElement[]; color: string | null; blurredBg: string | null }) => void;
  canvasContentRef: React.RefObject<HTMLDivElement>; // Pass ref to canvas content
  product: { canvas_width: number; canvas_height: number } | null; // Pass product for canvas dimensions
}

const SavedDesignsModal: React.FC<SavedDesignsModalProps> = ({
  productId,
  isOpen,
  onOpenChange,
  currentDesignElements,
  currentSelectedCanvasColor,
  currentBlurredBackgroundImageUrl,
  onLoadDesign,
  canvasContentRef, // Destructure new prop
  product, // Destructure new prop
}) => {
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [newDesignName, setNewDesignName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);

  const localStorageKey = `product-${productId}-designs`;

  const fetchSavedDesigns = useCallback(() => {
    setIsLoadingDesigns(true);
    try {
      const storedDesigns = localStorage.getItem(localStorageKey);
      if (storedDesigns) {
        const parsedDesigns: SavedDesign[] = JSON.parse(storedDesigns);
        // Sort by most recent first
        setSavedDesigns(parsedDesigns.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setSavedDesigns([]);
      }
    } catch (e: any) {
      console.error("Error fetching saved designs from local storage:", e);
      showError(`Failed to load saved designs: ${e.message || "Corrupted data."}`);
      setSavedDesigns([]); // Clear corrupted data
    } finally {
      setIsLoadingDesigns(false);
    }
  }, [localStorageKey]);

  useEffect(() => {
    if (isOpen) {
      fetchSavedDesigns();
      setNewDesignName(''); // Clear input when modal opens
    }
  }, [isOpen, fetchSavedDesigns]);

  const captureThumbnail = async (): Promise<string | null> => {
    if (!canvasContentRef.current || !product) {
      console.error("Cannot capture thumbnail: Canvas ref or product data missing.");
      return null;
    }

    const selectedElementDiv = document.querySelector(`[data-element-id="${productId}"]`); // Assuming productId is used to identify the main canvas wrapper

    // Temporarily remove border from selected element for screenshot
    if (selectedElementDiv) {
      selectedElementDiv.classList.remove('border-2', 'border-blue-500');
    }

    try {
      const canvas = await html2canvas(canvasContentRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Let CSS handle background
        scale: 0.5, // Capture at a lower scale for thumbnail quality
        width: product.canvas_width,
        height: product.canvas_height,
        x: 0,
        y: 0,
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error("Error capturing thumbnail:", err);
      return null;
    } finally {
      // Restore original styles
      if (selectedElementDiv) {
        selectedElementDiv.classList.add('border-2', 'border-blue-500');
      }
    }
  };

  const handleSaveCurrentDesign = async () => { // Made async
    if (!newDesignName.trim()) {
      showError("Please enter a name for your design.");
      return;
    }

    // Ensure all images are uploaded before saving
    const imagesStillUploading = currentDesignElements.some(el => el.type === 'image' && el.value.startsWith('blob:'));
    if (imagesStillUploading) {
      showError("Please wait for all images to finish uploading before saving your design.");
      return;
    }

    setIsSaving(true);
    const toastId = showLoading("Saving design...");

    try {
      const thumbnailUrl = await captureThumbnail(); // Capture thumbnail

      const newDesign: SavedDesign = {
        id: `design-${Date.now()}`,
        name: newDesignName.trim(),
        designElements: currentDesignElements,
        selectedCanvasColor: currentSelectedCanvasColor,
        blurredBackgroundImageUrl: currentBlurredBackgroundImageUrl,
        timestamp: Date.now(),
        thumbnailUrl: thumbnailUrl, // Save thumbnail
      };

      const updatedDesigns = [...savedDesigns, newDesign];
      localStorage.setItem(localStorageKey, JSON.stringify(updatedDesigns));
      setSavedDesigns(updatedDesigns.sort((a, b) => b.timestamp - a.timestamp)); // Re-sort
      setNewDesignName('');
      showSuccess("Design saved successfully!");
    } catch (e: any) {
      console.error("Error saving design to local storage:", e);
      showError(`Failed to save design: ${e.message || "Storage limit exceeded or other error."}`);
    } finally {
      dismissToast(toastId);
      setIsSaving(false);
    }
  };

  const handleLoadDesign = (design: SavedDesign) => {
    onLoadDesign({
      elements: design.designElements,
      color: design.selectedCanvasColor,
      blurredBg: design.blurredBackgroundImageUrl,
    });
    showSuccess(`Design "${design.name}" loaded!`);
    onOpenChange(false); // Close modal after loading
  };

  const handleDeleteDesign = (designId: string, designName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${designName}"? This cannot be undone.`)) {
      return;
    }
    const toastId = showLoading("Deleting design...");
    try {
      const updatedDesigns = savedDesigns.filter(d => d.id !== designId);
      localStorage.setItem(localStorageKey, JSON.stringify(updatedDesigns));
      setSavedDesigns(updatedDesigns);
      showSuccess(`Design "${designName}" deleted.`);
    } catch (e: any) {
      console.error("Error deleting design from local storage:", e);
      showError(`Failed to delete design: ${e.message || "Storage error."}`);
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Saved Designs</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 flex-grow overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="new-design-name">Save Current Design</Label>
            <div className="flex space-x-2">
              <Input
                id="new-design-name"
                placeholder="Enter design name"
                value={newDesignName}
                onChange={(e) => setNewDesignName(e.target.value)}
                className="flex-grow"
                disabled={isSaving}
              />
              <Button onClick={handleSaveCurrentDesign} disabled={isSaving || !newDesignName.trim()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>

          <div className="flex-grow flex flex-col min-h-0">
            <h3 className="text-lg font-semibold mb-2">Your Saved Designs</h3>
            {isLoadingDesigns ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : savedDesigns.length === 0 ? (
              <p className="text-muted-foreground">No designs saved yet for this product.</p>
            ) : (
              <ScrollArea className="flex-grow pr-4">
                <div className="space-y-2">
                  {savedDesigns.map((design) => (
                    <div key={design.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                      <div className="flex items-center space-x-3">
                        {design.thumbnailUrl && (
                          <img
                            src={design.thumbnailUrl}
                            alt={design.name}
                            className="w-16 h-16 object-contain border rounded-sm"
                          />
                        )}
                        <div>
                          <p className="font-medium">{design.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Saved: {format(new Date(design.timestamp), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleLoadDesign(design)}>
                          <FolderOpen className="mr-2 h-4 w-4" /> Load
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteDesign(design.id, design.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SavedDesignsModal;