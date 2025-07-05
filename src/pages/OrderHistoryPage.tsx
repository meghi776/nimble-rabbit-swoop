import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Image as ImageIcon, ArrowDownWideNarrow, ArrowUpWideNarrow, Calendar as CalendarIcon, XCircle, LogOut } from 'lucide-react'; // Import LogOut icon
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import OrderHistoryCard from '@/components/OrderHistoryCard';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

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
  type: string; // Added type to Order interface
}

const OrderHistoryPage = () => {
  const { user, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'normal' | 'demo'>('all');
  const [sortColumn, setSortColumn] = useState<keyof Order | 'product_name'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchOrders = async () => {
      if (sessionLoading || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      let query = supabase
        .from('orders')
        .select(`
          id,
          display_id,
          created_at,
          customer_name,
          customer_address,
          customer_phone,
          payment_method,
          status,
          total_price,
          ordered_design_image_url,
          products (name),
          type
        `)
        .eq('user_id', user.id);

      if (orderTypeFilter !== 'all') {
        query = query.eq('type', orderTypeFilter);
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching orders:", error);
        setError(error.message);
      } else {
        let sortedData = data || [];
        // Client-side sorting for product name and other columns
        sortedData.sort((a, b) => {
          let valA: any;
          let valB: any;

          if (sortColumn === 'product_name') {
            valA = a.products?.name || '';
            valB = b.products?.name || '';
          } else {
            valA = a[sortColumn];
            valB = b[sortColumn];
          }

          if (typeof valA === 'string' && typeof valB === 'string') {
            return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDirection === 'asc' ? valA - valB : valB - valA;
          }
          // For dates, convert to Date objects for comparison
          if (sortColumn === 'created_at') {
            const dateA = new Date(valA);
            const dateB = new Date(valB);
            return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
          }
          return 0;
        });
        setOrders(sortedData);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [user, sessionLoading, orderTypeFilter, sortColumn, sortDirection, startDate, endDate]);

  const openImageModal = (imageUrl: string | null) => {
    if (imageUrl) {
      setCurrentImageUrl(imageUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      return;
    }

    const toastId = showLoading("Cancelling order...");
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Cancelled' })
        .eq('id', orderId)
        .eq('user_id', user?.id); // Double-check ownership on client-side too

      if (error) {
        throw error;
      }

      showSuccess("Order cancelled successfully.");
      // Refresh the orders list by updating the state
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o));
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      showError(`Failed to cancel order: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleSort = (column: keyof Order | 'product_name') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof Order | 'product_name') => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUpWideNarrow className="ml-1 h-3 w-3" /> : <ArrowDownWideNarrow className="ml-1 h-3 w-3" />;
    }
    return null;
  };

  const handleSignOut = async () => {
    const toastId = showLoading("Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(`Failed to sign out: ${error.message}`);
    } else {
      showSuccess("Signed out successfully!");
      navigate('/login'); // Redirect to login page
    }
    dismissToast(toastId);
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Please log in to view your order history.</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Your Orders</h1>
        <Button onClick={handleSignOut} variant="outline">
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Order History</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex space-x-2">
              <Button
                variant={orderTypeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setOrderTypeFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={orderTypeFilter === 'normal' ? 'default' : 'outline'}
                onClick={() => setOrderTypeFilter('normal')}
                size="sm"
              >
                Normal
              </Button>
              <Button
                variant={orderTypeFilter === 'demo' ? 'default' : 'outline'}
                onClick={() => setOrderTypeFilter('demo')}
                size="sm"
              >
                Demo
              </Button>
            </div>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal">
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
                  <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300 text-center py-8">No {orderTypeFilter !== 'all' ? orderTypeFilter : ''} orders found for the selected date range.</p>
          ) : isMobile ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderHistoryCard key={order.id} order={order} onViewImage={openImageModal} onCancelOrder={handleCancelOrder} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center">Date {getSortIcon('created_at')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('product_name')}>
                      <div className="flex items-center">Product {getSortIcon('product_name')}</div>
                    </TableHead>
                    <TableHead>Design</TableHead>
                    <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('type')}>
                      <div className="flex items-center">Type {getSortIcon('type')}</div>
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Payment</TableHead>
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
                      <TableCell className="font-medium text-xs">{order.display_id || `${order.id.substring(0, 8)}...`}</TableCell>
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
                      <TableCell>{order.type}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{order.customer_address}</TableCell>
                      <TableCell>{order.customer_phone}</TableCell>
                      <TableCell>{order.payment_method}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell className="text-right">₹{order.total_price?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {order.status === 'Pending' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
    </div>
  );
};

export default OrderHistoryPage;