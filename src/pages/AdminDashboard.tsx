import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { Users, TrendingUp, Package, Truck, ShoppingCart, BarChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalFarmers: number;
  totalWaste: number;
  totalEarnings: number;
  pendingReports: number;
  completedReports: number;
  totalOrders: number;
}

interface WasteReport {
  id: string;
  waste_type: string;
  quantity_kg: number;
  status: string;
  created_at: string;
  location: string;
  farmer: {
    full_name: string;
  };
}

const AdminDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats>({
    totalFarmers: 0,
    totalWaste: 0,
    totalEarnings: 0,
    pendingReports: 0,
    completedReports: 0,
    totalOrders: 0,
  });
  const [recentReports, setRecentReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchAdminData();
    }
  }, [profile]);

  const fetchAdminData = async () => {
    try {
      // Count farmers
      const { count: farmersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'farmer');

      // Fetch all waste reports with farmer info
      const { data: reports } = await supabase
        .from('waste_reports')
        .select(`
          id,
          waste_type,
          quantity_kg,
          status,
          created_at,
          location,
          farmer:profiles (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      // Fetch all orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (reports) {
        const totalWaste = reports.reduce((sum, r) => sum + r.quantity_kg, 0);
        const pendingReports = reports.filter(r => r.status === 'reported' || r.status === 'scheduled').length;
        const completedReports = reports.filter(r => r.status === 'collected').length;
        
        // Calculate total earnings (10 KES per kg collected)
        const totalEarnings = reports
          .filter(r => r.status === 'collected')
          .reduce((sum, r) => sum + (r.quantity_kg * 10), 0);
        
        setStats({
          totalFarmers: farmersCount || 0,
          totalWaste,
          totalEarnings,
          pendingReports,
          completedReports,
          totalOrders: orders?.length || 0,
        });
        
        setRecentReports(reports as unknown as WasteReport[]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {profile?.full_name}</p>
        </div>
        <Button onClick={() => navigate('/reports')}>
          <BarChart className="h-4 w-4 mr-2" />
          View Reports
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Farmers"
          value={stats.totalFarmers}
          icon={Users}
          description="Registered farmers"
        />
        <StatCard
          title="Total Waste"
          value={`${stats.totalWaste} kg`}
          icon={Package}
          description="Waste reported"
        />
        <StatCard
          title="Pending Reports"
          value={stats.pendingReports}
          icon={Truck}
          description="Awaiting collection"
        />
        <StatCard
          title="Completed Reports"
          value={stats.completedReports}
          icon={Package}
          description="Waste collected"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingCart}
          description="Product orders"
        />
        <StatCard
          title="Total Revenue"
          value={`KES ${stats.totalEarnings.toLocaleString()}`}
          icon={TrendingUp}
          description="From waste processing"
        />
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Waste Reports</CardTitle>
          <CardDescription>Latest waste collection reports from farmers</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length > 0 ? (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{report.waste_type.replace('_', ' ')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {report.quantity_kg}kg • {report.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reported by: {report.farmer?.full_name || 'Unknown'} • {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No waste reports yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => navigate('/reports')}>
              <Package className="h-4 w-4 mr-2" />
              Manage Reports
            </Button>
            <Button variant="outline" onClick={() => navigate('/farmers')}>
              <Users className="h-4 w-4 mr-2" />
              Manage Farmers
            </Button>
            <Button variant="outline" onClick={() => navigate('/products')}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Manage Products
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;