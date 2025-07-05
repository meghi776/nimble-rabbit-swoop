import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ProductListingPage from "./pages/ProductListingPage";
import BrandsPage from "./pages/BrandsPage";
import SessionContextWrapper from "./components/SessionContextWrapper"; // Import the new wrapper
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
import ProductCustomizerPage from "./pages/ProductCustomizerPage"; // Renamed import
import OrderHistoryPage from "./pages/OrderHistoryPage"; // Import OrderHistoryPage
import PublicLayout from "./components/PublicLayout"; // Import PublicLayout
import NotFound from "./pages/NotFound"; // Import NotFound
import { DemoOrderModalProvider } from "./contexts/DemoOrderModalContext"; // Import DemoOrderModalProvider
import DemoUsersWithOrdersPage from "./pages/admin/DemoUsersWithOrdersPage"; // Import DemoUsersWithOrdersPage
import ProductEditPage from "./pages/admin/ProductEditPage"; // Import ProductEditPage
import OrderSuccessPage from "./pages/OrderSuccessPage";

function App() {
  return (
    <>
      <Toaster />
      <Router>
        <SessionContextWrapper> {/* Use the new wrapper here */}
          <DemoOrderModalProvider>
            <Routes>
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/categories/:categoryId/brands" element={<BrandsPage />} />
                <Route path="/categories/:categoryId/brands/:brandId/products" element={<ProductListingPage />} />
                <Route path="/customize-cover/:productId" element={<ProductCustomizerPage />} />
                <Route path="/orders" element={<OrderHistoryPage />} />
                <Route path="/order-success" element={<OrderSuccessPage />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="products" element={<CategoryManagementPage />} />
                <Route path="categories/:categoryId/brands" element={<BrandManagementPage />} />
                <Route path="categories/:categoryId/brands/:brandId/products" element={<ProductManagementByBrandPage />} />
                <Route path="categories/:categoryId/brands/:brandId/products/new" element={<ProductEditPage />} />
                <Route path="categories/:categoryId/brands/:brandId/products/:productId" element={<ProductEditPage />} />
                <Route path="orders" element={<UserOrderListingPage />} />
                <Route path="orders/:userId" element={<UserOrdersPage />} />
                <Route path="demo-orders" element={<DemoOrderListingPage />} />
                <Route path="demo-users" element={<DemoUsersWithOrdersPage />} />
              </Route>

              {/* Catch-all route for 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DemoOrderModalProvider>
        </SessionContextWrapper>
      </Router>
    </>
  );
}

export default App;