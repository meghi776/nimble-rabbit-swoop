import React, { useEffect, useState, useRef } from 'react';
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
import { Loader2, Eye, Trash2, Image as ImageIcon, ArrowDownWideNarrow, ArrowUpWideNarrow, Download, ShoppingCart, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  products: { name: string } | null;
  profiles: { first_name: string | null; last_name: string | null; } | null;
  user_id: string;
  user_email?: string | null;
  type: string;
}

interface UserListItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

const OrderManagementPage = () => {
  const { session, loading: sessionLoading } = useSession();
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
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [selectedUserIdFilter, setSelectedUserIdFilter] = useState<string>('all');
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [selectedOrderIds, newSetSelectedOrderIds] = useState<Set<string>>(new Set());
  const [normalOrderCount, setNormalOrderCount] = useState<number | null>(null);
  const [demoOrderCount, setDemoOrderCount] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Demo'];

  const fetchOrdersAndCounts = async () => {
    setLoading(true);
    setError(null);
    newSetSelectedOrderIds(new Set());

    // Explicitly get the latest session before invoking
    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError) {
      console.error("OrderManagementPage: Error getting session before invoke:", getSessionError);
      showError("Failed to get current session. Please try logging in again.");
      setLoading(false);
      return;
    }

    if (!currentSession || !currentSession.access_token) {
      showError("Authentication required to fetch orders.");
      setLoading(false);
      return;
    }

    try {
      const { data: countsData, error: countsInvokeError } = await supabase.functions.invoke('get-order-counts', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`, // Use the fresh token
        },
      });

      if (countsInvokeError) {
        console.error("Edge Function Invoke Error (get-order-counts):", countsInvokeError);
        showError(`Failed to load order counts: ${countsInvokeError.message}`);
        setNormalOrderCount(null);
        setDemoOrderCount(null);
      } else if (countsData) {
        setNormalOrderCount(countsData.normalOrders);
        setDemoOrderCount(countsData.demoOrders);
      }

      const payload = {
        orderType: orderTypeFilter,
        userId: selectedUserIdFilter === 'all' ? null : selectedUserIdFilter,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      };

      const { data, error: invokeError } = await supabase.functions.invoke('get-orders-with-user-email', {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`, // Use the fresh token
        },
      });

      if (invokeError) {
        console.error("Edge Function Invoke Error (get-orders-with-user-email):", invokeError);
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
        showError(`Failed to load orders: ${errorMessage}`);
        setError(errorMessage);
      } else if (data && data.orders) {
        let sortedData = data.orders || [];
        sortedData.sort((a: Order, b: Order) => {
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
             return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
          }

          return sortDirection === 'asc' 
            ? String(valA).localeCompare(String(valB)) 
            : String(valB).localeCompare(String(valA));
        });
        setOrders(sortedData);
        setUserList(data.users || []);
      } else {
        showError("Unexpected response from server when fetching orders.");
        setError("Unexpected response from server.");
      }
    } catch (err: any) {
      console.error("Network or unexpected error:", err);
      showError(err.message || "An unexpected error occurred while fetching orders.");
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading) { // Only fetch when session is not loading
      fetchOrdersAndCounts();
    }
  }, [sortColumn, sortDirection, orderTypeFilter, selectedUserIdFilter, sessionLoading, startDate, endDate]);

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
      fetchOrdersAndCounts();
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
          showError(`Failed to delete order image from storage: ${storageError.message}`);
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
      showError(`Failed to delete order: ${error.message}`);
      return false;
    }
    return true;
  };

  const handleDeleteOrder = async (id: string, imageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    const toastId = showLoading("Deleting order...");
    const success = await deleteSingleOrder(id, imageUrl);
    if (success) {
      showSuccess("Order deleted successfully!");
      fetchOrdersAndCounts();
    } else {
      showError("Failed to delete order.");
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const handleSelectOrder = (orderId: string, isChecked: boolean) => {
    newSetSelectedOrderIds(prev => {
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
      newSetSelectedOrderIds(allOrderIds);
    } else {
      newSetSelectedOrderIds(new Set());
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

    fetchOrdersAndCounts();
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
          const blobWithText = await addTextToImage(order.ordered_design_image_url, productName);
          
          const fileName = `${productName}_${order.id.substring(0, 8)}_${format(new Date(order.created_at), 'yyyyMMdd')}.png`;
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
          saveAs(content, "selected_designs.zip");
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
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Order Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setOrderTypeFilter('normal')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{normalOrderCount !== null ? normalOrderCount : 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Total non-demo orders</p>
          </CardContent>
        </Card>
        <Link to="/admin/demo-users" className="block">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demo Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{demoOrderCount !== null ? demoOrderCount : 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Total demo orders</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <CardTitle>All Orders</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>End date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date > new Date() || (startDate && date < startDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div className="flex items-center space-x-2">
              <Label htmlFor="order-type-filter" className="text-sm">Type:</Label>
              <Select value={orderTypeFilter} onValueChange={(value) => setOrderTypeFilter(value)}>
                <SelectTrigger id="order-type-filter" className="w-[150px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="normal">Normal Orders</SelectItem>
                  <SelectItem value="demo">Demo Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="user-email-filter" className="text-sm">User:</Label>
              <Select value={selectedUserIdFilter} onValueChange={(value) => setSelectedUserIdFilter(value)}>
                <SelectTrigger id="user-email-filter" className="w-[200px]">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {userList.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">No orders found for the selected filters.</p>
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
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('display_id')}>
                          <div className="flex items-center">Order ID {getSortIcon('display_id')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>
                          <div className="flex items-center">Date {getSortIcon('created_at')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('customer_name')}>
                          <div className="flex items-center">Customer Name {getSortIcon('customer_name')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('user_email')}>
                          <div className="flex items-center">User Email {getSortIcon('user_email')}</div>
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('type')}>
                          <div className="flex items-center">Type {getSortIcon('type')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('payment_method')}>
                          <div className="flex items-center">Payment Method {getSortIcon('payment_method')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>
                          <div className="flex items-center">Status {getSortIcon('status')}</div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('total_price')}>
                          <div className="flex items-center justify-end">Total {getSortIcon('total_price')}</div>
                        </TableHead>
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

export default OrderManagementPage;