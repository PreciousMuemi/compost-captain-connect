import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedNotificationFeed } from "@/components/EnhancedNotificationFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Edit, 
  Save, 
  X, 
  Package, 
  ShoppingCart, 
  DollarSign,
  Calendar,
  TrendingUp,
  Activity,
  Shield,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileStats {
  wasteReportsCount: number;
  ordersCount: number;
  totalEarnings: number;
  totalSpent: number;
  pendingReports: number;
  completedReports: number;
  averageReportValue: number;
  lastActivity: string;
}

export default function Profile() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [location, setLocation] = useState(profile?.location || "");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    wasteReportsCount: 0,
    ordersCount: 0,
    totalEarnings: 0,
    totalSpent: 0,
    pendingReports: 0,
    completedReports: 0,
    averageReportValue: 0,
    lastActivity: "",
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.id) {
      fetchProfileStats();
    }
  }, [profile?.id]);

  const fetchProfileStats = async () => {
    if (!profile?.id) return;

    setStatsLoading(true);
    try {
      if (profile?.role === 'admin') {
        // Admin stats - fetch comprehensive data
        const [
          { data: wasteReports },
          { data: payments },
          { data: orders },
          { data: farmers },
          { data: inventory },
          { data: adminNotifications },
          { data: riders }
        ] = await Promise.all([
          supabase.from("waste_reports").select("status, quantity_kg, created_at, waste_type"),
          supabase.from("payments").select("amount, status, created_at"),
          supabase.from("orders").select("total_amount, status, created_at"),
          supabase.from("profiles").select("id").eq("role", "farmer"),
          supabase.from("inventory").select("stock_quantity, price_per_unit, name"),
          supabase.from("notifications").select("created_at").order("created_at", { ascending: false }).limit(1),
          supabase.from("riders").select("id, status")
        ]);

        const wasteReportsData = wasteReports || [];
        const paymentsData = payments || [];
        const ordersData = orders || [];
        const farmersData = farmers || [];
        const inventoryData = inventory || [];
        const notificationsData = adminNotifications || [];
        const ridersData = riders || [];

        // Calculate comprehensive admin stats
        const totalEarnings = paymentsData
          .filter(p => p.status === "completed")
          .reduce((sum, p) => sum + p.amount, 0);

        const totalRevenue = ordersData
          .filter(o => o.status === "confirmed" || o.status === "delivered")
          .reduce((sum, o) => sum + o.total_amount, 0);

        const averageReportValue = wasteReportsData.length > 0 
          ? totalEarnings / wasteReportsData.length 
          : 0;

        const lastActivity = notificationsData.length > 0 
          ? notificationsData[0].created_at 
          : wasteReportsData.length > 0 
          ? wasteReportsData[0].created_at 
          : "";

        setStats({
          wasteReportsCount: wasteReportsData.length,
          ordersCount: ordersData.length,
          totalEarnings,
          totalSpent: totalRevenue, // For admin, this represents revenue
          pendingReports: wasteReportsData.filter(r => r.status === "reported" || r.status === "scheduled").length,
          completedReports: wasteReportsData.filter(r => r.status === "collected").length,
          averageReportValue,
          lastActivity,
        });

        // Set recent activity with more comprehensive data
        setRecentReports(wasteReportsData.slice(0, 3));
        setRecentOrders(ordersData.slice(0, 3));

      } else {
        // Farmer stats - existing logic
        const { data: wasteReports } = await supabase
          .from("waste_reports")
          .select("status, quantity_kg, created_at, waste_type")
          .eq("farmer_id", profile.id)
          .order("created_at", { ascending: false });

        const { data: payments } = await supabase
          .from("payments")
          .select("amount, status, created_at")
          .eq("farmer_id", profile.id)
          .eq("status", "completed");

        const { data: customerRecord } = await supabase
          .from("customers")
          .select("id")
          .eq("phone_number", profile.phone_number)
          .maybeSingle();

        let ordersData = [];
        if (customerRecord) {
          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount, status, created_at")
            .eq("customer_id", customerRecord.id)
            .order("created_at", { ascending: false });
          ordersData = orders || [];
        }

        const wasteReportsData = wasteReports || [];
        const paymentsData = payments || [];
        
        const totalEarnings = paymentsData.reduce((sum, p) => sum + p.amount, 0);

        const totalSpent = ordersData
          .filter(o => o.status === "confirmed" || o.status === "delivered")
          .reduce((sum, o) => sum + o.total_amount, 0);

        const averageReportValue = wasteReportsData.length > 0 
          ? totalEarnings / wasteReportsData.length 
          : 0;

        const lastActivity = wasteReportsData.length > 0 
          ? wasteReportsData[0].created_at 
          : ordersData.length > 0 
          ? ordersData[0].created_at 
          : "";

        setStats({
          wasteReportsCount: wasteReportsData.length,
          ordersCount: ordersData.length,
          totalEarnings,
          totalSpent,
          pendingReports: wasteReportsData.filter(r => r.status === "reported" || r.status === "scheduled").length,
          completedReports: wasteReportsData.filter(r => r.status === "collected").length,
          averageReportValue,
          lastActivity,
        });

        setRecentReports(wasteReportsData.slice(0, 3));
        setRecentOrders(ordersData.slice(0, 3));
      }

    } catch (error) {
      console.error("Error fetching profile stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ location })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Location Updated",
        description: "Your location has been saved successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and view activity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Profile Information */}
        <Card className="glassmorphism border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <User className="h-6 w-6 text-blue-600" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {profile?.full_name || "User"}
                </h2>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {profile?.role || "User"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="font-medium">{profile?.phone_number || "No phone number"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Location</p>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Enter your location"
                          className="flex-1"
                        />
                        <Button 
                          size="sm" 
                          onClick={handleSaveLocation}
                          disabled={loading}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setLocation(profile?.location || "");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{profile?.location || "No location set"}</p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Account Status</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-200">Member Since:</span>
                      <span className="font-medium">{formatDate(new Date().toISOString())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-200">Last Activity:</span>
                      <span className="font-medium">
                        {stats.lastActivity ? formatDate(stats.lastActivity) : "No activity"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glassmorphism border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statsLoading ? "..." : stats.wasteReportsCount}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Waste Reports</p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statsLoading ? "..." : stats.ordersCount}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Orders</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {statsLoading ? "..." : formatCurrency(stats.totalEarnings)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {statsLoading ? "..." : formatCurrency(stats.totalSpent)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glassmorphism border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Package className="h-5 w-5 text-green-600" />
                Waste Report Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Pending Pickups</span>
                  <Badge variant="outline" className="text-yellow-600">
                    {statsLoading ? "..." : stats.pendingReports}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                  <Badge variant="outline" className="text-green-600">
                    {statsLoading ? "..." : stats.completedReports}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Average Value</span>
                  <span className="font-medium text-green-600">
                    {statsLoading ? "..." : formatCurrency(stats.averageReportValue)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Activity className="h-5 w-5 text-purple-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {recentReports.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recent Reports</h4>
                    {recentReports.map((report, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <span>{report.waste_type.replace('_', ' ')}</span>
                        <span className="text-gray-500">{formatDate(report.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {recentOrders.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recent Orders</h4>
                    {recentOrders.map((order, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <span>{formatCurrency(order.total_amount)}</span>
                        <span className="text-gray-500">{formatDate(order.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {recentReports.length === 0 && recentOrders.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        <EnhancedNotificationFeed userId={profile?.id} />
      </div>
    </div>
  );
}
