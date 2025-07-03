import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import SavedDesignsModal from '@/components/SavedDesignsModal';

// Define types for props to ensure type safety
interface Product {
  id: string;
  name: string;
  price: number;
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

interface CustomizerModalsProps {
  product: Product | null;
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (isOpen: boolean) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  isPlacingOrder: boolean;
  handlePlaceOrder: (isDemo: boolean) => void;
  isDemoOrderModalOpen: boolean;
  setIsDemoOrderModalOpen: (isOpen: boolean) => void;
  demoOrderPrice: string;
  demoOrderAddress: string;
  setDemoOrderDetails: (price: string, address: string) => void;
  isSavedDesignsModalOpen: boolean;
  setIsSavedDesignsModalOpen: (isOpen: boolean) => void;
  currentDesignElements: DesignElement[];
  currentSelectedCanvasColor: string | null;
  currentBlurredBackgroundImageUrl: string | null;
  onLoadDesign: (design: { elements: DesignElement[]; color: string | null; blurredBg: string | null }) => void;
  canvasContentRef: React.RefObject<HTMLDivElement>;
}

const CustomizerModals: React.FC<CustomizerModalsProps> = ({
  product,
  isCheckoutModalOpen,
  setIsCheckoutModalOpen,
  customerName,
  setCustomerName,
  customerAddress,
  setCustomerAddress,
  customerPhone,
  setCustomerPhone,
  paymentMethod,
  setPaymentMethod,
  isPlacingOrder,
  handlePlaceOrder,
  isDemoOrderModalOpen,
  setIsDemoOrderModalOpen,
  demoOrderPrice,
  demoOrderAddress,
  setDemoOrderDetails,
  isSavedDesignsModalOpen,
  setIsSavedDesignsModalOpen,
  currentDesignElements,
  currentSelectedCanvasColor,
  currentBlurredBackgroundImageUrl,
  onLoadDesign,
  canvasContentRef,
}) => {
  if (!product) return null;

  return (
    <>
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
                </SelectContent>
              </Select>
            </div>
            {product && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Total Price</Label>
                <span className="col-span-3 text-lg font-bold">₹{product.price?.toFixed(2)}</span>
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

      <SavedDesignsModal
        productId={product.id}
        isOpen={isSavedDesignsModalOpen}
        onOpenChange={setIsSavedDesignsModalOpen}
        currentDesignElements={currentDesignElements}
        currentSelectedCanvasColor={currentSelectedCanvasColor}
        currentBlurredBackgroundImageUrl={currentBlurredBackgroundImageUrl}
        onLoadDesign={onLoadDesign}
        canvasContentRef={canvasContentRef}
        product={product}
      />
    </>
  );
};

export default CustomizerModals;