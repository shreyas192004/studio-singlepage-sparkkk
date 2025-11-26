import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import { AdminProvider } from "./contexts/AdminContext";
import { DesignerProvider } from "./contexts/DesignerContext";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Wishlist from "./pages/Wishlist";
import Account from "./pages/Account";
import AIGenerator from "./pages/AIGenerator";
import Auth from "./pages/Auth";
import Men from "./pages/Men";
import Women from "./pages/Women";
import Accessories from "./pages/Accessories";
import Sale from "./pages/Sale";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminDesigners from "./pages/admin/AdminDesigners";
import AdminDesignerForm from "./pages/admin/AdminDesignerForm";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminOrders from "./pages/admin/AdminOrders";
import DesignerDetail from "./pages/DesignerDetail";
import NotFound from "./pages/NotFound";
import  {CheckoutPage } from "./pages/CheckOut";
import TermsAndConditions from "./pages/TermsAndConditions";
import ShippingAndRefundPolicy from "./pages/ShippingAndRefundPolicy";
import DesignerLogin from "./pages/designer/DesignerLogin";
import DesignerDashboard from "./pages/designer/DesignerDashboard";
import DesignerProducts from "./pages/designer/DesignerProducts";
import DesignerAnalytics from "./pages/designer/DesignerAnalytics";
import DesignerProductForm from "./pages/designer/DesignerProductForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AdminProvider>
          <DesignerProvider>
            <CartProvider>
              <WishlistProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/ai-generator" element={<AIGenerator />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/men" element={<Men />} />
                  <Route path="/women" element={<Women />} />
                  <Route path="/accessories" element={<Accessories />} />
                  <Route path="/sale" element={<Sale />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                  <Route path="/shipping-and-refund-policy" element={<ShippingAndRefundPolicy />} />
                  
                  {/* Hidden Admin Routes */}
                  <Route path="/admintesora" element={<AdminLogin />} />
                  <Route path="/admintesora/dashboard" element={<AdminDashboard />} />
                  <Route path="/admintesora/products" element={<AdminProducts />} />
                  <Route path="/admintesora/products/new" element={<AdminProductForm />} />
                  <Route path="/admintesora/products/:id/edit" element={<AdminProductForm />} />
                  <Route path="/admintesora/designers" element={<AdminDesigners />} />
                  <Route path="/admintesora/designers/new" element={<AdminDesignerForm />} />
                  <Route path="/admintesora/designers/:id/edit" element={<AdminDesignerForm />} />
                  <Route path="/admintesora/analytics" element={<AdminAnalytics />} />
                  <Route path="/admintesora/orders" element={<AdminOrders />} />
                  <Route path="/designer/:id" element={<DesignerDetail />} />

                  {/* Designer routes */}
                  <Route path="/designer/login" element={<DesignerLogin />} />
                  <Route path="/designer/dashboard" element={<DesignerDashboard />} />
                  <Route path="/designer/products" element={<DesignerProducts />} />
                  <Route path="/designer/analytics" element={<DesignerAnalytics />} />
                {/* For creating new products */}
                  <Route path="/designer/products/new" element={<DesignerProductForm />} />

                  {/* For editing existing products */}
                  <Route path="/designer/products/:id/edit" element={<DesignerProductForm />} />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              </WishlistProvider>
            </CartProvider>
          </DesignerProvider>
        </AdminProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
