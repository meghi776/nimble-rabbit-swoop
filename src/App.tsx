import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MobileCoverCustomizationPage from "./pages/MobileCoverCustomizationPage";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagementPage from "./pages/admin/UserManagementPage";
import UserOrderListingPage from "./pages/admin/UserOrderListingPage";
import UserOrdersPage from "./pages/admin/UserOrdersPage";
import CategoryManagementPage from "./pages/admin/CategoryManagementPage";
import BrandManagementPage from "./pages/admin/BrandManagementPage";
import ProductManagementByBrandPage from "./pages/admin/ProductManagementByBrandPage";
import BrandListingPage from "./pages/BrandListingPage";
import ProductListingPage from "./pages/ProductListingPage";
import Login from "./pages/Login";
import { SessionContextProvider } from "./contexts/SessionContext";
import PublicLayout from "./components/PublicLayout";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import DemoOrderListingPage from "./pages/admin/DemoOrderListingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            {/* Routes that use the global Header */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/categories/:categoryId/brands" element={<BrandListingPage />} />
              <Route path="/categories/:categoryId/products" element={<ProductListingPage />} />
              <Route path="/categories/:categoryId/brands/:brandId/products" element={<ProductListingPage />} />
              <Route path="/orders" element={<OrderHistoryPage />} />
            </Route>

            {/* Routes that do NOT use the global Header */}
            <Route path="/login" element={<Login />} />
            <Route path="/customize-cover/:productId" element={<MobileCoverCustomizationPage />} />
            
            {/* Admin Routes (AdminLayout has its own sidebar/header) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="products" element={<ProductManagementPage />} />
              <Route path="orders" element={<UserOrderListingPage />} />
              <Route path="orders/:userId" element={<UserOrdersPage />} />
              <Route path="categories" element={<CategoryManagementPage />} />
              <Route path="categories/:categoryId/brands" element={<BrandManagementPage />} />
              <Route path="categories/:categoryId/brands/:brandId/products" element={<ProductManagementByBrandPage />} />
              <Route path="demo-orders" element={<DemoOrderListingPage />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;