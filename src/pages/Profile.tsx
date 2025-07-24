import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import NotificationFeed from "@/components/NotificationFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Phone, Mail, Edit, Save, X, Package, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileStats {
  wasteReportsCount: number;
  ordersCount: number;
  totalEarnings: number;
  totalSpent: number;
  pendingReports: number;
  completedReports: number;
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
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchProfileStats();
    }
  }, [profile?.id]);

  const fetchProfileStats = async () => {
    if (!profile?.id) return;

    setStatsLoading(true);
    try {
      // Fetch waste reports stats
      const { data: wasteReports } = await supabase
        .from("waste_reports")
        .select("status, quantity_kg")
        .eq("farmer_id", profile.id);

      // Fetch payments for real earnings
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("farmer_id", profile.id)
        .eq("status", "completed");

      // Fetch orders stats (as customer)
      const { data: customerRecord } = await supabase
        .from("customers")
        .select("id")
        .eq("phone_number", profile.phone_number)
        .maybeSingle();

      let ordersData = [];
      if (customerRecord) {
        const { data: orders } = await supabase
          .from("orders")
          .select("total_amount, status")
          .eq("customer_id", customerRecord.id);
        ordersData = orders || [];
      }

      // Calculate real stats
      const wasteReportsData = wasteReports || [];
      const paymentsData = payments || [];
      
      // Real earnings from completed payments
      const totalEarnings = paymentsData.reduce((sum, p) => sum + p.amount, 0);

      const totalSpent = ordersData
        .filter(o => o.status === "confirmed" || o.status === "delivered")
        .reduce((sum, o) => sum + o.total_amount, 0);

      setStats({
        wasteReportsCount: wasteReportsData.length,
        ordersCount: ordersData.length,
        totalEarnings,
        totalSpent,
        pendingReports: wasteReportsData.filter(r => r.status === "reported" || r.status === "scheduled").length,
        completedReports: wasteReportsData.filter(r => r.status === "collected").length,
      });
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

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card className="glassmorphism">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-6 w-6" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Icon and Basic Info */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{profile?.full_name || "User"}</h2>
              <Badge variant="outline" className="mt-1">
                {profile?.role || "User"}
              </Badge>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Phone className="h-4 w-4" />
              <span>{profile?.phone_number || "No phone number"}</span>
            </div>

            {/* Location with Edit Functionality */}
            <div className="flex items-center gap-2 text-foreground">
              <MapPin className="h-4 w-4" />
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter your location"
                    className="w-64"
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
                  <span>{profile?.location || "No location set"}</span>
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

          {/* Account Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? "..." : stats.wasteReportsCount}
              </div>
              <div className="text-sm text-foreground flex items-center justify-center gap-1">
                <Package className="h-3 w-3" />
                Waste Reports
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? "..." : stats.ordersCount}
              </div>
              <div className="text-sm text-foreground flex items-center justify-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                Orders
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {statsLoading ? "..." : `KES ${stats.totalEarnings.toLocaleString()}`}
              </div>
              <div className="text-xs text-foreground">Total Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {statsLoading ? "..." : `KES ${stats.totalSpent.toLocaleString()}`}
              </div>
              <div className="text-xs text-foreground">Total Spent</div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">
                {statsLoading ? "..." : stats.pendingReports}
              </div>
              <div className="text-xs text-foreground">Pending Pickups</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {statsLoading ? "..." : stats.completedReports}
              </div>
              <div className="text-xs text-foreground">Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <NotificationFeed userId={profile?.id} />
    </div>
  );
}
