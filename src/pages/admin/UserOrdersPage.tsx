import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, Trash2, Image as ImageIcon, ArrowLeft, ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';
import { format } from 'date-fns';

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
  products: { name: string } | null; // Nested product data
  profiles: { first_name: string | null; last_name: string | null; } | null;
  type: string; // Added type to Order interface
}

const UserOrdersPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [userName, setUserName] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Demo']; // Added 'Demo' status

  const fetchUserAndOrders = async () => {
    if (!userId) {
      setError("User ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch user's name
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      setError(profileError.message);
      setLoading(false);
      return;
    }
    setUserName(`${profileData?.first_name || 'Unknown'} ${profileData?.last_name || 'User'}`);

    // Fetch orders for the specific user with sorting
    const { data, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        customer_name,
        customer_address,
        customer_phone,
        payment_method,
        status,
        total_price,
        ordered_design_image_url,
        products (name),
        profiles (first_name, last_name),
        type
      `)
      .eq('user_id', userId)
      .order(sortColumn, { ascending: sortDirection === 'asc' });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      setError(ordersError.message);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserAndOrders();
  }, [userId, sortColumn, sortDirection]); // Re-fetch when sort options change

  const openImageModal = (imageUrl: string | null) => {
    if (imageUrl) {
      setCurrentImageUrl(imageUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleEditStatusClick = (order: Order) => {
    setCurrentOrder(order);
    setNewStatus(order.status);
    setIsEditStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!currentOrder || !newStatus) return;

    setLoading(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', currentOrder.id);

    if (error) {
      console.error("Error updating order status:", error);
    } else {
      setIsEditStatusModalOpen(false);
      fetchUserAndOrders(); // Re-fetch orders to update the list
    }
    setLoading(false);
  };

  const handleDeleteOrder = async (id: string, imageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }

    setLoading(true);

    // Delete image from storage if it exists and is a Supabase URL
    if (imageUrl && imageUrl.startsWith('https://smpjbedvyqensurarrym.supabase.co/storage/v1/object/public/order-mockups/')) {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('order-mockups')
          .remove([`orders/${fileName}`]); // Ensure correct path for removal
        if (storageError) {
          console.error("Error deleting order image from storage:", storageError);
          setLoading(false);
          return;
        }
      }
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting order:", error);
    } else {
      fetchUserAndOrders(); // Re-fetch orders to update the list
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to="/admin/orders" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Orders for {userName || 'Loading...'}</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Customer Orders</CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="sort-by">Sort by:</Label>
            <Select value={sortColumn} onValueChange={(value) => setSortColumn(value)}>
              <SelectTrigger id="sort-by" className="w-[180px]">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Order Date</SelectItem>
                <SelectItem value="customer_name">Customer Name</SelectItem>
                <SelectItem value="customer_phone">Phone Number</SelectItem>
                <SelectItem value="total_price">Total Price</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? (
                <ArrowUpWideNarrow className="h-4 w-4" />
              ) : (
                <ArrowDownWideNarrow className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          )}

          {error && (
            <p className="text-red-500">Error: {error}</p>
          )}

          {!loading && !error && (
            <>
              {orders.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">No orders found for this user.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Type</TableHead> {/* New TableHead for Type */}
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium text-xs">{order.id.substring(0, 8)}...</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                          <TableCell>{order.products?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {order.ordered_design_image_url ? (
                              <Button variant="outline" size="sm" onClick={() => openImageModal(order.ordered_design_image_url)}>
                                <ImageIcon className="h-4 w-4" /> View
                              </Button>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>{order.type}</TableCell> {/* Display order type */}
                          <TableCell>{order.status}</TableCell>
                          <TableCell className="text-right">${order.total_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditStatusClick(order)}
                            >
                              <Eye className="h-4 w-4" /> Status
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteOrder(order.id, order.ordered_design_image_url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ordered Design</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-4">
            {currentImageUrl ? (
              <img src={currentImageUrl} alt="Ordered Design" className="max-w-full h-auto border rounded-md" />
            ) : (
              <p>No image available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={isEditStatusModalOpen} onOpenChange={setIsEditStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="order-id" className="text-right">
                Order ID
              </Label>
              <p id="order-id" className="col-span-3 font-medium">{currentOrder?.id.substring(0, 8)}...</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-status" className="text-right">
                Current Status
              </Label>
              <p id="current-status" className="col-span-3">{currentOrder?.status}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-status" className="text-right">
                New Status
              </Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {orderStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStatusModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStatus}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserOrdersPage;