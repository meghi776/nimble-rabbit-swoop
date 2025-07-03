import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from 'date-fns';
import { Eye, Image as ImageIcon, XCircle, Trash2 } from 'lucide-react';

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  payment_method: string;
  status: string;
  total_price: number;
  ordered_design_image_url: string | null;
  products: { name: string } | null;
  type: string;
}

interface OrderHistoryCardProps {
  order: Order;
  onViewImage: (imageUrl: string | null) => void;
  onCancelOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string, imageUrl: string | null) => void;
  userRole?: 'user' | 'admin' | 'demo';
}

const OrderHistoryCard: React.FC<OrderHistoryCardProps> = ({ order, onViewImage, onCancelOrder, onDeleteOrder, userRole }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center text-lg">
            <span>{order.products?.name || 'N/A'}</span>
            <span className="text-base font-bold">₹{order.total_price?.toFixed(2)}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{format(new Date(order.created_at), 'PPP')}</p>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm">Status: <span className="font-semibold">{order.status}</span></p>
              <p className="text-sm">Type: <span className="font-semibold">{order.type}</span></p>
            </div>
            {order.ordered_design_image_url && (
              <Button variant="outline" size="sm" onClick={() => onViewImage(order.ordered_design_image_url)}>
                <ImageIcon className="mr-2 h-4 w-4" /> View Design
              </Button>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center gap-2">
          <Button className="flex-1" onClick={() => setIsDetailsOpen(true)}>
            <Eye className="mr-2 h-4 w-4" /> View Details
          </Button>
          {order.status === 'Pending' && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onCancelOrder(order.id)}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
          {userRole === 'demo' && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => onDeleteOrder(order.id, order.ordered_design_image_url)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Order ID: {order.id.substring(0, 8)}...</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 text-sm">
            <p><strong>Product:</strong> {order.products?.name || 'N/A'}</p>
            <p><strong>Date:</strong> {format(new Date(order.created_at), 'PPP')}</p>
            <p><strong>Total:</strong> ₹{order.total_price?.toFixed(2)}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Type:</strong> {order.type}</p>
            <p><strong>Payment:</strong> {order.payment_method}</p>
            <p><strong>Name:</strong> {order.customer_name}</p>
            <p><strong>Address:</strong> {order.customer_address}</p>
            <p><strong>Phone:</strong> {order.customer_phone}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderHistoryCard;