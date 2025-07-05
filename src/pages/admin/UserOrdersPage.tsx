import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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
import { Loader2, Eye, Trash2, Image as ImageIcon, ArrowLeft, ArrowDownWideNarrow, ArrowUpWideNarrow, Download } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

interface Order {
  id: string;
  display_id: string | null;
  created_at: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  payment_method: string;
  status: string;
  total_price: number;
  ordered_design_image_url: string | null;
  products: { name: string }[] | null;
  profiles: { first_name: string | null; last_name: string | null; }[] | null;
  type: string;
}

const UserOrdersPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const orderTypeParam = searchParams.get('type');

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
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Demo'];

  const fetchUserAndOrders = async () => {
    if (!userId) {
      showError("User ID is missing.");
      setError("User ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedOrderIds(new Set());

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      showError("Failed to load user profile.");
      setError(profileError.message);
      setLoading(false);
      return;
    }
    setUserName(`${profileData?.first_name || 'Unknown'} ${profileData?.last_name || 'User'}`);

    let query = supabase
      .from('orders')
      .select(`
        id, display_id, created_at, customer_name, customer_address, customer_phone,
        payment_method, status, total_price, ordered_design_image_url,
        products (name), profiles (first_name, last_name), type
      `)
      .eq('user_id', userId);
    
    if (orderTypeParam) {
      query = query.eq('type', orderTypeParam);
    }

    const { data, error: ordersError } = await query.order(sortColumn, { ascending: sortDirection === 'asc' });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      showError("Failed to load orders for this user.");
      setError(ordersError.message);
    } else {
      setOrders((data as Order[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserAndOrders();
  }, [userId, orderTypeParam, sortColumn, sortDirection]);

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
    const toastId = showLoading("Updating order status...");
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', currentOrder.id);

    if (error) {
      console.error("Error updating order status:", error);
      showError(`Failed to update order status: ${error.message}`);
    } else {
      showSuccess("Order status updated successfully!");
      setIsEditStatusModalOpen(false);
      fetchUserAndOrders();
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const handleDeleteOrder = async (id: string, imageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    const toastId = showLoading("Deleting order...");

    if (imageUrl && imageUrl.startsWith('https://smpjbedvyqensurarrym.supabase.co/storage/v1/object/public/order-mockups/')) {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('order-mockups')
          .remove([`orders/${fileName}`]);
        if (storageError) {
          console.error("Error deleting order image from storage:", storageError);
          showError(`Failed to delete order image from storage: ${storageError.message}`);
          dismissToast(toastId);
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
      showError(`Failed to delete order: ${error.message}`);
    } else {
      showSuccess("Order deleted successfully!");
      fetchUserAndOrders();
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const handleSelectOrder = (orderId: string, isChecked: boolean) => {
    setSelectedOrderIds(prev => {
      const newSelection = new Set(prev);
      if (isChecked) {
        newSelection.add(orderId);
      } else {
        newSelection.delete(orderId);
      }
      return newSelection;
    });
  };

  const handleSelectAllOrders = (isChecked: boolean) => {
    if (isChecked) {
      const allOrderIds = new Set(orders.map(order => order.id));
      setSelectedOrderIds(allOrderIds);
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const handleBulkDownloadDesigns = async () => {
    if (selectedOrderIds.size === 0) {
      showError("No designs selected.");
      return;
    }

    const toastId = showLoading(`Preparing ${selectedOrderIds.size} designs for download...`);
    const zip = new JSZip();
    let downloadedCount = 0;

    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));

    const downloadPromises = selectedOrders.map(async (order) => {
      if (order.ordered_design_image_url) {
        try {
          const response = await fetch(order.ordered_design_image_url);
          if (!response.ok) throw new Error(`Failed to fetch image for order ${order.id}`);
          const blob = await response.blob();
          const fileName = `${order.products?.[0]?.name || 'design'}_${order.id.substring(0, 8)}.png`;
          zip.file(fileName, blob);
          downloadedCount++;
        } catch (err) {
          console.error(`Failed to download design for order ${order.id}:`, err);
        }
      }
    });

    await Promise.all(downloadPromises);

    if (downloadedCount > 0) {
      zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, `designs_${userId}.zip`);
        showSuccess(`${downloadedCount} designs downloaded.`);
      });
    } else {
      showError("No designs could be downloaded.");
    }
    dismissToast(toastId);
  };

  const handleBulkDownloadAddresses = () => {
    if (selectedOrderIds.size === 0) {
      showError("No orders selected.");
      return;
    }

    const dataToExport = orders
      .filter(o => selectedOrderIds.has(o.id))
      .map(order => ({
        'Order ID': order.display_id || order.id,
        'Customer Name': order.customer_name,
        'Customer Address': order.customer_address,
        'Customer Phone': order.customer_phone,
        'Product Name': order.products?.[0]?.name || 'N/A',
        'Order Date': format(new Date(order.created_at), 'yyyy-MM-dd'),
      }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `addresses_${userId}.csv`);
    showSuccess(`${dataToExport.length} addresses exported.`);
  };

  const isAllSelected = orders.length > 0 && selectedOrderIds.size === orders.length;
  const isIndeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < orders.length;

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to={orderTypeParam === 'demo' ? '/admin/demo-users' : '/admin/orders'} className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          {orderTypeParam === 'demo' ? 'Demo Orders' : 'Orders'} for {userName || 'Loading...'}
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Customer Orders</CardTitle>
          <div className="flex items-center space-x-2">
            {selectedOrderIds.size > 0 && (
              <>
                <Button onClick={handleBulkDownloadDesigns} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download Designs ({selectedOrderIds.size})
                </Button>
                <Button onClick={handleBulkDownloadAddresses} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download Addresses ({selectedOrderIds.size})
                </Button>
              </>
            )}
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
                <SelectItem value="payment_method">Payment Method</SelectItem>
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
                        <TableHead className="w-[30px]">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAllOrders}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOrderIds.has(order.id)}
                              onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                              aria-label={`Select order ${order.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-xs">{order.display_id || `${order.id.substring(0, 8)}...`}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                          <TableCell>{order.products?.[0]?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {order.ordered_design_image_url ? (
                              <Button variant="outline" size="sm" onClick={() => openImageModal(order.ordered_design_image_url)}>
                                <ImageIcon className="h-4 w-4" /> View
                              </Button>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>{order.type}</TableCell>
                          <TableCell>{order.payment_method}</TableCell>
                          <TableCell>{order.status}</TableCell>
                          <TableCell className="text-right">₹{order.total_price?.toFixed(2)}</TableCell>
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
              <p id="order-id" className="col-span-3 font-medium">{currentOrder?.display_id || `${currentOrder?.id.substring(0, 8)}...`}</p>
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