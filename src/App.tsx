import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import Auth from "@/pages/Auth";
import FarmerDashboard from "@/pages/FarmerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import DispatchDashboard from "@/pages/DispatchDashboard";
import WasteReports from "@/pages/WasteReports";
import FarmerPayments from "@/pages/FarmerPayments";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import Riders from "@/pages/riders";
import Inventory from "@/pages/inventory";
import Notifications from "@/pages/notifications";
import DispatchMapPage from "@/pages/dispatch-map";
import Settings from "@/pages/settings";
import DashboardLayout from "@/components/DashboardLayout";
import Farmers from "@/pages/Farmers";
//import WasteReports from "@/pages/WasteReports";
import Payments from "@/pages/Payments";
import Analytics from "@/pages/Analytics";
import FarmerProfile from "@/pages/FarmerProfile";
import FarmerHistory from "@/pages/FarmerHistory";
import  MyReports  from "@/pages/FarmerDashboard";
import ProductShop from "./pages/product-shop";
import { FarmerSidebar } from "@/components/FarmerSidebar";
import FarmerOrders from "@/pages/FarmerOrders";
import { FloatingTicketButton } from "@/components/FloatingTicketButton";
import { TopRightHeader } from "@/components/TopRightHeader";
import Profile from "@/pages/Profile";
import AdminTickets from "@/pages/AdminTickets";

function DashboardSelector() {
  const { profile, loading, signOut } = useAuth();

  console.log("🚀 DashboardSelector - loading:", loading, "profile:", profile);

  if (loading) {
    console.log("🚀 Still loading, showing spinner");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Redirect to role-specific routes
  console.log("🚀 Profile role:", profile?.role);
  switch (profile?.role) {
    case "farmer":
      console.log("🚀 Redirecting to farmer dashboard");
      return <Navigate to="/farmer" replace />;
    case "admin":
      console.log("🚀 Redirecting to admin dashboard");
      return <Navigate to="/admin" replace />;
    case "dispatch":
      console.log("🚀 Redirecting to dispatch dashboard");
      return <Navigate to="/dispatch-dashboard" replace />;
    default:
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Unknown Role</h2>
            <p className="mb-4">
              Your account has an unknown role:{" "}
              {profile?.role || "No role assigned"}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Please contact an administrator to assign you the correct role.
            </p>
            <div className="mb-4">
              <button
                onClick={signOut}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
            <pre className="bg-gray-100 p-4 rounded mb-4 overflow-auto text-xs">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>
      );
  }
}

function AppContent() {
  const { profile } = useAuth();
  const location = useLocation();
  
  // Don't show TopRightHeader on auth page
  const showTopRightHeader = location.pathname !== '/auth';
  
  // Show floating ticket button only for farmers and dispatch users, not admin
  const showFloatingTicket = profile?.role === 'farmer' || profile?.role === 'dispatch';

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardSelector />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerSidebar>
                <FarmerDashboard />
              </FarmerSidebar>
            </ProtectedRoute>
          }
        />
        <Route
          path="/waste-reports"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerSidebar>
                <WasteReports />
              </FarmerSidebar>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/payments"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerSidebar>
                <FarmerPayments />
              </FarmerSidebar>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/orders"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerSidebar>
                <FarmerOrders />
              </FarmerSidebar>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <FarmerSidebar>
                <Profile />
              </FarmerSidebar>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout>
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmers"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout>
                <Farmers />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmers/:id/profile"
          element={<FarmerProfile />}
        />
        <Route
          path="/farmers/:id/history"
          element={<FarmerHistory />}
        />
        <Route
          path="/waste-reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout>
                <WasteReports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout>
                <Payments />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout>
                <Analytics />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch-dashboard"
          element={
            <ProtectedRoute allowedRoles={['dispatch']}>
              <DashboardLayout>
                <DispatchDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/riders"
          element={
            <ProtectedRoute allowedRoles={['dispatch']}>
              <DashboardLayout>
                <Riders />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={['dispatch']}>
              <DashboardLayout>
                <Inventory />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={['dispatch']}>
              <DashboardLayout>
                <Notifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch-map"
          element={
            <ProtectedRoute allowedRoles={['dispatch']}>
              <DashboardLayout>
                <DispatchMapPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['dispatch']}>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-reports"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <MyReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buy-products"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerSidebar>
                <ProductShop profile={profile} />
              </FarmerSidebar>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-tickets"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout>
                <AdminTickets />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      {showFloatingTicket && <FloatingTicketButton />}
      {showTopRightHeader && <TopRightHeader />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
