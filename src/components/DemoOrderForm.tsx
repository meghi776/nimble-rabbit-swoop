import React, { useState } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';

interface DemoOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: () => void;
}

const DemoOrderForm: React.FC<DemoOrderFormProps> = ({ isOpen, onClose, onOrderPlaced }) => {
  const [price, setPrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useSession(); // Get session to pass token to Edge Function

  const handleSubmit = async () => {
    if (!price.trim() || !customerName.trim() || !customerAddress.trim() || !customerPhone.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(parseFloat(price))) {
      toast({
        title: "Validation Error",
        description: "Price must be a valid number.",
        variant: "destructive",
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create demo orders.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        total_price: parseFloat(price),
        customer_name: customerName,
        customer_address: customerAddress,
        customer_phone: customerPhone,
      };

      const { data, error: invokeError } = await supabase.functions.invoke('create-demo-order', {
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // Explicitly pass token
        },
      });

      if (invokeError) {
        console.error("Edge Function Invoke Error:", invokeError);
        let errorMessage = invokeError.message;
        if (invokeError.context?.data) {
          try {
            const parsedError = JSON.parse(invokeError.context.data);
            if (parsedError.error) {
              errorMessage = parsedError.error;
            }
          } catch (e) {
            // Fallback if context.data is not JSON
          }
        }
        toast({
          title: "Error",
          description: `Failed to create demo order: ${errorMessage}`,
          variant: "destructive",
        });
      } else if (data && (data as any).error) {
        console.error("Edge Function returned error in data payload:", (data as any).error);
        toast({
          title: "Error",
          description: `Failed to create demo order: ${(data as any).error}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Demo order created successfully!",
        });
        onOrderPlaced();
        onClose();
        setPrice('');
        setCustomerName('');
        setCustomerAddress('');
        setCustomerPhone('');
      }
    } catch (err: any) {
      console.error("Network or unexpected error invoking Edge Function:", err);
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred while creating the demo order.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Demo Order</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="demo-price" className="text-right">
              Price
            </Label>
            <Input
              id="demo-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="demo-customer-name" className="text-right">
              Customer Name
            </Label>
            <Input
              id="demo-customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="demo-customer-address" className="text-right">
              Address
            </Label>
            <Textarea
              id="demo-customer-address"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="demo-customer-phone" className="text-right">
              Phone
            </Label>
            <Input
              id="demo-customer-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Demo Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DemoOrderForm;