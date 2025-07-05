import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const OrderSuccessPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg text-center animate-in fade-in-0 zoom-in-95 duration-500">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-100">
            Order Placed Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Thank you for your purchase. Your order is being processed and you can view its status in your account's order history.
          </p>
          <Link to="/">
            <Button className="w-full">Continue Shopping</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSuccessPage;