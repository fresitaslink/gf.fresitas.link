import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { LanguageProvider } from '@/lib/LanguageContext';
import { CartProvider } from '@/lib/CartContext';
import { StoreProvider, useStore } from '@/lib/StoreContext';
import { Toaster as Sonner } from 'sonner';
import { base44 } from '@/api/base44Client';

// Pages
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Perfil from './pages/Perfil';
import Favoritos from './pages/Favoritos';
import Chat from './pages/Chat.jsx';
import Reviews from './pages/Reviews';
import Admin from './pages/Admin';
import Referral from './pages/Referral';
import UserDashboard from './pages/UserDashboard';
import OwnerPanel from './pages/OwnerPanel';
import ManagerPanel from './pages/ManagerPanel';
import Suscripciones from './pages/Suscripciones';
import Logistica from './pages/Logistica';
import DriverManagement from './pages/DriverManagement';
import Blog from './pages/Blog';
import BlogPostDetail from './pages/BlogPostDetail';
import Analytics from './pages/Analytics';
import MiCuenta from './pages/MiCuenta';
import DriverApp from './pages/DriverApp';
import DriverLogin from './pages/DriverLogin';
import ReceiptPrint from './pages/ReceiptPrint';
import Challenges from './pages/Challenges';
import RewardsStore from './pages/RewardsStore';
import ContentManager from './pages/ContentManager';
import SuperAdmin from './pages/SuperAdmin';
import DriverEarnings from './pages/DriverEarnings';
import DriverStats from './pages/DriverStats';
import Achievements from './pages/Achievements';
import Membership from './pages/Membership';
import AdminHeatmap from './pages/AdminHeatmap';
import ScheduledOrders from './pages/ScheduledOrders';
import AnalyticsAdvanced from './pages/AnalyticsAdvanced';
import DriverRouteHistory from './pages/DriverRouteHistory';
import DriverEarningsReport from './pages/DriverEarningsReport';
import PricingAnalysis from './pages/PricingAnalysis';
import StockPrediction from './pages/StockPrediction';
import RecipeAdmin from './pages/RecipeAdmin';

// Layout
import Navbar from './components/layout/Navbar';
import WillfyButton from './components/layout/WillfyButton';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { isOpen } = useStore();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('fresitas_dark') === 'true');
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('fresitas_dark', darkMode);
  }, [darkMode]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍓</div>
          <div className="w-8 h-8 border-4 border-cream border-t-strawberry rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <>
      <Navbar darkMode={darkMode} toggleDarkMode={() => setDarkMode(d => !d)} storeOpen={isOpen} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/favoritos" element={<Favoritos />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/referral" element={<Referral />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/owner" element={<OwnerPanel />} />
        <Route path="/manager" element={<ManagerPanel />} />
        <Route path="/suscripciones" element={<Suscripciones />} />
        <Route path="/logistica" element={<Logistica />} />
        <Route path="/drivers" element={<DriverManagement />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPostDetail />} />
        <Route path="/producto/:slug" element={<Menu />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/mi-cuenta" element={<MiCuenta />} />
        <Route path="/driver-login" element={<DriverLogin />} />
        <Route path="/driver" element={<DriverApp />} />
        <Route path="/receipt" element={<ReceiptPrint />} />
        <Route path="/driver-earnings" element={<DriverEarnings />} />
        <Route path="/driver-stats" element={<DriverStats />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/admin/heatmap" element={<AdminHeatmap />} />
        <Route path="/scheduled-orders" element={<ScheduledOrders />} />
        <Route path="/analytics-advanced" element={<AnalyticsAdvanced />} />
        <Route path="/driver-routes" element={<DriverRouteHistory />} />
        <Route path="/driver-earnings-report" element={<DriverEarningsReport />} />
        <Route path="/pricing" element={<PricingAnalysis />} />
        <Route path="/stock" element={<StockPrediction />} />
        <Route path="/stock-prediction" element={<StockPrediction />} />
        <Route path="/recipes" element={<RecipeAdmin />} />
        <Route path="/rewards" element={<RewardsStore />} />
        <Route path="/content" element={<ContentManager />} />
        <Route path="/superadmin" element={<SuperAdmin />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <WillfyButton />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <QueryClientProvider client={queryClientInstance}>
          <LanguageProvider>
            <CartProvider>
              <Router>
                <AuthenticatedApp />
              </Router>
              <Toaster />
              <Sonner richColors position="top-center" />
            </CartProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;