import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MobileCoverCustomizationPage from "./pages/MobileCoverCustomizationPage";
import AdminLayout from "./components/AdminLayout"; // Import AdminLayout
import AdminDashboard from "./pages/admin/AdminDashboard"; // Import AdminDashboard
import UserManagementPage from "./pages/admin/UserManagementPage"; // Import UserManagementPage
import ProductManagementPage from "./pages/admin/ProductManagementPage"; // Import ProductManagementPage
import OrderManagementPage from "./pages/admin/OrderManagementPage"; // Import OrderManagementPage

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/customize-cover" element={<MobileCoverCustomizationPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="products" element={<ProductManagementPage />} />
            <Route path="orders" element={<OrderManagementPage />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;