import React, { useEffect, useState } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, Trash2, Image as ImageIcon, ArrowDownWideNarrow, ArrowUpWideNarrow, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useSession } from '@/contexts/SessionContext';
import { addTextToImage } from '@/utils/imageUtils';

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
  product_id: string | null;
  products: { name: string } | null;
  profiles: { first_name: string | null; last_name: string | null; } | null;
  user_id: string;
  user_email?: string | null;
  type: string;
}

const DemoOrderListingPage = () => {
  const { session, loading: sessionLoading } = useSession();
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Demo'];

  useEffect(() => {
    const fetchOrders = async () => {
      if (sessionLoading) return;

      setLoading(true);
      setError(null);
      setSelectedOrderIds(new Set());

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        showError("Authentication required to fetch demo orders.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-orders-with-user-email', {
          body: { orderType: 'demo' },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`,
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
              // Fallback
            }
          }
          showError(`Failed to load demo orders: ${errorMessage}`);
          setError(errorMessage);
        } else if (data && data.orders) {
          setRawOrders(data.orders || []);
        } else {
          showError("Unexpected response from server when fetching demo orders.");
          setError("Unexpected response from server.");
        }
      } catch (err: any) {
        console.error("Network or unexpected error:", err);
        showError(err.message || "An unexpected error occurred while fetching demo orders.");
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [sessionLoading]);

  useEffect(() => {
    let sortedData = [...rawOrders];
    sortedData.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortColumn === 'user_email') {
        valA = a.user_email || '';
        valB = b.user_email || '';
      } else if (sortColumn === 'customer_name') {
        valA = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.trim() || a.customer_name;
        valB = `${b.profiles?.first_name || ''} ${b.profiles?.last_name || ''}`.trim() || b.customer_name;
      } else {
        valA = a[sortColumn as keyof Order];
        valB = b[sortColumn as keyof Order];
      }

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      
      if (sortColumn === 'created_at') {
         const dateA = new Date(valA as string);
         const dateB = new Date(valB as string);
         return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateB.getTime();
      }

      return sortDirection === 'asc' 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    });
    setOrders(sortedData);
  }, [rawOrders, sortColumn, sortDirection]);

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
    const toastId = showLoading("Updating demo order status...");
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', currentOrder.id);

    if (error) {
      console.error("Error updating order status:", error);
      showError(`Failed to update demo order status: ${error.message}`);
    } else {
      showSuccess("Demo order status updated successfully!");
      setIsEditStatusModalOpen(false);
      setRawOrders(prev => prev.map(o => o.id === currentOrder.id ? { ...o, status: newStatus } : o));
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const deleteSingleOrder = async (id: string, imageUrl: string | null) => {
    if (imageUrl && imageUrl.startsWith('https://smpjbedvyqensurarrym.supabase.co/storage/v1/object/public/order-mockups/')) {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('order-mockups')
          .remove([`orders/${fileName}`]);
        if (storageError) {
          console.error("Error deleting order image from storage:", storageError);
          showError(`Failed to delete demo order image from storage: ${storageError.message}`);
          return false;
        }
      }
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting order:", error);
      showError(`Failed to delete demo order: ${error.message}`);
      return false;
    }
    return true;
  };

  const handleDeleteOrder = async (id: string, imageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    const toastId = showLoading("Deleting demo order...");
    const success = await deleteSingleOrder(id, imageUrl);
    if (success) {
      showSuccess("Demo order deleted successfully!");
      setRawOrders(prev => prev.filter(o => o.id !== id));
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

  const handleBulkDelete = async () => {
    if (selectedOrderIds.size === 0) {
      showError("No orders selected. Please select at least one order to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedOrderIds.size} selected orders? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    const toastId = showLoading(`Deleting ${selectedOrderIds.size} orders...`);
    let successfulDeletions = 0;
    let failedDeletions = 0;

    for (const orderId of selectedOrderIds) {
      const orderToDelete = orders.find(o => o.id === orderId);
      if (orderToDelete) {
        const success = await deleteSingleOrder(orderId, orderToDelete.ordered_design_image_url);
        if (success) {
          successfulDeletions++;
        } else {
          failedDeletions++;
        }
      }
    }

    setRawOrders(prev => prev.filter(o => !selectedOrderIds.has(o.id)));
    dismissToast(toastId);
    setLoading(false);
    if (failedDeletions === 0) {
      showSuccess(`${successfulDeletions} orders deleted successfully!`);
    } else if (successfulDeletions > 0) {
      showError(`${successfulDeletions} orders deleted, but ${failedDeletions} failed.`);
    } else {
      showError("Failed to delete any selected orders.");
    }
  };

  const handleBulkDownloadDesigns = async () => {
    if (selectedOrderIds.size === 0) {
      showError("No designs selected. Please select at least one order to download its design.");
      return;
    }

    setLoading(true);
    const toastId = showLoading(`Preparing ${selectedOrderIds.size} designs for download...`);
    const zip = new JSZip();
    let downloadedCount = 0;
    let failedCount = 0;

    const downloadPromises = Array.from(selectedOrderIds).map(async (orderId) => {
      const order = orders.find(o => o.id === orderId);
      if (order && order.ordered_design_image_url) {
        try {
          const productName = order.products?.name || 'Unknown Product';
          const orderDisplayId = order.display_id || order.id;
          const blobWithText = await addTextToImage(order.ordered_design_image_url, productName, orderDisplayId);
          
          const fileName = `${orderDisplayId}.png`;
          zip.file(fileName, blobWithText);
          downloadedCount++;
        } catch (err) {
          console.error(`Failed to process design for order ${order.id}:`, err);
          failedCount++;
        }
      } else {
        failedCount++;
      }
    });

    await Promise.all(downloadPromises);

    if (downloadedCount > 0) {
      zip.generateAsync({ type: "blob" })
        .then(function (content) {
          saveAs(content, "selected_demo_designs.zip");
          showSuccess(`${downloadedCount} designs downloaded successfully!`);
        })
        .catch(err => {
          console.error("Error generating zip file:", err);
          showError("Error generating zip file for download.");
        });
    } else {
      showError("No designs were successfully downloaded.");
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUpWideNarrow className="ml-1 h-3 w-3" /> : <ArrowDownWideNarrow className="ml-1 h-3 w-3" />;
    }
    return null;
  };

  const isAllSelected = orders.length > 0 && selectedOrderIds.size === orders.length;
  const isIndeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < orders.length;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Demo Order Management</h1>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Demo Orders List</CardTitle>
          <div className="flex items-center space-x-2">
            {selectedOrderIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleBulkDownloadDesigns}
                  disabled={loading}
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" /> Download ({selectedOrderIds.size})
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={loading}
                  size="sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedOrderIds.size})
                </Button>
              </>
            )}
            <Label htmlFor="sort-by">Sort by:</Label>
            <Select value={sortColumn} onValueChange={handleSort}>
              <SelectTrigger id="sort-by" className="w-[180px]">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Order Date</SelectItem>
                <SelectItem value="customer_name">Customer Name</SelectItem>
                <SelectItem value="customer_phone">Phone Number</SelectItem>
                <SelectItem value="user_email">User Email</SelectItem>
                <SelectItem value="total_price">Total Price</SelectItem>
                <SelectItem value="status">Status</SelectItem>
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
                <p className="text-gray-600 dark:text-gray-300">No demo orders found.</p>
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
                        <TableHead>Customer Name</TableHead>
                        <TableHead>User Email</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Design</TableHead>
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
                          <TableCell>
                            <Link to={`/admin/orders/${order.user_id}`} className="text-blue-600 hover:underline">
                              {order.profiles?.first_name || 'N/A'} {order.profiles?.last_name || ''}
                            </Link>
                          </TableCell>
                          <TableCell>{order.user_email || 'N/A'}</TableCell>
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

export default DemoOrderListingPage;