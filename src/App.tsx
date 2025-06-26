import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ProductListingPage from "./pages/ProductListingPage";
import BrandsPage from "./pages/BrandsPage";
import { SessionContextProvider } from "./contexts/SessionContext";
import { Toaster } from "react-hot-toast";
import AdminDashboard from "./pages/admin/AdminDashboard"; // Import AdminDashboard
import AdminLayout from "./components/AdminLayout"; // Import AdminLayout
import CategoryManagementPage from "./pages/admin/CategoryManagementPage"; // Import CategoryManagementPage
import BrandManagementPage from "./pages/admin/BrandManagementPage"; // Import BrandManagementPage
import ProductManagementByBrandPage from "./pages/admin/ProductManagementByBrandPage"; // Import ProductManagementByBrandPage
import UserManagementPage from "./pages/admin/UserManagementPage"; // Import UserManagementPage
import UserOrderListingPage from "./pages/admin/UserOrderListingPage"; // Import UserOrderListingPage
import UserOrdersPage from "./pages/admin/UserOrdersPage"; // Import UserOrdersPage
import DemoOrderListingPage from "./pages/admin/DemoOrderListingPage"; // Import DemoOrderListingPage
import MobileCoverCustomizationPage from "./pages/MobileCoverCustomizationPage"; // Import MobileCoverCustomizationPage
import OrderHistoryPage from "./pages/OrderHistoryPage"; // Import OrderHistoryPage
import PublicLayout from "./components/PublicLayout"; // Import PublicLayout
import NotFound from "./pages/NotFound"; // Import NotFound

function App() {
  return (
    <>
      <Toaster />
      <Router>
        <SessionContextProvider>
          <Routes>
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/categories/:categoryId/brands" element={<BrandsPage />} />
              <Route path="/categories/:categoryId/brands/:brandId/products" element={<ProductListingPage />} />
              <Route path="/customize-cover/:productId" element={<MobileCoverCustomizationPage />} />
              <Route path="/orders" element={<OrderHistoryPage />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="products" element={<CategoryManagementPage />} /> {/* This will show categories */}
              <Route path="categories/:categoryId/brands" element={<BrandManagementPage />} />
              <Route path="categories/:categoryId/brands/:brandId/products" element={<ProductManagementByBrandPage />} />
              <Route path="orders" element={<UserOrderListingPage />} />
              <Route path="orders/:userId" element={<UserOrdersPage />} />
              <Route path="demo-orders" element={<DemoOrderListingPage />} />
            </Route>

            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </Router>
    </>
  );
}

export default App;