import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OrderManagementPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Order Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Order List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300">This page will display a list of orders and allow for management actions.</p>
          {/* Order list table or other content will go here */}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderManagementPage;