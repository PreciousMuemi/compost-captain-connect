import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import Auth from "@/pages/Auth";
import FarmerDashboard from "@/pages/FarmerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import DispatchDashboard from "@/pages/DispatchDashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

function DashboardRouter() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardSelector />} />
        <Route
          path="/farmer"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerDashboard />
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
          path="/dispatch"
          element={
            <ProtectedRoute allowedRoles={["dispatch"]}>
              <DispatchDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

function DashboardSelector() {
  const { profile, loading } = useAuth();

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
      return <Navigate to="/dispatch" replace />;
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
            <pre className="bg-gray-100 p-4 rounded mb-4 overflow-auto text-xs">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>
      );
  }
}

export default App;
