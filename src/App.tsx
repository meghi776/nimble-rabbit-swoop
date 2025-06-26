import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ProductListingPage from "./pages/ProductListingPage";
import BrandsPage from "./pages/BrandsPage"; // Import the new BrandsPage
import { SessionContextProvider } from "./components/SessionContext";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <SessionContextProvider>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          {/* New route for listing brands within a category */}
          <Route path="/categories/:categoryId/brands" element={<BrandsPage />} />
          <Route path="/categories/:categoryId/brands/:brandId/products" element={<ProductListingPage />} />
        </Routes>
      </Router>
    </SessionContextProvider>
  );
}

export default App;