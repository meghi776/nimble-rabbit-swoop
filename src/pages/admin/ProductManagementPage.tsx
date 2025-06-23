import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ProductManagementPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Product Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300">This page will display a list of products and allow for management actions.</p>
          {/* Product list table or other content will go here */}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductManagementPage;