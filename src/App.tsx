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
import ProductManagementPage from "./pages/admin/ProductManagementPage";
import OrderManagementPage from "./pages/admin/OrderManagementPage";
import CategoryManagementPage from "./pages/admin/CategoryManagementPage";
import BrandManagementPage from "./pages/admin/BrandManagementPage";
import ProductManagementByBrandPage from "./pages/admin/ProductManagementByBrandPage";
import BrandListingPage from "./pages/BrandListingPage";
import ProductListingPage from "./pages/ProductListingPage";
import Header from "./components/Header";
import Login from "./pages/Login"; // Import the new Login component
import { SessionContextProvider } from "./contexts/SessionContext"; // Import the new SessionContextProvider

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider> {/* Wrap the entire app with SessionContextProvider */}
          <Header />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} /> {/* Add the Login route */}
            <Route path="/customize-cover/:productId" element={<MobileCoverCustomizationPage />} /> {/* Updated route to accept product ID */}
            
            {/* Public Listing Routes */}
            <Route path="/categories/:categoryId/brands" element={<BrandListingPage />} />
            <Route path="/categories/:categoryId/products" element={<ProductListingPage />} />
            <Route path="/categories/:categoryId/brands/:brandId/products" element={<ProductListingPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="products" element={<ProductManagementPage />} />
              <Route path="orders" element={<OrderManagementPage />} />
              <Route path="categories" element={<CategoryManagementPage />} />
              <Route path="categories/:categoryId/brands" element={<BrandManagementPage />} />
              <Route path="categories/:categoryId/brands/:brandId/products" element={<ProductManagementByBrandPage />} />
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